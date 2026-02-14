# NUT API Optimizations Reference

**For:** Edge functions `soft-nut`, `medium-nut`, `hard-nut`
**Date:** 2026-02-13
**Companion to:** NUT Build Specification v1.1

---

## 1. Model Routing Layer

### The Problem

Hard-coding model strings (`claude-haiku-4-5-20251001`) throughout edge functions means every model upgrade requires finding and replacing strings across multiple files. When Haiku 5 ships, you don't want to be grepping through code.

### The Solution

A single config object, driven by environment variables, with three performance tiers.

```typescript
// src/config/models.ts (shared across all edge functions)

export type ModelTier = 'fast' | 'balanced' | 'deep';

interface ModelConfig {
  model: string;
  maxTokens: number;
  effort: 'low' | 'medium' | 'high' | 'max';
}

const MODEL_TIERS: Record<ModelTier, ModelConfig> = {
  fast: {
    model: Deno.env.get('LLM_FAST') || 'claude-haiku-4-5-20251001',
    maxTokens: parseInt(Deno.env.get('LLM_FAST_MAX_TOKENS') || '1024'),
    effort: (Deno.env.get('LLM_FAST_EFFORT') || 'low') as ModelConfig['effort'],
  },
  balanced: {
    model: Deno.env.get('LLM_BALANCED') || 'claude-sonnet-4-5-20250929',
    maxTokens: parseInt(Deno.env.get('LLM_BALANCED_MAX_TOKENS') || '2048'),
    effort: (Deno.env.get('LLM_BALANCED_EFFORT') || 'medium') as ModelConfig['effort'],
  },
  deep: {
    model: Deno.env.get('LLM_DEEP') || 'claude-sonnet-4-5-20250929',
    maxTokens: parseInt(Deno.env.get('LLM_DEEP_MAX_TOKENS') || '4096'),
    effort: (Deno.env.get('LLM_DEEP_EFFORT') || 'high') as ModelConfig['effort'],
  },
};

export function getModel(tier: ModelTier): ModelConfig {
  return MODEL_TIERS[tier];
}
```

### Supabase Environment Variables

Set these in the Supabase dashboard (Settings → Edge Functions → Secrets):

```
LLM_FAST=claude-haiku-4-5-20251001
LLM_BALANCED=claude-sonnet-4-5-20250929
LLM_DEEP=claude-sonnet-4-5-20250929

LLM_FAST_EFFORT=low
LLM_BALANCED_EFFORT=medium
LLM_DEEP_EFFORT=high

LLM_FAST_MAX_TOKENS=1024
LLM_BALANCED_MAX_TOKENS=2048
LLM_DEEP_MAX_TOKENS=4096
```

### Which Tier for Which Task

| Edge Function | Task | Tier | Why |
|---|---|---|---|
| soft-nut | query | fast | Quick classification, simple response |
| soft-nut | submit | fast | Classify intent, write to shelf |
| soft-nut | onboard | balanced | Coordinate generation needs reasoning |
| medium-nut | synthesise | balanced | Narrative quality matters |
| hard-nut | proximity | fast | Coordinate comparison is mechanical |
| hard-nut | coordinate_update | fast | Position adjustment is straightforward |
| hard-nut | compact | deep | Compaction needs careful summarisation |
| hard-nut | promote | balanced | Deciding when content earns coordinates |

### Usage in Edge Functions

```typescript
import { getModel } from '../_shared/models.ts';

// In soft-nut:
const config = getModel(action === 'onboard' ? 'balanced' : 'fast');

const response = await anthropic.messages.create({
  model: config.model,
  max_tokens: config.maxTokens,
  thinking: { type: "adaptive" },
  // effort is set via thinking mode — adaptive + effort param
  ...
});
```

### Upgrading Models

When Haiku 5 ships:

1. Go to Supabase dashboard → Settings → Edge Functions → Secrets
2. Change `LLM_FAST` to `claude-haiku-5-20260601` (or whatever the string is)
3. All edge functions immediately use the new model
4. No code changes. No redeployment. No git commits.

To test a new model on one tier only: change just that env var. The others stay stable.

To temporarily use Sonnet everywhere (e.g., debugging quality issues): set all three to Sonnet. Revert when done.

---

## 2. Prompt Caching Strategy

### How It Works

Prompt caching avoids reprocessing identical content on repeated calls. The API hashes your prompt prefix and reuses the computation if it matches.

- **5-minute cache:** Default. Refreshes on each hit. Free to read (10% of input token cost). 25% surcharge on first write.
- **1-hour cache:** Extended TTL. Same read cost (10%). Higher write cost (2× base input). Best for content that's stable across a session.

### Cache Hierarchy

The API caches in order: `tools → system → messages`. Changes at any level invalidate that level and everything after it.

For NUT, our content stability follows this pattern:

```
Most stable (changes rarely)
│
├── Platform skills (aperture, format, parsing)     → 1-hour cache
│     Same for ALL users, ALL frames
│     Changes only when designer edits a skill
│
├── Cosmology + frame context                       → 5-minute cache
│     Same for all users in same frame
│     Changes when frame config updates
│
├── User's coordinates + proximity                  → 5-minute cache
│     Changes when hard-nut updates position
│
└── User's current input                            → Never cached
      Different every call

Least stable (changes every call)
```

### Implementation Pattern

```typescript
const response = await anthropic.messages.create({
  model: config.model,
  max_tokens: config.maxTokens,
  thinking: { type: "adaptive" },

  // LAYER 1: Platform skills (1-hour cache)
  // These are identical across all users and all frames.
  // First call writes to cache. All subsequent calls within
  // the hour read at 10% cost.
  system: [
    {
      type: "text",
      text: compiledPlatformSkills,
      cache_control: { type: "ephemeral", ttl: "1h" }
    },
    // LAYER 2: Frame context (5-minute cache)
    // Same for all users in this frame. Refreshes on each hit.
    {
      type: "text",
      text: frameContext,
      cache_control: { type: "ephemeral" }
    }
  ],

  // LAYER 3: User-specific (uncached)
  messages: [
    {
      role: "user",
      content: `[Coordinates: ${userCoords}]\n\n${userInput}`
    }
  ]
});
```

### Important Constraint

1-hour cache blocks must appear BEFORE 5-minute blocks. The API enforces: longer TTL → shorter TTL → uncached. Our natural ordering (platform skills → frame context → user input) already satisfies this.

### Cost Impact

Assuming platform skills ≈ 4,000 tokens, frame context ≈ 1,000 tokens:

| Call | Skills (4K tokens) | Frame (1K tokens) | Input (200 tokens) | Total Input Cost |
|---|---|---|---|---|
| First call | Write: $0.005 (1.25×) | Write: $0.00125 (1.25×) | Normal: $0.0002 | $0.00645 |
| Subsequent | Read: $0.0004 (0.1×) | Read: $0.0001 (0.1×) | Normal: $0.0002 | $0.0007 |

That's a **9× reduction** in input costs after the first call. Over 30 calls in an hour, you save roughly $0.17 compared to no caching. At scale (100 concurrent users), that's $17/hour saved.

---

## 3. Structured Outputs

### Why

Our edge functions return JSON that the UI parses. Without structured outputs, the LLM might return markdown-wrapped JSON, or add a preamble, or use slightly wrong field names. With structured outputs, the API guarantees schema conformance.

### soft-nut Response Schema

```typescript
const softNutResponseSchema = {
  type: "object",
  properties: {
    response: {
      type: "string",
      description: "LLM response text to display in VapourZone"
    },
    classification: {
      type: "object",
      properties: {
        face: {
          type: "string",
          description: "Detected face: character, author, or designer"
        },
        intent: {
          type: "string",
          description: "What the user is trying to do"
        },
        coordinates: {
          type: "object",
          properties: {
            t: { type: "string" },
            s: { type: "string" },
            i: { type: "string" }
          },
          required: ["t", "s", "i"]
        }
      },
      required: ["face", "intent", "coordinates"]
    },
    observations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string" },
          text: { type: "string" }
        },
        required: ["kind", "text"]
      },
      description: "Identity observations to store in nut_unattached"
    }
  },
  required: ["response", "classification"]
};
```

### hard-nut Proximity Schema

```typescript
const proximitySchema = {
  type: "object",
  properties: {
    updates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          entity_id: { type: "string" },
          proximity: {
            type: "object",
            properties: {
              close: { type: "array", items: { type: "string" } },
              nearby: { type: "array", items: { type: "string" } },
              distant: { type: "array", items: { type: "string" } }
            }
          }
        },
        required: ["entity_id", "proximity"]
      }
    }
  },
  required: ["updates"]
};
```

### Usage

```typescript
const response = await anthropic.messages.create({
  model: config.model,
  max_tokens: config.maxTokens,
  thinking: { type: "adaptive" },

  output_config: {
    format: {
      type: "json_schema",
      schema: softNutResponseSchema
    }
  },

  system: [...],
  messages: [...]
});

// response.content[0].text is guaranteed valid JSON
// matching the schema. No try/catch parsing needed
// (though still good practice for network errors).
const result = JSON.parse(response.content[0].text);
```

### Note on Structured Outputs + Thinking

Structured outputs work with adaptive thinking. The thinking happens in thinking blocks; the structured output applies only to the final text block. No conflict.

---

## 4. Search Results for Provenance (Phase 3+)

### The Pattern

When medium-nut synthesises solid from liquid, the liquid entries are the "sources." The API's search results feature lets us format them as attributed sources, and the output automatically includes citation indices.

This replaces manual provenance tracking in `lamina.provenance`.

### Implementation

```typescript
// In medium-nut, when gathering liquid for synthesis:

const liquidEntries = await supabase
  .from('nut_shelf')
  .select('*')
  .eq('frame_id', frameId)
  .eq('state', 'liquid');

// Format as search results
const sourceContent = liquidEntries.data.map(entry => ({
  type: "search_result",
  source: entry.id,  // UUID becomes the citation source
  title: `${entry.lamina?.face || 'unknown'}: ${entry.lamina?.soft_type || 'input'}`,
  content: [{ type: "text", text: entry.text }],
  citations: { enabled: true }
}));

const response = await anthropic.messages.create({
  model: getModel('balanced').model,
  max_tokens: 2048,
  thinking: { type: "adaptive" },

  system: [
    {
      type: "text",
      text: synthesisSkill,
      cache_control: { type: "ephemeral", ttl: "1h" }
    }
  ],

  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "Synthesise these contributions into narrative:" },
        ...sourceContent
      ]
    }
  ]
});

// The response includes citation indices pointing back
// to specific liquid entry UUIDs. Extract for lamina.provenance.
```

### Why This Matters

The LLM naturally attributes which parts of the solid narrative came from which liquid contributions. Instead of us guessing at provenance, the API tracks it through its native citation mechanism. This is exactly what `lamina.provenance` was designed to hold — and now the API populates it for us.

---

## 5. Batch Processing for Compaction

### The Pattern

Hard-nut compaction is the most token-intensive operation (reading 9 observations, producing a summary). It's also the least time-sensitive — it runs in the background. Batch API costs 50% less.

### Implementation (Phase 3+)

```typescript
// Accumulate compaction tasks
const pendingCompactions = await supabase
  .from('nut_unattached')
  .select('*')
  .eq('pscale', 0)
  .order('created_at');

// Group into batches of 9
const batches = chunk(pendingCompactions, 9);

// Submit as batch request
const batchResponse = await anthropic.batches.create({
  requests: batches.map((batch, i) => ({
    custom_id: `compact-${i}`,
    params: {
      model: getModel('deep').model,
      max_tokens: 512,
      thinking: { type: "adaptive" },
      system: [{ type: "text", text: compactionSkill }],
      messages: [{
        role: "user",
        content: `Summarise these 9 observations into a single pscale-1 summary:\n\n${
          batch.map(obs => obs.text).join('\n---\n')
        }`
      }]
    }
  }))
});

// Poll for results (async, non-blocking)
// Write pscale-1 summaries to nut_unattached when complete
```

### Cost Impact

Compaction at batch pricing: $1.50/$7.50 per MTok (Sonnet) vs $3/$15 standard. 50% savings on the most expensive recurring operation.

---

## 6. Future API Features to Watch

### Context Editing (clear_tool_uses)

When we implement multi-turn onboarding within a single edge function call, older tool results (skill lookups, coordinate queries) can be auto-cleared. Keeps context lean across the 3-5 onboarding turns.

### MCP Connector

When Ecosquared G2 arrives, edge functions could connect to external MCP servers (other xstream instances, SEED hermitcrabs) directly from the API call. No separate client needed.

### Memory Tool

Structurally identical to `nut_unattached` but API-managed. Worth evaluating whether to supplement or replace our database-backed observation storage for certain use cases.

### Tool Search

When the skill library grows beyond 20-30 skills, dynamic skill loading via tool search avoids stuffing all skills into context. The LLM discovers relevant skills on-demand by searching the skill index.

### 1M Token Context Window

Available on Opus 4.6 and Sonnet 4.5 via beta header. Reserve for hard-nut when reasoning across an entire cosmology's content. Premium pricing (2× base) above 200K tokens — use sparingly.

---

## 7. Environment Variables Summary

Set all of these in Supabase Edge Function Secrets:

```
# Model routing
LLM_FAST=claude-haiku-4-5-20251001
LLM_BALANCED=claude-sonnet-4-5-20250929
LLM_DEEP=claude-sonnet-4-5-20250929

LLM_FAST_EFFORT=low
LLM_BALANCED_EFFORT=medium
LLM_DEEP_EFFORT=high

LLM_FAST_MAX_TOKENS=1024
LLM_BALANCED_MAX_TOKENS=2048
LLM_DEEP_MAX_TOKENS=4096

# API key
ANTHROPIC_API_KEY=sk-ant-...

# Feature flags (for gradual rollout)
ENABLE_STRUCTURED_OUTPUTS=true
ENABLE_SEARCH_RESULTS_PROVENANCE=false
ENABLE_BATCH_COMPACTION=false
ENABLE_1H_CACHE=true
```

Feature flags let us enable API features incrementally without code changes. Start with caching and structured outputs. Add provenance and batch processing once the core pipeline is stable.

---

## 8. Shared Module Structure

All three edge functions import from a shared directory:

```
supabase/functions/
├── _shared/
│   ├── models.ts          # Model routing config (Section 1)
│   ├── anthropic.ts       # Anthropic client setup
│   ├── cache.ts           # Prompt caching helpers
│   ├── schemas.ts         # Structured output schemas (Section 3)
│   └── skills.ts          # Skill loading + compilation
├── soft-nut/
│   └── index.ts
├── medium-nut/
│   └── index.ts
└── hard-nut/
    └── index.ts
```

The `_shared/` directory is Supabase's convention for code shared across edge functions. It's not deployed as a function itself — just imported by the others.

---

## 9. Cost Projection

### Per Active User Per Hour (30 interactions)

| Operation | Calls | Tier | Input Cost | Output Cost | Total |
|---|---|---|---|---|---|
| soft-nut query | 15 | fast | $0.006 | $0.023 | $0.029 |
| soft-nut submit | 15 | fast | $0.006 | $0.015 | $0.021 |
| medium-nut | 5 | balanced | $0.005 | $0.038 | $0.043 |
| hard-nut | 3 | fast | $0.002 | $0.005 | $0.007 |
| **Subtotal (no caching)** | | | | | **$0.100** |
| **With 1-hour caching** | | | | | **~$0.035** |
| **With caching + batch compaction** | | | | | **~$0.025** |

At scale: 100 concurrent users × 8 hours = ~$20/day with full optimisations. That's sustainable for a platform in early growth.

### Model Upgrade Impact

When a cheaper or faster model arrives, changing one environment variable immediately affects all calls at that tier. No code review, no deployment, no risk of drift. Just change the string and monitor.

---

*NUT API Optimizations Reference v1.0 — 2026-02-13*
