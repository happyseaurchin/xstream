# Phase 0.7: Medium-LLM Synthesis Architecture

**Status**: ✅ 0.7 COMPLETE | 0.7.5 Ready for implementation  
**Critical**: 0.7.5 introduces per-character Medium-LLMs, not just timing

---

## The Core Insight

> "Cohesion through action-facts, not world-modeling. Variation through perspective and timing, not divergent physics."

**What's shared**: Action outcomes (the bones) - who did what, in what order  
**What's personal**: Narrative (the flesh) - how it felt to THIS character

---

## Overview

| Phase | Scope | What It Adds |
|-------|-------|-------------|
| **0.7** | All faces | Single Medium-LLM, commit triggers synthesis, shared solid |
| **0.7.5** | Player face | Per-character Medium-LLMs, timer windows, personalized narratives |

**0.7 is a degenerate case** - useful for testing, but not the real architecture. It's "everyone sees the same movie." 0.7.5 is "everyone experiences the same events from their own perspective."

---

## 0.7 vs 0.7.5: The Key Difference

### 0.7 (Current - Single Medium)

```
Player A commits "I attack the orc"
  ↓
Single Medium-LLM synthesizes
  ↓
One solid entry created
  ↓
All players see identical narrative
```

### 0.7.5 (Target - Per-Character Medium)

```
Player A commits "I attack the orc" 
  → A's Medium timer starts (5s based on pscale)

Player B commits "I defend" at t+2s
  → B's Medium timer starts (5s)

t+5s: A's Medium wakes
  → Reads: A's committed action, B's submitted action
  → Generates: ACTION OUTCOME (shared) + A's NARRATIVE (personal)
  → Broadcasts outcome to all Medium-LLMs
  → Delivers A's personalized solid to A

t+7s: B's Medium wakes
  → Reads: B's committed action, A's resolved OUTCOME
  → Generates: ACTION OUTCOME (may overlap with A's) + B's NARRATIVE (personal)
  → Broadcasts outcome
  → Delivers B's personalized solid to B
```

**Result**: A and B experience the SAME EVENTS but see DIFFERENT NARRATIVES suited to their character's perspective, knowledge, and position.

---

## The Two-Layer Output

### Layer 1: Action Outcome (Shared Bones)

```typescript
interface ActionOutcome {
  id: string;
  frame_id: string;
  source_character_id: string;
  
  // What objectively happened
  actions_resolved: {
    character_id: string;
    action: string;
    result: 'success' | 'partial' | 'failure' | 'interrupted';
  }[];
  
  // State changes anyone can perceive
  world_facts_established: string[];
  
  // Who might be affected
  characters_involved: string[];
  
  created_at: string;
}
```

This is the **shared truth** - action-facts that all Medium-LLMs reference.

### Layer 2: Narrative (Personal Flesh)

```typescript
interface PersonalNarrative {
  id: string;
  frame_id: string;
  character_id: string;        // WHO this is for
  user_id: string;             // The player receiving it
  
  // What this character experiences
  narrative: string;           // Personalized prose
  
  // What informed this rendering
  outcome_ids: string[];       // Which outcomes were incorporated
  perspective_notes?: string;  // Why this differs from others
  
  created_at: string;
}
```

This is **character-specific** - how events felt to THIS character.

---

## Component 1: Text Input

### Schema: `liquid` table

| Column | 0.7 Minimal | 0.7.5 Extension |
|--------|-------------|----------------|
| id, frame_id, user_id, user_name | ✓ exists | no change |
| face, content, committed | ✓ exists | no change |
| **character_id** | — | UUID: which character is acting |
| **pscale** | — | INTEGER: action scale (-3 to +2) |
| **submitted_at** | — | TIMESTAMPTZ: when submitted |
| **committed_at** | — | TIMESTAMPTZ: when committed |
| **timer_expires_at** | — | TIMESTAMPTZ: when window closes |
| **interruptive** | — | BOOLEAN: can interrupt others |

### Schema: `outcomes` table (NEW in 0.7.5)

| Column | Purpose |
|--------|--------|
| id | UUID primary key |
| frame_id | Which frame |
| source_character_id | Whose Medium generated this |
| actions_resolved | JSONB: array of {character_id, action, result} |
| world_facts | TEXT[]: established facts |
| characters_involved | UUID[]: who might care |
| created_at | TIMESTAMPTZ |

### Schema: `solid` table

| Column | 0.7 Minimal | 0.7.5 Extension |
|--------|-------------|----------------|
| id | UUID primary key | no change |
| frame_id | UUID reference | no change |
| face | player/author/designer | no change |
| narrative | TEXT (shared in 0.7) | TEXT (personal in 0.7.5) |
| **character_id** | — | UUID: whose narrative this is |
| **user_id** | — | UUID: who receives this |
| **outcome_ids** | — | UUID[]: which outcomes informed this |
| source_liquid_ids | UUID[] | no change |
| participant_user_ids | UUID[] | no change |
| **trigger_mode** | — | TEXT: 'commit' / 'expiry' / 'interrupt' |
| **synthesis_pscale** | — | INTEGER: scale of synthesis |
| created_at | TIMESTAMPTZ | no change |

---

## Component 2: Per-Character Medium-LLM (0.7.5)

### The Medium Trinity

Each player-character has their own Medium-LLM instance (conceptually - may be same model, different context):

```
Character A's Medium-LLM
  ├── Reads: A's committed action
  ├── Reads: Other characters' submitted/committed actions
  ├── Reads: Previously resolved outcomes
  ├── Generates: Action outcome (if A committed)
  ├── Generates: A's personalized narrative
  └── Delivers: To A only

Character B's Medium-LLM  
  ├── Reads: B's committed action
  ├── Reads: Other characters' actions + A's resolved outcome
  ├── Generates: Action outcome (if B committed)
  ├── Generates: B's personalized narrative
  └── Delivers: To B only
```

### Medium Wake-Up Triggers

| Trigger | Condition | What Happens |
|---------|-----------|-------------|
| **Expiry** | Timer runs out | Medium wakes with accumulated content |
| **Polling** | Another character commits | Their outcome available, may influence |
| **Interrupt** | High-priority action targets you | Your timer cancelled, interrupt narrative |

### What Medium Receives (0.7.5)

```typescript
interface MediumInput {
  // This character's action
  myAction: {
    liquid: LiquidEntry;
    character: CharacterState;
    pscale: number;
  };
  
  // Same-pscale actions (resolve together)
  samePscaleActions: {
    character_id: string;
    action: string;
    committed: boolean;
  }[];
  
  // Already-resolved outcomes (incorporate these)
  resolvedOutcomes: ActionOutcome[];
  
  // Pending higher-pscale (visible intent, not resolved)
  pendingHigherPscale: {
    character_id: string;
    action: string;
  }[];
  
  // World context
  worldContent: ContentEntry[];
  recentNarrative: PersonalNarrative[];  // This character's recent experience
}
```

### What Medium Outputs (0.7.5)

```typescript
interface MediumOutput {
  // Shared layer: what happened (broadcast to all Mediums)
  outcome: {
    actions_resolved: {
      character_id: string;
      action: string;
      result: 'success' | 'partial' | 'failure' | 'interrupted';
    }[];
    world_facts_established: string[];
    interrupts_generated: {
      target_character_id: string;
      reason: string;
    }[];
  };
  
  // Personal layer: how it felt (delivered to this player only)
  narrative: string;
  
  // Metadata
  outcomes_incorporated: string[];  // Which prior outcomes were woven in
}
```

---

## Component 3: Timer Architecture (0.7.5)

### Per-Character Windows

Each character has their OWN timer based on their action's pscale:

```
t=0s:  A commits "I attack" (pscale -2) → A's timer: 5s, expires t=5s
t=2s:  B commits "I defend" (pscale -2) → B's timer: 5s, expires t=7s
t=3s:  C submits "I search room" (pscale -1) → C's timer: 15s, expires t=18s

t=5s:  A's Medium wakes
       - Sees: A's attack, B's defense (submitted), C's search (submitted)
       - Generates: Attack outcome + A's narrative
       - Broadcasts outcome

t=7s:  B's Medium wakes
       - Sees: B's defense, A's resolved OUTCOME, C's search (submitted)
       - Generates: Defense outcome + B's narrative
       - Broadcasts outcome

t=18s: C's Medium wakes
       - Sees: C's search, A's outcome, B's outcome
       - Generates: Search outcome + C's narrative
       - C's narrative references the combat that happened during their search
```

### Pscale to Window Duration

| Pscale | Game-Time | Real-Time Window |
|--------|-----------|------------------|
| -3 | ~1 second | 3-5 seconds |
| -2 | ~10 seconds | 5-10 seconds |
| -1 | ~1 minute | 15-30 seconds |
| 0 | ~5-10 minutes | 60-120 seconds |
| +1 | ~1 hour | 5+ minutes |

### Soft-LLM Analysis (0.7.5)

On submission, Soft-LLM returns timing metadata:

```typescript
interface SoftAnalysis {
  pscale: number;              // -3 to +2
  timerDuration: number;       // seconds
  interruptive: boolean;       // can interrupt others?
  interruptTargets?: string[]; // who specifically
  refinedText?: string;        // cleaned up version
}
```

---

## Component 4: Prompt Compilation (0.7.5)

### Player Medium Prompt Structure

```
SYSTEM: You are this character's Medium-LLM. Generate:
1. ACTION OUTCOME: What objectively happened (shared truth)
2. PERSONAL NARRATIVE: How this character experienced it

ORIENTATION:
- 30% match established conditions
- 70% enable character intentions
- Preserve exact dialogue in quotes
- Your narrative is for THIS character only

OUTPUT FORMAT:
OUTCOME
actions_resolved:
  - character: [id], action: [what], result: [success/partial/failure/interrupted]
world_facts:
  - [fact established]
interrupts:
  - target: [id], reason: [why]

NARRATIVE
[Personal prose for this character - what they perceive, feel, experience]
```

### Context Gathering for Personal Narrative

| What to Include | Why |
|-----------------|-----|
| This character's recent solid | Continuity of their experience |
| Other characters' OUTCOMES | Shared facts to incorporate |
| NOT other characters' narratives | Their experience is private |
| World content | Shared setting |
| Submitted actions | What's pending (may or may not resolve) |

---

## Component 5: Output Routing (0.7.5)

### Two Broadcast Channels

**Outcome Channel** (to all Medium-LLMs):
```typescript
// Supabase Realtime on outcomes table
// All Mediums subscribe, incorporate into their context
```

**Narrative Channel** (to specific player):
```typescript
// Supabase Realtime on solid table, filtered by user_id
// Each player only receives their character's narratives
```

### Interrupt Propagation

When outcome includes `interrupts_generated`:
1. Find target character's pending timer
2. Cancel their timer early
3. Inject interrupt context into their Medium
4. Their Medium wakes immediately with interrupt flag

---

## Data Flow Diagram (0.7.5)

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRAME                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Player A                          Player B                      │
│  ┌──────────┐                      ┌──────────┐                 │
│  │ Soft-LLM │                      │ Soft-LLM │                 │
│  └────┬─────┘                      └────┬─────┘                 │
│       │ commit + pscale                 │ commit + pscale       │
│       ▼                                 ▼                        │
│  ┌──────────┐                      ┌──────────┐                 │
│  │ Timer 5s │                      │ Timer 5s │                 │
│  └────┬─────┘                      └────┬─────┘                 │
│       │ expires                         │ expires               │
│       ▼                                 ▼                        │
│  ┌──────────┐     OUTCOMES        ┌──────────┐                  │
│  │Medium-LLM│◄───────────────────►│Medium-LLM│                  │
│  │    A     │  (shared bones)     │    B     │                  │
│  └────┬─────┘                      └────┬─────┘                 │
│       │                                 │                        │
│       │ A's narrative                   │ B's narrative         │
│       ▼                                 ▼                        │
│  ┌──────────┐                      ┌──────────┐                 │
│  │ A's Solid│                      │ B's Solid│                 │
│  │(personal)│                      │(personal)│                 │
│  └──────────┘                      └──────────┘                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Migration Path

### 0.7 → 0.7.5 Database Changes

```sql
-- Add character context to liquid
ALTER TABLE liquid ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id);
ALTER TABLE liquid ADD COLUMN IF NOT EXISTS pscale INTEGER;
ALTER TABLE liquid ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE liquid ADD COLUMN IF NOT EXISTS committed_at TIMESTAMPTZ;
ALTER TABLE liquid ADD COLUMN IF NOT EXISTS timer_expires_at TIMESTAMPTZ;
ALTER TABLE liquid ADD COLUMN IF NOT EXISTS interruptive BOOLEAN DEFAULT false;

-- Create outcomes table (shared action-facts)
CREATE TABLE outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frame_id UUID REFERENCES frames(id),
  source_character_id UUID REFERENCES characters(id),
  actions_resolved JSONB NOT NULL,
  world_facts TEXT[],
  characters_involved UUID[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable realtime on outcomes
ALTER PUBLICATION supabase_realtime ADD TABLE outcomes;

-- Add personal context to solid
ALTER TABLE solid ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id);
ALTER TABLE solid ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE solid ADD COLUMN IF NOT EXISTS outcome_ids UUID[];
ALTER TABLE solid ADD COLUMN IF NOT EXISTS trigger_mode TEXT;
ALTER TABLE solid ADD COLUMN IF NOT EXISTS synthesis_pscale INTEGER;

-- Index for efficient personal narrative lookup
CREATE INDEX IF NOT EXISTS solid_user_id_idx ON solid(user_id);
CREATE INDEX IF NOT EXISTS solid_character_id_idx ON solid(character_id);
```

### Code Changes

| File | Change |
|------|--------|
| `synthesis/types.ts` | Add Outcome, PersonalNarrative interfaces |
| `synthesis/gather.ts` | Filter outcomes by character, gather personal context |
| `synthesis/compile-player.ts` | Two-part output: outcome + narrative |
| `synthesis/route.ts` | Store outcome (broadcast) + solid (personal) separately |
| `synthesis/timer.ts` | NEW: Per-character timer management |
| `synthesis/interrupt.ts` | NEW: Interrupt detection and propagation |
| `src/hooks/useSolidSubscription.ts` | Filter by user_id for personal narratives |
| `src/hooks/useOutcomeSubscription.ts` | NEW: Subscribe to shared outcomes |

---

## Implementation Order

### 0.7 (All Faces) ✅ COMPLETE

1. ✅ Create `solid` table migration
2. ✅ Create `content` table migration
3. ✅ Create synthesis/ folder with handler files
4. ✅ Implement gather.ts (context gathering)
5. ✅ Implement compile-player.ts (30/70 prompt)
6. ✅ Implement compile-author.ts (content structure)
7. ✅ Implement compile-designer.ts (designer structure)
8. ✅ Implement route.ts (store + broadcast)
9. ✅ Add 'medium' mode to index.ts router
10. ⚠️ Commit lock mechanism (not yet implemented)
11. ✅ Frontend: useSolidSubscription hook
12. ✅ Frontend: SolidPanel display
13. ✅ Test: Multi-player scenario (shared solid)

### 0.7.5 (Per-Character Synthesis) - NEXT

1. Add character_id to liquid table
2. Add timing columns to liquid
3. Create outcomes table
4. Add personal columns to solid
5. Implement timer.ts (per-character window management)
6. Implement interrupt.ts (interrupt detection)
7. Modify gather.ts to gather per-character context
8. Modify compile-player.ts for two-part output (outcome + narrative)
9. Modify route.ts:
   - Store outcome to outcomes table (broadcast)
   - Store narrative to solid table with character_id/user_id (personal)
10. Modify Soft-LLM to return pscale + timer duration
11. Frontend: useOutcomeSubscription hook (for debugging/GM view)
12. Frontend: Modify useSolidSubscription to filter by user_id
13. Frontend: Timer display in UI
14. Test: Two players, same events, different narratives

---

## Success Criteria for 0.7.5

1. Player A and Player B commit actions
2. Each gets a DIFFERENT narrative in their solid panel
3. Both narratives describe the SAME events (outcomes match)
4. Narratives reflect each character's perspective and position
5. Timer windows allow accumulation before synthesis
6. Interrupts cancel affected timers appropriately
7. The Mos Eisley Test: 3 players, 1 hour, synchronized imagination with personal experience

---

## Key Quotes from Design Docs

From soft-medium-coordination-v2:
> "Actions are the bones, narrative is the flesh. Shared: action-sequence bones. Character-specific: narrative flesh."

From soft_medium_timing_architecture:
> "Character-Specific Narrative: Medium generates synthesis from its character's perspective"
> "Delivery: Passes narrative bones to Soft for final personalized rendering"

From plex-1-specification:
> RouterOutput includes: `deliveries: { user_id, display_type, content }[]`

The architecture was always designed for personalized delivery. 0.7 was the simplified bootstrap; 0.7.5 is the real thing.
