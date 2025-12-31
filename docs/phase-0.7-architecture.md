# Phase 0.7: Medium-LLM Synthesis Architecture

**Status**: Draft specification for review  
**Structure**: Each component shows 0.7 minimal and 0.7.5 extension side-by-side

---

## Overview

| Phase | Scope | What It Adds |
|-------|-------|--------------|
| **0.7** | All faces | Commit triggers synthesis of all submitted content |
| **0.7.5** | Player face only | Per-user timer windows, pscale-based timing |

---

## Component 1: Text Input

### Schema: `liquid` table

| Column | 0.7 Minimal | 0.7.5 Extension |
|--------|-------------|-----------------|
| id, frame_id, user_id, user_name | ✓ exists | no change |
| face, content, committed | ✓ exists | no change |
| soft_llm_response | ✓ exists | no change |
| **pscale** | — | INTEGER: action scale (-3 to +2) |
| **submitted_at** | — | TIMESTAMPTZ: when submitted |
| **committed_at** | — | TIMESTAMPTZ: when committed |
| **timer_expires_at** | — | TIMESTAMPTZ: when window closes |
| **interruptive** | — | BOOLEAN: can interrupt others |

### Schema: `solid` table (NEW)

| Column | 0.7 Minimal | 0.7.5 Extension |
|--------|-------------|-----------------|
| id | UUID primary key | no change |
| frame_id | UUID reference | no change |
| face | player/author/designer | no change |
| narrative | TEXT (player output) | no change |
| content_data | JSONB (author output) | no change |
| skill_data | JSONB (designer output) | no change |
| source_liquid_ids | UUID[] | no change |
| triggering_user_id | UUID | no change |
| participant_user_ids | UUID[] | no change |
| **trigger_mode** | — | TEXT: 'commit' / 'expiry' / 'interrupt' |
| **synthesis_pscale** | — | INTEGER: scale of synthesis |
| created_at | TIMESTAMPTZ | no change |

### Behavior

| Aspect | 0.7 Minimal | 0.7.5 Extension |
|--------|-------------|-----------------|
| On submit | Store to liquid, committed=false | + Soft-LLM analyzes pscale, sets timer |
| On commit | Set committed=true, trigger synthesis | + Check if within timer window |
| Cleanup | No deletion, remains as record | no change |

---

## Component 2: Skill Loader

### Behavior

| Aspect | 0.7 Minimal | 0.7.5 Extension |
|--------|-------------|-----------------|
| Load skills | By face + frame (existing) | no change |
| Resolution | platform → frame → user (existing) | no change |

**No changes needed.** Existing `loadSkills()` function works.

---

## Component 3: Prompt Compiler

### Gather Context

| What to Gather | 0.7 Minimal | 0.7.5 Extension |
|----------------|-------------|-----------------|
| Triggering entry | The committed liquid entry | no change |
| Other liquid | ALL in frame (submitted + committed) | Filter by timer state |
| Author content | ALL in frame | no change (proximity in 0.8) |
| Recent solid | Last 3-5 entries | no change |
| **Timer metadata** | — | Include pscale, expiry times |

### Compile Prompt (by face)

**Player Face:**

| Aspect | 0.7 Minimal | 0.7.5 Extension |
|--------|-------------|-----------------|
| Orientation | 30% match conditions, 70% intentions | no change |
| Input format | List all player intentions | + Mark which are "in window" |
| Output constraint | ~20-100 words | Derived from synthesis pscale |

**Author Face:**

| Aspect | 0.7 Minimal | 0.7.5 Extension |
|--------|-------------|-----------------|
| Orientation | Coherence with existing content | no change |
| Output format | Structured content (type, data, pscale) | no change |

**Designer Face:**

| Aspect | 0.7 Minimal | 0.7.5 Extension |
|--------|-------------|-----------------|
| Orientation | Follow SKILL_CREATE structure | no change |
| Output format | Skill document | no change |

---

## Component 4: LLM Caller (Medium-LLM)

### Behavior

| Aspect | 0.7 Minimal | 0.7.5 Extension |
|--------|-------------|-----------------|
| Model | claude-sonnet-4-20250514 | no change |
| Thinking | Enabled, 8000 token budget | no change |
| Max tokens | 16000 | Constrained by pscale |
| Role | Orchestrator (decides what's needed) | no change |

### Pscale Output Constraint (0.7.5 only)

| Pscale | Max Words |
|--------|-----------|
| -3 | ~10 words |
| -2 | ~30 words |
| -1 | ~100 words |
| 0 | ~300 words |
| +1 | ~1000 words |

---

## Component 5: Output Router

### Storage (by face)

| Face | 0.7 Minimal | 0.7.5 Extension |
|------|-------------|-----------------|
| Player | → `solid` table (narrative) | + trigger_mode, synthesis_pscale |
| Author | → `content` table (structured) | no change |
| Designer | → `skills` table (skill doc) | no change |

### Broadcast

| Aspect | 0.7 Minimal | 0.7.5 Extension |
|--------|-------------|-----------------|
| Recipients | All users in frame | no change |
| Channel | Supabase Realtime on solid table | no change |
| **Interrupt signal** | — | Notify users whose timers should cancel |

### Commit Lock

| Aspect | 0.7 Minimal | 0.7.5 Extension |
|--------|-------------|-----------------|
| Mechanism | Frame-level lock during processing | no change |
| Other commits | Wait (show "processing...") | no change |
| Release | After synthesis complete | no change |

---

## Synthesis Trigger

| Aspect | 0.7 Minimal | 0.7.5 Extension |
|--------|-------------|-----------------|
| When | User commits | A: Timer expiry, B: Commit poll, C: Interrupt |
| Who triggers | Committing user | User whose condition is met |
| What's gathered | All liquid in frame | Liquid within active windows |

### ABC Trigger Modes (0.7.5 only)

| Mode | Trigger Condition | What Happens |
|------|-------------------|--------------|
| **A: Expiry** | Timer runs out | Synthesize with accumulated content |
| **B: Polling** | Another user commits | Their commit pulls your submitted content |
| **C: Interrupt** | Interruptive action arrives | Override your pending window |

---

## Timer Architecture (0.7.5 only)

### Per-User Windows

Each player has their OWN timer based on their action's pscale:

```
Player A submits "I attack" (pscale -2) at t=0
  → A's window: 10 seconds, expires t=10

Player B submits "I defend" (pscale -2) at t=3  
  → B's window: 10 seconds, expires t=13

Player C submits "I search room" (pscale -1) at t=5
  → C's window: 30 seconds, expires t=35
```

### Pscale to Window Duration

| Pscale | Game-Time | Real-Time Window |
|--------|-----------|------------------|
| -3 | ~1 second | 3-5 seconds |
| -2 | ~10 seconds | 5-10 seconds |
| -1 | ~1 minute | 15-30 seconds |
| 0 | ~5-10 minutes | 60-120 seconds |
| +1 | ~1 hour | 5+ minutes |

### Soft-LLM Analysis (0.7.5 only)

On submission, before commit, Soft-LLM returns:

```typescript
interface SoftLLMAnalysis {
  pscale: number           // -3 to +2
  timerDuration: number    // seconds
  interruptive: boolean    // can interrupt others?
  validated: boolean       // character capable?
  refinedText?: string     // cleaned up version
}
```

---

## Text State Semantics

| State | What Player Sees | Response Posture |
|-------|------------------|------------------|
| **Solid** | Something happened | Passive/receptive; prep generic response |
| **Liquid** | What will probably happen | Active; my response likely appears in next solid |
| **Vapor** | Variable, risky | Trust-dependent; may not match what happens |

---

## File Structure

### 0.7 Minimal

```
supabase/functions/generate-v2/
  index.ts                    (add 'medium' mode to router)
  synthesis/
    types.ts                  (interfaces)
    gather.ts                 (gather context for all faces)
    compile-player.ts         (player synthesis prompt)
    compile-author.ts         (author synthesis prompt)
    compile-designer.ts       (designer synthesis prompt)
    route.ts                  (store + broadcast)

src/
  hooks/
    useSolidSubscription.ts   (subscribe to solid table)
  components/
    SolidPanel.tsx            (display solid entries)
```

### 0.7.5 Extension (adds/modifies)

```
supabase/functions/generate-v2/
  synthesis/
    gather.ts                 (+ filter by timer state)
    timer.ts                  (NEW: timer management)
    trigger.ts                (NEW: ABC trigger evaluation)

src/
  hooks/
    useTimerWindow.ts         (NEW: per-user timer state)
    useLiquidSubscription.ts  (+ handle timer metadata)
```

---

## Database Migrations

### 0.7 Minimal

```sql
-- Create solid table
CREATE TABLE solid (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frame_id UUID REFERENCES frames(id),
  face TEXT CHECK (face IN ('player', 'author', 'designer')),
  narrative TEXT,
  content_data JSONB,
  skill_data JSONB,
  source_liquid_ids UUID[],
  triggering_user_id UUID REFERENCES users(id),
  participant_user_ids UUID[],
  model_used TEXT,
  tokens_used JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE solid;

-- Create content table if not exists
CREATE TABLE IF NOT EXISTS content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frame_id UUID REFERENCES frames(id),
  author_id UUID REFERENCES users(id),
  content_type TEXT,
  name TEXT,
  data JSONB NOT NULL,
  pscale_aperture INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 0.7.5 Extension

```sql
-- Add timing columns to liquid
ALTER TABLE liquid ADD COLUMN IF NOT EXISTS pscale INTEGER;
ALTER TABLE liquid ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE liquid ADD COLUMN IF NOT EXISTS committed_at TIMESTAMPTZ;
ALTER TABLE liquid ADD COLUMN IF NOT EXISTS timer_expires_at TIMESTAMPTZ;
ALTER TABLE liquid ADD COLUMN IF NOT EXISTS interruptive BOOLEAN DEFAULT false;

-- Add timing columns to solid
ALTER TABLE solid ADD COLUMN IF NOT EXISTS trigger_mode TEXT;
ALTER TABLE solid ADD COLUMN IF NOT EXISTS synthesis_pscale INTEGER;
```

---

## Summary: Extension Points

| Component | 0.7 → 0.7.5 Change |
|-----------|-------------------|
| Text Input | Add timing columns to liquid |
| Skill Loader | None |
| Prompt Compiler | Filter by timer, add pscale metadata |
| LLM Caller | Constrain output by pscale |
| Output Router | Add interrupt signals |
| **New: Timer** | Per-user window management |
| **New: Trigger** | ABC mode evaluation |

Each extension is ADDITIVE. 0.7 code doesn't break — it gains new capabilities.

---

## Implementation Order

### 0.7 (All Faces)

1. Create `solid` table migration
2. Create `content` table migration (if missing)
3. Create synthesis/ folder with handler files
4. Implement gather.ts (context gathering)
5. Implement compile-player.ts (30/70 prompt)
6. Implement compile-author.ts (content structure)
7. Implement compile-designer.ts (designer structure)
8. Implement route.ts (store + broadcast)
9. Add 'medium' mode to index.ts router
10. Add commit lock mechanism
11. Frontend: useSolidSubscription hook
12. Frontend: SolidPanel display
13. Test: Pub Test scenario

### 0.7.5 (Player Timing)

1. Add timing columns migration
2. Implement timer.ts (window management)
3. Implement trigger.ts (ABC evaluation)
4. Modify Soft-LLM to return timing analysis
5. Modify gather.ts to filter by timer
6. Modify compile-player.ts to include timer metadata
7. Modify route.ts to send interrupt signals
8. Frontend: useTimerWindow hook
9. Frontend: timer display in UI
10. Test: Multi-player timing scenarios
