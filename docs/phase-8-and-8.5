# Phase 0.8: Hard-LLM & Determinancy Architecture

**Status**: 0.8 Ready for implementation | 0.8.5 Scoped for extension
**Critical**: 0.8.5 introduces per-user Hard-LLMs, not just skill-driven decisions

---

## The Core Insight

> "Hard-LLM gets characters into the same room. Across the entire universe, that's quite a trick."

**What Hard-LLM does**: Navigate proximity—spatial and temporal coordinates that determine who CAN interact
**What Medium-LLM does**: Generate embodied perspective—what characters actually experience when together
**What determinancy adds**: Quality/nuance indicators that inform Medium-LLM's narrative choices

---

## Overview

| Phase | Scope | What It Adds |
|-------|-------|--------------|
| **0.8** | All faces | Single skill-driven Hard-LLM, coordinate tracking, operational frame assembly |
| **0.8.5** | Player face | Per-user Hard-LLMs, semantic-number exchange, distributed determinancy clouds |

**0.8 is a degenerate case**—useful for testing, but not the real architecture. It's "one navigator for all characters." 0.8.5 is "each character has their own navigator coordinating with others."

---

## 0.8 vs 0.8.5: The Key Difference

### 0.8 (Current - Single Hard-LLM)
```
Marcus commits "I walk to the kitchen"
  ↓
Single Hard-LLM (with skills) analyzes
  ↓
Coordinate update: Marcus 11. → 12.
  ↓
Proximity recalculated for all characters
  ↓
Operational frame assembled for Medium-LLM
```

### 0.8.5 (Target - Per-User Hard-LLM)
```
Marcus commits "I walk to the kitchen"
  → Marcus's Hard-LLM extracts semantic-number
  → Marcus's Hard-LLM updates own coordinates
  → Marcus's Hard-LLM broadcasts to proximity characters

Elara's Hard-LLM receives broadcast
  → Checks coordinate overlap (same room now!)
  → Calculates event interference (quality indicator)
  → Updates own proximity state
  → Adjusts operational frame for Elara's Medium-LLM

No central coordinator. Coherence emerges from local exchange.
```

**Result**: Hard-LLMs coordinate across the universe to determine WHO can interact. Medium-LLMs then generate WHAT they experience.

---

## The Coordinate System

### Spatial Coordinates

Hierarchical strings where position = pscale level, value = semantic ID:
```
"13.4" = 
  Position 0 (digit 1): pscale +1 → "keep" (building)
  Position 1 (digit 3): pscale 0  → "kitchen" (room)
  Position 2 (digit 4): pscale -1 → "fireplace" (furniture)
```

### Temporal Coordinates

Same structure for time:
```
"234.1" =
  Position 0 (digit 2): pscale +2 → "day-2"
  Position 1 (digit 3): pscale +1 → "noon"
  Position 2 (digit 4): pscale 0  → "block-4"
  Position 3 (digit 1): pscale -1 → "minute-1"
```

### Proximity via Prefix Overlap

| Shared Digits | State | Meaning |
|---------------|-------|---------|
| ≥2 | CLOSE | Same room, actions coordinate |
| 1 | NEARBY | Same building, outcomes visible |
| 0 | DISTANT | Same cosmology, major events propagate |

**This is Hard-LLM's domain**: Getting characters to share coordinate prefixes.

---

## The Determinancy Cloud (0.8.5)

### What Semantic-Numbers Are

From narrative, extract events with pscale and magnitude:
```
{centuries-of-solitude}[9]{}{}{}{}{}{}{}[]{apologizes-softly}[5].{}{}{tilts-head}[6]
Pure: 900000005.006
```

- Position encodes pscale (higher = further left)
- Magnitude encodes narrative weight (1-10)
- Decimal separates pscale 0 from negative

### How They're Used

**NOT for proximity** (that's coordinates)

**FOR quality/nuance**:
- Event interference indicates narrative alignment
- Higher pscale events constrain lower ones (downward causation)
- Accumulated semantic-numbers = character's narrative thread

**Medium-LLM receives this as context**, not as proximity rule.

---

## Component 1: Coordinate Storage

### Schema: `character_coordinates` table

| Column | 0.8 | 0.8.5 |
|--------|-----|-------|
| character_id | ✓ PK | no change |
| frame_id | ✓ FK | no change |
| spatial | ✓ TEXT | no change |
| temporal | ✓ TEXT | no change |
| focus | ✓ TEXT | no change |
| updated_by | ✓ TEXT | no change |
| updated_at | ✓ TIMESTAMPTZ | no change |

### Schema: `character_proximity` table

| Column | 0.8 | 0.8.5 |
|--------|-----|-------|
| character_id | ✓ PK | no change |
| close | ✓ UUID[] | no change |
| nearby | ✓ UUID[] | no change |
| distant | ✓ UUID[] | no change |
| coordinated_at | ✓ TIMESTAMPTZ | no change |
| **interference_quality** | — | JSONB: event alignment indicators |

---

## Component 2: Semantic-Number Storage (0.8.5 Ready)

### Schema: `semantic_numbers` table (NEW)

| Column | Purpose |
|--------|---------|
| id | UUID primary key |
| frame_id | Which frame |
| character_id | Who generated this |
| vector_sequence | JSONB: [{phrase, magnitude, pscale}, ...] |
| pure_number | NUMERIC: e.g., 900000005.006 |
| source_type | 'narrative', 'action', 'author-content' |
| source_id | Reference to solid, liquid, or content |
| created_at | TIMESTAMPTZ |

### Schema: `semantic_relationships` table (NEW)

| Column | Purpose |
|--------|---------|
| source_sn_id | FK to semantic_numbers |
| target_sn_id | FK to semantic_numbers |
| relation_type | 'causes', 'anticipates', 'interferes_with' |
| weight | FLOAT: strength of relationship |
| pscale_overlap | INTEGER[]: which levels they share |

**0.8**: Tables exist, semantic-numbers logged but not stored
**0.8.5**: Semantic-numbers stored and exchanged between Hard-LLMs

---

## Component 3: Skills Architecture

### The Skill-Driven Approach

Instead of hard-coded functions, Hard-LLM reads skill documents:
```
Hard-LLM invoked
  ↓
Load skills from database (category = 'hard')
  ↓
Build prompt with skills + context
  ↓
Claude reasons with extended thinking
  ↓
Parse structured output
  ↓
Apply database updates
```

### Skills for 0.8

| Skill | Purpose |
|-------|---------|
| `hard/proximity.md` | Determine relationships from coordinate prefix overlap |
| `hard/movement.md` | Extract coordinate changes from narrative text |
| `hard/aperture.md` | Calculate attention scope from action pscale |
| `hard/relevance.md` | Filter content by spatial overlap and aperture |
| `hard/frame-assembly.md` | Compile operational context for Medium-LLM |
| `hard/semantic-extraction.md` | Extract semantic-numbers from narrative (logged in 0.8) |

### Additional Skills for 0.8.5

| Skill | Purpose |
|-------|---------|
| `hard/coordination.md` | Exchange semantic-numbers with proximate Hard-LLMs |
| `hard/interference.md` | Calculate event alignment/conflict as quality indicator |
| `hard/broadcast.md` | Protocol for publishing to proximity characters |

---

## Component 4: Edge Function

### 0.8: Single Invocation
```
POST /functions/v1/hard-llm
{
  "trigger": "synthesis-complete" | "action-commit" | "time-advance",
  "frame_id": "uuid",
  "character_ids": ["uuid", ...],
  "narrative": "string",
  "action_pscale": number
}
```

**Response**:
```json
{
  "coordinate_updates": [
    { "character_id": "...", "spatial": "12.", "reasoning": "walked to kitchen" }
  ],
  "proximity_updates": [
    { "character_id": "...", "close": ["..."], "nearby": ["..."] }
  ],
  "operational_frames": [
    { "character_id": "...", "frame_id": "...", "coordinates": {...}, "proximity": {...}, "content": [...] }
  ],
  "semantic_numbers_extracted": [
    { "character_id": "...", "pure_number": 12.3, "vectors": [...] }
  ]
}
```

### 0.8.5: Per-User Invocation

Each user's Hard-LLM runs independently, triggered by:
- Their character's action commit
- Received broadcast from proximate Hard-LLM
- Timer (periodic recalculation)

**Broadcast channel**: Supabase Realtime per cosmology/region
```typescript
// Subscribe to proximity broadcasts
supabase.channel(`hard-llm:${cosmology_id}`)
  .on('broadcast', { event: 'semantic-number' }, handleBroadcast)
  .subscribe()
```

---

## Component 5: Operational Frame Assembly

### What Medium-LLM Receives
```typescript
interface OperationalFrame {
  character_id: string;
  frame_id: string;
  
  // Position (from coordinates)
  coordinates: {
    spatial: string;      // "12."
    temporal: string;     // "234.1"
  };
  
  // Who's here (from proximity)
  proximity: {
    close: CharacterState[];   // Full state for CLOSE
    nearby: string[];          // Just IDs for NEARBY
  };
  
  // What's relevant (filtered by aperture)
  content: ContentEntry[];
  
  // Attention scope
  aperture: { floor: number; ceiling: number };
  
  // 0.8.5: Quality indicators from determinancy
  interference_quality?: {
    aligned_characters: string[];
    conflicting_characters: string[];
    dominant_events: SemanticNumber[];
  };
  
  compiled_at: string;
}
```

**0.8**: proximity + content + aperture
**0.8.5**: adds interference_quality as hint for Medium-LLM

---

## Data Flow Diagram

### 0.8 (Single Hard-LLM)
```
┌─────────────────────────────────────────────────────────────────┐
│                         FRAME                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Medium-LLM completes synthesis                                  │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────────────────────────────┐                   │
│  │           SINGLE HARD-LLM                 │                   │
│  │                                           │                   │
│  │  Reads: Skills, Narrative, Coordinates    │                   │
│  │  Decides: Movement, Proximity, Relevance  │                   │
│  │  Outputs: Updated coordinates, frames     │                   │
│  │                                           │                   │
│  └──────────────────────────────────────────┘                   │
│       │                                                          │
│       ├──────────────┬──────────────┐                           │
│       ▼              ▼              ▼                            │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐                        │
│  │Marcus's │   │Elara's  │   │NPC's    │                        │
│  │Op Frame │   │Op Frame │   │Op Frame │                        │
│  └─────────┘   └─────────┘   └─────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 0.8.5 (Per-User Hard-LLM)
```
┌─────────────────────────────────────────────────────────────────┐
│                         FRAME                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Marcus                              Elara                       │
│  ┌──────────┐                       ┌──────────┐                │
│  │Medium-LLM│                       │Medium-LLM│                │
│  └────┬─────┘                       └────┬─────┘                │
│       │ narrative                        │ narrative            │
│       ▼                                  ▼                       │
│  ┌──────────┐    BROADCASTS        ┌──────────┐                 │
│  │ Hard-LLM │◄────────────────────►│ Hard-LLM │                 │
│  │  Marcus  │  semantic-numbers    │  Elara   │                 │
│  └────┬─────┘                       └────┬─────┘                │
│       │                                  │                       │
│       │ coordinates                      │ coordinates          │
│       │ proximity                        │ proximity            │
│       │ interference quality             │ interference quality │
│       ▼                                  ▼                       │
│  ┌─────────┐                        ┌─────────┐                 │
│  │Marcus's │                        │Elara's  │                 │
│  │Op Frame │                        │Op Frame │                 │
│  └─────────┘                        └─────────┘                 │
│                                                                  │
│  NO CENTRAL COORDINATOR - coherence from local exchange         │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Self-Organizing Problem (0.8.5)

### How Hard-LLMs Find Each Other

**Option A: Coordinate Indexing**
- Register coordinates in shared table
- Query: "Who has spatial prefix overlap with me?"
- Works for millions (indexed query, not full scan)

**Option B: Regional Channels**
- Supabase Realtime channel per cosmology region
- Broadcast semantic-numbers to region
- Only proximate Hard-LLMs listen to same channel

**Option C: Hybrid**
- Coordinate query for discovery
- Direct channel for ongoing coordination

### Scaling Properties

| Players | Hard-LLMs | Coordination |
|---------|-----------|--------------|
| 10 | 10 | All can query all |
| 1,000 | 1,000 | Regional channels |
| 1,000,000 | 1,000,000 | O(k) where k = local group (2-10) |

**The trick**: Each Hard-LLM only coordinates with proximate others. Global coherence emerges from overlapping local coordination.

---

## Migration Path

### 0.8 Database (Already Applied)
```sql
-- cosmologies, characters, character_coordinates, 
-- character_proximity, character_context
-- All exist from current migration
```

### 0.8 Additions
```sql
-- Semantic-number storage (created but optional for 0.8)
CREATE TABLE semantic_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frame_id UUID REFERENCES frames(id),
  character_id UUID REFERENCES characters(id),
  vector_sequence JSONB NOT NULL,
  pure_number NUMERIC,
  source_type TEXT,
  source_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE semantic_relationships (
  source_sn_id UUID REFERENCES semantic_numbers(id),
  target_sn_id UUID REFERENCES semantic_numbers(id),
  relation_type TEXT,
  weight FLOAT,
  pscale_overlap INTEGER[],
  PRIMARY KEY (source_sn_id, target_sn_id, relation_type)
);
```

### 0.8.5 Additions
```sql
-- Per-character determinancy state
CREATE TABLE character_determinancy (
  character_id UUID PRIMARY KEY REFERENCES characters(id),
  local_cloud JSONB,              -- Own semantic-numbers
  nearby_cloud JSONB,             -- Received from others
  interference_state JSONB,       -- Current quality indicators
  last_exchange TIMESTAMPTZ
);

-- Add interference quality to proximity
ALTER TABLE character_proximity 
  ADD COLUMN interference_quality JSONB;

-- Enable realtime for Hard-LLM broadcasts
ALTER PUBLICATION supabase_realtime ADD TABLE character_determinancy;
```

---

## Implementation Order

### 0.8 (Skill-Driven Single Hard-LLM)

1. Create skill documents in database
   - `hard/proximity.md`
   - `hard/movement.md`
   - `hard/aperture.md`
   - `hard/relevance.md`
   - `hard/frame-assembly.md`
   - `hard/semantic-extraction.md`

2. Build single `hard-llm` edge function
   - Load skills
   - Gather context (coordinates, cosmology, content)
   - Invoke Claude with extended thinking
   - Parse structured output
   - Apply updates

3. Create semantic-number tables (empty, for extension)

4. Integrate with synthesis flow
   - After Medium-LLM: trigger hard-llm
   - Before Medium-LLM: fetch operational frame

5. Test: Convergence scenario

### 0.8.5 (Per-User Hard-LLM)

1. Add coordination skills
   - `hard/coordination.md`
   - `hard/interference.md`
   - `hard/broadcast.md`

2. Create character_determinancy table

3. Modify edge function for per-user invocation

4. Implement broadcast channels (Supabase Realtime)

5. Add interference_quality to operational frames

6. Test: Interference scenario (P0 vs P-3 actions)

---

## Success Criteria

### 0.8 Convergence Test

1. Marcus (spatial: "11.") and Elara (spatial: "12.") start NEARBY
2. Medium-LLM generates: "Marcus walks into the kitchen"
3. Hard-LLM (reading skills) determines coordinate change
4. Marcus updates to "12."
5. Proximity recalculates: 2 digit overlap → CLOSE
6. Both included in next synthesis

### 0.8.5 Interference Test

1. Marcus commits P0 action ("prolonged conversation with innkeeper")
2. Elara commits P-3 action ("pickpocket the distracted merchant")
3. Marcus's Hard-LLM extracts semantic-number, broadcasts
4. Elara's Hard-LLM receives, notes event context
5. Elara's operational frame includes interference_quality:
   - `dominant_events`: Marcus's conversation
   - `aligned`: true (distraction helps theft)
6. Elara's Medium-LLM uses quality indicator for narrative nuance

---

## Key Distinctions

| Concern | Hard-LLM Domain | Medium-LLM Domain |
|---------|-----------------|-------------------|
| Who CAN interact | ✓ Coordinates | — |
| Who IS interacting | — | ✓ Narrative |
| Spatial proximity | ✓ Prefix overlap | — |
| Temporal proximity | ✓ Prefix overlap | — |
| Event interference | Quality indicator | ✓ Narrative use |
| Fine distinctions in room | — | ✓ Embodied perspective |
| Getting to same room | ✓ Navigation | — |

**Hard-LLM**: Across the entire universe, get characters into the same room.
**Medium-LLM**: In that room, generate what they experience.

---

## Open Questions (Deferred to 0.8.5+)

1. **Broadcast frequency**: Every action? Every N seconds? On significant events only?

2. **Channel topology**: One channel per cosmology? Per region? Per pscale band?

3. **Interference decay**: Do old semantic-numbers fade? How quickly?

4. **Purpose trees**: When do character purposes update? (May be 0.9 scope)

5. **Cross-face coordination**: How does author Hard-LLM interact with player Hard-LLM? (May be 1.0 scope)

---

*"The murmuration emerges not from simulation but from simple rules creating complex beauty."*
