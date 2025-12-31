# Phase 0.8: Hard-LLM & World Context Architecture

**Status**: ⏳ PLANNED (after 0.7.5)  
**Depends on**: 0.7.5 (per-character Medium-LLM, timer windows)

---

## The Core Insight

> "Hard never faces users directly. Hard ensures that when users affect each other, the effects propagate coherently."

Hard-LLM is the **background metabolism** of the system:
- Soft-LLM: Heartbeat (<500ms) - immediate response
- Medium-LLM: Breath (2-10s) - coordination synthesis  
- Hard-LLM: Metabolism (10-30s+) - world coherence

---

## Overview

| Component | Purpose |
|-----------|--------|
| **Proximity Manager** | Tracks who can perceive whom (close/nearby/distant/far) |
| **Context Compiler** | Gathers world content for Medium-LLM aperture |
| **Content Generator** | Procedurally creates missing world elements |
| **Coherence Monitor** | Detects contradictions, maintains world consistency |

---

## Part I: Proximity Architecture

### The Four Proximity States

| State | Meaning | Effect on Medium-LLM |
|-------|---------|---------------------|
| **Close** | Sensorially aware (sight, sound, touch) | Share initiative window - actions affect each other directly |
| **Nearby** | Same general area, not in direct engagement | Separate windows - outcomes visible but not immediate |
| **Distant** | Same region/scene, requires travel to interact | Context only - events summarized, not live |
| **Far** | Different location entirely | No direct effect - only high-pscale events propagate |

### Blob Model

Characters in mutual `close` relationship form a **blob** - they experience synchronized narrative.

```
Blob A: [Player1, Player2, NPC_barkeep]
  - All see each other's actions immediately
  - Medium-LLMs coordinate outcomes
  - Share same solid narrative (with personal perspective)

Blob B: [Player3, Player4]
  - Nearby to Blob A
  - See Blob A's outcomes after resolution
  - Actions don't directly interfere
```

### Convergence & Divergence

**Convergence**: Characters move from `nearby` → `close`
- Triggered by: Movement toward, narrative intersection, explicit approach
- Effect: Blobs merge, subscribe to each other's outcomes

**Divergence**: Characters move from `close` → `nearby`
- Triggered by: Movement away, narrative separation, explicit departure
- Effect: Blob splits, unsubscribe from direct coordination

### Hard-LLM Proximity Check

After each synthesis cycle, Hard-LLM evaluates:

```typescript
interface ProximityCheckInput {
  character_id: string;
  recent_narrative: string;        // What just happened
  current_close: string[];         // Who they're with
  current_nearby: string[];        // Who's around
  nearby_narratives: string[];     // What nearby characters experienced
}

interface ProximityCheckOutput {
  converge_with: string[];         // Move to close
  diverge_from: string[];          // Move to nearby
  reasoning: string;               // Why (for debugging)
}
```

### Blob Representative Optimization

When checking proximity, don't compare against every nearby character - compare against **one representative per blob**:

```
Nearby: [A, B, C, D, E]
A.close = [B, C]  → A is representative, B and C covered
D.close = [E]     → D is representative, E covered

Representatives: [A, D]  ← only 2 comparisons, not 5
```

---

## Part II: Context Compilation

### What Medium-LLM Needs

Medium-LLM synthesis requires world context. Hard-LLM compiles this:

```typescript
interface WorldContext {
  // Location context
  current_location: {
    id: string;
    description: string;
    features: string[];           // Things that can be interacted with
    atmosphere: string;           // Mood, lighting, sounds
  };
  
  // Nearby locations (for movement options)
  adjacent_locations: {
    id: string;
    name: string;
    direction: string;            // "north", "through the door", etc.
  }[];
  
  // NPCs present
  npcs_present: {
    id: string;
    name: string;
    disposition: string;          // Current attitude
    activity: string;             // What they're doing
  }[];
  
  // Recent events (high-pscale outcomes that affect this location)
  active_events: {
    description: string;
    pscale: number;
    relevance: string;            // How it affects current scene
  }[];
  
  // Time/weather if relevant
  environmental: {
    time_of_day?: string;
    weather?: string;
    special_conditions?: string[];
  };
}
```

### Aperture Selection

Hard-LLM determines what's **in scope** for each character based on:

1. **Spatial pscale**: Character's location in world hierarchy
2. **Temporal pscale**: How long their action takes (affects what can change)
3. **Attention focus**: What the character is paying attention to
4. **Proximity network**: Who they can perceive

```typescript
interface ApertureConfig {
  spatial_floor: number;    // Don't include details smaller than this
  spatial_ceiling: number;  // Don't include context larger than this
  temporal_window: number;  // How far back to include events
  focus_filter?: string;    // Optional attention narrowing
}
```

### Context Flow

```
Hard-LLM (background, 10-30s)
  │
  ├── Queries content table for character's location
  ├── Queries nearby characters' positions
  ├── Queries recent outcomes affecting this area
  ├── Compiles WorldContext
  │
  └── Stores in character_context table
          │
          ▼
Medium-LLM (on wake)
  │
  ├── Reads character_context
  ├── Includes in synthesis prompt
  │
  └── Generates narrative with world awareness
```

---

## Part III: Procedural Content Generation

### The Problem

Player enters a room that Author hasn't described. What happens?

### The Solution: Author-LLM Content Generation

Hard-LLM detects missing content and generates it:

```typescript
interface ContentGap {
  type: 'location' | 'npc' | 'item' | 'event';
  trigger: string;                // What prompted the need
  context: {
    parent_location?: string;     // Where this fits
    nearby_content?: string[];    // What's already established
    player_expectation?: string;  // What player seems to be looking for
  };
}

interface GeneratedContent {
  id: string;
  content_type: string;
  data: {
    name: string;
    description: string;
    features?: string[];
    connections?: string[];
  };
  pscale_aperture: number;
  determinancy: number;           // 0.0-1.0, how fixed this is
  generated_by: 'hard-llm';       // Mark as procedural
}
```

### Generation Principles

1. **Consistency**: Generated content must fit established world
2. **Minimalism**: Generate only what's needed for current action
3. **Determinancy gradient**: New content starts with low determinancy (can be revised)
4. **Author override**: Human authors can replace generated content later

### Example Flow

```
Player: "I go through the back door"
  │
  ▼
Medium-LLM: Needs to know what's behind the door
  │
  ▼
Hard-LLM: Checks content table → No entry for "back room"
  │
  ▼
Hard-LLM: Generates content based on:
  - Parent: "The Rusty Anchor" (pub)
  - Nearby: Kitchen, cellar stairs
  - World: URB, industrial fantasy
  │
  ▼
Generated: {
  name: "Storage Room",
  description: "Cramped space stacked with crates and barrels...",
  features: ["crates", "barrels", "dust", "small window"],
  determinancy: 0.3  // Can be revised
}
  │
  ▼
Stored to content table with generated_by: 'hard-llm'
  │
  ▼
Medium-LLM: Now has context for player's action
```

---

## Part IV: Coherence Monitoring

### Contradiction Detection

Hard-LLM monitors for inconsistencies:

- Character in two places simultaneously
- Dead NPC appearing alive
- Time paradoxes (event B before event A that caused it)
- Physics violations (unless magic explains it)

### Resolution Strategies

| Contradiction Type | Resolution |
|-------------------|------------|
| **Minor** | Ignore, let narrative smooth over |
| **Moderate** | Flag for Author review |
| **Severe** | Inject correction into next synthesis |
| **Critical** | Pause affected characters, notify Designer |

### Coherence Context

```typescript
interface CoherenceAlert {
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  type: string;
  description: string;
  affected_characters: string[];
  suggested_resolution?: string;
  auto_resolved: boolean;
}
```

---

## Part V: Data Model

### New Tables

```sql
-- Character proximity subscriptions
CREATE TABLE character_subscriptions (
  character_id UUID PRIMARY KEY REFERENCES characters(id),
  close UUID[] DEFAULT '{}',
  nearby UUID[] DEFAULT '{}',
  distant UUID[] DEFAULT '{}',
  far UUID[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Compiled world context (cache)
CREATE TABLE character_context (
  character_id UUID PRIMARY KEY REFERENCES characters(id),
  frame_id UUID REFERENCES frames(id),
  world_context JSONB NOT NULL,
  aperture_config JSONB,
  compiled_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ  -- Context goes stale
);

-- Hard-LLM job queue
CREATE TABLE hard_llm_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,  -- 'proximity_check', 'context_compile', 'content_generate', 'coherence_check'
  character_id UUID REFERENCES characters(id),
  frame_id UUID REFERENCES frames(id),
  input JSONB NOT NULL,
  output JSONB,
  status TEXT DEFAULT 'pending',  -- 'pending', 'processing', 'complete', 'failed'
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Index for job processing
CREATE INDEX hard_llm_jobs_pending ON hard_llm_jobs(status, created_at) 
  WHERE status = 'pending';
```

### Modified Tables

```sql
-- Add to content table
ALTER TABLE content ADD COLUMN IF NOT EXISTS generated_by TEXT;  -- null = author, 'hard-llm' = procedural
ALTER TABLE content ADD COLUMN IF NOT EXISTS determinancy DECIMAL(3,2) DEFAULT 1.0;

-- Add to characters table  
ALTER TABLE characters ADD COLUMN IF NOT EXISTS current_location_id UUID REFERENCES content(id);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS attention_focus TEXT;
```

---

## Part VI: Edge Functions

### hard-llm-processor

Background worker that processes Hard-LLM jobs:

```typescript
// Triggered by: cron (every 10s) or on-demand

async function processHardLLMJobs() {
  // Get pending jobs, oldest first
  const jobs = await getPendingJobs(limit: 10);
  
  for (const job of jobs) {
    switch (job.job_type) {
      case 'proximity_check':
        await processProximityCheck(job);
        break;
      case 'context_compile':
        await processContextCompile(job);
        break;
      case 'content_generate':
        await processContentGenerate(job);
        break;
      case 'coherence_check':
        await processCoherenceCheck(job);
        break;
    }
  }
}
```

### Job Scheduling

Jobs are created by:

1. **Medium-LLM completion** → Queue proximity_check for all involved characters
2. **Timer expiry approaching** → Queue context_compile for character
3. **Missing content detected** → Queue content_generate
4. **Periodic sweep** → Queue coherence_check for active frames

---

## Part VII: Integration with 0.7.5

### Medium-LLM Now Reads Context

```typescript
// In gather.ts (modified for 0.8)

async function gatherContext(characterId: string, frameId: string): Promise<SynthesisContext> {
  // ... existing gathering ...
  
  // NEW: Get Hard-LLM compiled context
  const { data: hardContext } = await supabase
    .from('character_context')
    .select('world_context, aperture_config')
    .eq('character_id', characterId)
    .single();
  
  return {
    ...existingContext,
    worldContext: hardContext?.world_context,
    aperture: hardContext?.aperture_config
  };
}
```

### Proximity Affects Outcome Visibility

```typescript
// In route.ts (modified for 0.8)

async function broadcastOutcome(outcome: ActionOutcome) {
  const { data: subs } = await supabase
    .from('character_subscriptions')
    .select('*')
    .eq('character_id', outcome.source_character_id)
    .single();
  
  // Close characters: Full outcome immediately
  for (const charId of subs.close) {
    await deliverOutcome(charId, outcome, 'full');
  }
  
  // Nearby characters: Outcome summary on their next wake
  for (const charId of subs.nearby) {
    await queueOutcomeSummary(charId, outcome);
  }
  
  // Distant/Far: Only if high pscale
  if (outcome.pscale >= 2) {
    for (const charId of [...subs.distant, ...subs.far]) {
      await queueDistantEvent(charId, outcome);
    }
  }
}
```

---

## Part VIII: Implementation Order

### Prerequisites (from 0.7.5)
- ✅ Per-character Medium-LLM
- ✅ Outcomes table with broadcast
- ✅ Timer windows
- ✅ Personal narratives

### 0.8 Implementation Steps

1. **Database**: Create character_subscriptions, character_context, hard_llm_jobs tables
2. **Database**: Add columns to content and characters tables
3. **Edge Function**: Create hard-llm-processor with job types
4. **Proximity**: Implement proximity_check job (convergence/divergence)
5. **Context**: Implement context_compile job (world context gathering)
6. **Generate**: Implement content_generate job (procedural content)
7. **Coherence**: Implement coherence_check job (contradiction detection)
8. **Integration**: Modify gather.ts to read character_context
9. **Integration**: Modify route.ts to use proximity for delivery
10. **Scheduling**: Add job creation triggers
11. **Frontend**: Debug view for proximity network
12. **Test**: Player enters unnamed room → generates content

---

## Part IX: Success Criteria

1. **Proximity works**: Characters moving together converge into blob
2. **Context flows**: Medium-LLM receives world context from Hard-LLM
3. **Content generates**: Missing locations created on-demand
4. **Coherence holds**: Contradictions detected and flagged
5. **Performance**: Hard-LLM background doesn't block player experience
6. **The Room Test**: Player enters unnamed room → Hard-LLM generates description from nearby content patterns → Medium-LLM uses it naturally

---

## Part X: Key Quotes from Design Docs

From onen_v4_synthesis:
> "Hard-LLM operates in background. Maintains coherence across the entire system. Exchanges semantic coordinates with other Hard-LLMs."

From soft_medium_coordination_architecture:
> "Hard-LLM (proximity + world): Maintains semantic proximity networks (close/nearby/distant/far), Background scene monitoring, NPC generation and world-level changes"

From plex-1-specification:
> "Hard-LLM: Monitors character position via narrative analysis, Maintains subscription networks (close/nearby/far), Updates which actions are visible to which characters"

---

## Appendix: Cron Configuration

For Supabase pg_cron (or external scheduler):

```sql
-- Process Hard-LLM jobs every 10 seconds
SELECT cron.schedule(
  'hard-llm-processor',
  '*/10 * * * * *',  -- Every 10 seconds
  $$SELECT net.http_post(
    'https://piqxyfmzzywxzqkzmpmm.supabase.co/functions/v1/hard-llm-processor',
    '{}',
    '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  )$$
);
```

Alternatively, use Supabase Edge Function with `Deno.cron` (if available) or external scheduler like n8n.
