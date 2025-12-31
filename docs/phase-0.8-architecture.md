# Phase 0.8: Hard-LLM & World Context Architecture

**Status**: ⏳ PLANNED  
**Depends on**: 0.7 (commit triggers synthesis, shared solid)  
**Note**: Does NOT require 0.7.5 (personalized narratives) - builds directly on 0.7

---

## The Core Insight

> "Hard-LLM performs the unenviable task of locating the user in the narrative/content/code space they are operating in."

Hard-LLM is **per-character** (part of each user's soft-medium-hard triad). It:
- Locates the character in pscale space (spatial, temporal, identity)
- Coordinates with OTHER Hard-LLMs to discover proximity
- Filters content so Medium-LLM receives curated context, not everything

This is **not** a centralized process. Proximity **emerges** from Hard-LLM to Hard-LLM coordination - like the murmuration model.

---

## The Problem 0.8 Solves

In v3, we dumped huge amounts of context into the narrative LLM. Result: grinding prose, too long, unfocused.

**0.8 Solution**: Hard-LLM pre-filters content before Medium-LLM ever sees it.

---

## Overview

| Component | Purpose | Priority |
|-----------|---------|----------|
| **Proximity Determination** | Who's close/nearby/distant/far via pscale coordinates | Core |
| **Aperture Filtering** | What content feeds Medium-LLM based on pscale | Core |
| **Hard-LLM Coordination** | How Hard-LLMs find each other | Core |
| **Procedural Content** | Generate missing locations/NPCs | → 0.8.5 (deferred) |

---

## Part I: Pscale Coordinates as Location

### The Three Dimensions

Every character (and every piece of content) has pscale coordinates:

| Dimension | What It Locates | Example Values |
|-----------|-----------------|----------------|
| **Spatial** | Where in the world hierarchy | 0 = room, +3 = city, +6 = nation |
| **Temporal** | When in the action/history | -2 = this moment, +1 = this scene, +4 = this era |
| **Identity** | Who (individual → group → faction) | 0 = individual, +2 = party, +5 = civilization |

### Lamina Structure

```typescript
interface CharacterLamina {
  character_id: string;
  
  // Spatial location
  location_id?: string;           // Content reference
  spatial_pscale: number;         // 0 = room, +3 = city, etc.
  
  // Temporal location  
  temporal_pscale: number;        // Current action scale
  
  // Identity location
  identity_pscale?: number;       // 0 = solo, +2 = party, etc.
  
  // Attention (optional narrowing)
  focus?: string;                 // What they're attending to
}
```

### Content Also Has Pscale

```typescript
interface ContentLamina {
  // What pscale range this content is relevant for
  pscale_floor: number;           // Minimum scale (detail level)
  pscale_ceiling: number;         // Maximum scale (scope level)
  
  // Location in world
  spatial_pscale: number;
  temporal_pscale?: number;       // When this exists/happened
}
```

---

## Part II: Proximity via Pscale Overlap

### How Proximity Emerges

Two characters are **narratively proximate** when their pscale coordinates overlap sufficiently:

```
Character A: spatial=0 (room), temporal=-2 (combat moment)
Character B: spatial=0 (same room), temporal=-2 (same moment)
→ CLOSE: coordinates match closely

Character C: spatial=+1 (building), temporal=-1 (this scene)
→ NEARBY: same building, slightly different focus

Character D: spatial=+3 (city), temporal=0 (this hour)
→ DISTANT: same city, different immediate context
```

### The Four Proximity States

| State | Pscale Overlap | Effect |
|-------|----------------|--------|
| **Close** | Spatial ≤1 apart, temporal ≤1 apart | Actions affect each other directly |
| **Nearby** | Spatial ≤2 apart, temporal ≤2 apart | Outcomes visible but not immediate |
| **Distant** | Spatial ≤4 apart | Context only, events summarized |
| **Far** | Spatial >4 apart | Only high-pscale events propagate |

### Blob Formation

Characters in mutual `close` relationship form a **blob**:
- Their Medium-LLMs coordinate
- They share the same solid narrative
- Their actions resolve together

---

## Part III: Hard-LLM to Hard-LLM Coordination

### The Murmuration Model

Hard-LLMs don't check against a central registry. They **find each other**:

1. Each Hard-LLM publishes its character's pscale coordinates
2. Each Hard-LLM queries for nearby coordinates
3. Overlap determines proximity
4. Proximity lists are mutually updated

```typescript
// Hard-LLM A's perspective
interface HardLLMState {
  my_character_id: string;
  my_coordinates: CharacterLamina;
  
  // Discovered through coordination
  close: string[];      // Other character IDs
  nearby: string[];
  distant: string[];
  
  // Last coordination timestamp
  coordinated_at: string;
}
```

### Convergence & Divergence

**Convergence**: Characters move from `nearby` → `close`
- Hard-LLM detects coordinate overlap after narrative action
- Updates its close list
- Other character's Hard-LLM does the same

**Divergence**: Characters move from `close` → `nearby`
- Hard-LLM detects coordinate separation
- Blob splits

### Blob Representative Optimization

When checking proximity, compare against **one representative per blob**:

```
Nearby: [A, B, C, D, E]
A.close = [B, C]  → A is representative, B and C covered
D.close = [E]     → D is representative, E covered

Representatives: [A, D]  ← only 2 LLM comparisons, not 5
```

---

## Part IV: Aperture Filtering

### The Core Problem

Medium-LLM needs world context. But ALL context = grinding prose.

### The Solution: Pscale Aperture

Hard-LLM determines what content is **in scope** based on character's current pscale:

```typescript
interface ApertureConfig {
  // Spatial filtering
  spatial_floor: number;    // Don't include details smaller than this
  spatial_ceiling: number;  // Don't include context larger than this
  
  // Temporal filtering
  temporal_window: number;  // How far back to include events
  
  // Optional narrowing
  focus_filter?: string;    // Character's current attention
}
```

### Aperture Examples

**Combat moment** (pscale -2):
```typescript
aperture = {
  spatial_floor: -2,    // Include object-level details
  spatial_ceiling: 0,   // Don't include city-level context
  temporal_window: -3   // Only last few seconds relevant
}
```

**Exploring a city** (pscale +2):
```typescript
aperture = {
  spatial_floor: +1,    // Building-level minimum
  spatial_ceiling: +4,  // Regional context
  temporal_window: +1   // Recent events relevant
}
```

### Content Selection

```typescript
function selectContent(
  character: CharacterLamina,
  aperture: ApertureConfig,
  allContent: Content[]
): Content[] {
  return allContent.filter(content => {
    // Spatial match
    const spatialMatch = 
      content.spatial_pscale >= aperture.spatial_floor &&
      content.spatial_pscale <= aperture.spatial_ceiling;
    
    // Location relevance (same branch of world tree)
    const locationRelevant = 
      isInSameLocation(character.location_id, content.id, aperture.spatial_ceiling);
    
    return spatialMatch && locationRelevant;
  });
}
```

---

## Part V: Open Questions

### How Do Frames Relate to Proximity?

This is **not yet resolved**. Possibilities:

1. **Frame as scope**: Hard-LLMs can only see each other within same frame
2. **Frame as configuration**: Frame sets default aperture, proximity operates within
3. **Frame as cosmology boundary**: Characters in different cosmologies can't be close
4. **Proximity independent of frame**: Characters find each other by coordinates alone

**Current assumption**: Frame provides the **pool** of characters whose Hard-LLMs can coordinate. Proximity determines relationships **within** that pool.

### How Does Identity Pscale Work?

Not fully specified. Intuition:
- Identity pscale 0 = individual character
- Identity pscale +2 = party/group acting together
- Identity pscale +5 = faction/nation acting

Higher identity pscale might mean character's actions are **on behalf of** the group, affecting content at that scale.

---

## Part VI: Data Model

### New Tables

```sql
-- Character pscale coordinates (updated by Hard-LLM)
CREATE TABLE character_coordinates (
  character_id UUID PRIMARY KEY REFERENCES characters(id),
  frame_id UUID REFERENCES frames(id),
  
  -- Pscale location
  spatial_pscale INTEGER DEFAULT 0,
  temporal_pscale INTEGER DEFAULT 0,
  identity_pscale INTEGER DEFAULT 0,
  
  -- Content location reference
  location_id UUID REFERENCES content(id),
  
  -- Attention
  focus TEXT,
  
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Character proximity (discovered by Hard-LLM coordination)
CREATE TABLE character_proximity (
  character_id UUID PRIMARY KEY REFERENCES characters(id),
  close UUID[] DEFAULT '{}',
  nearby UUID[] DEFAULT '{}',
  distant UUID[] DEFAULT '{}',
  far UUID[] DEFAULT '{}',
  coordinated_at TIMESTAMPTZ DEFAULT now()
);

-- Cached context for Medium-LLM (compiled by Hard-LLM)
CREATE TABLE character_context (
  character_id UUID PRIMARY KEY REFERENCES characters(id),
  frame_id UUID REFERENCES frames(id),
  
  -- Filtered content
  context_content JSONB NOT NULL,
  
  -- Aperture used
  aperture_config JSONB,
  
  compiled_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ  -- Context goes stale
);

-- Enable realtime for coordination
ALTER PUBLICATION supabase_realtime ADD TABLE character_coordinates;
ALTER PUBLICATION supabase_realtime ADD TABLE character_proximity;
```

### Indexes

```sql
-- For Hard-LLM coordinate discovery
CREATE INDEX character_coordinates_frame 
  ON character_coordinates(frame_id, spatial_pscale);

-- For proximity lookups
CREATE INDEX character_proximity_close 
  ON character_proximity USING GIN(close);
```

---

## Part VII: Hard-LLM Operations

### Operation 1: Update Coordinates

After synthesis, Hard-LLM analyzes narrative to update character's position:

```typescript
interface CoordinateUpdateInput {
  character_id: string;
  recent_narrative: string;     // What just happened
  current_coordinates: CharacterLamina;
}

interface CoordinateUpdateOutput {
  new_coordinates: CharacterLamina;
  movement_detected: boolean;
  reasoning: string;
}
```

### Operation 2: Discover Proximity

Hard-LLM queries for other characters with overlapping coordinates:

```typescript
interface ProximityDiscoveryInput {
  character_id: string;
  my_coordinates: CharacterLamina;
  frame_id: string;             // Scope of discovery
}

interface ProximityDiscoveryOutput {
  close: string[];
  nearby: string[];
  distant: string[];
  changed: boolean;
}
```

### Operation 3: Compile Context

Hard-LLM filters content for Medium-LLM:

```typescript
interface ContextCompileInput {
  character_id: string;
  coordinates: CharacterLamina;
  proximity: { close: string[], nearby: string[] };
}

interface ContextCompileOutput {
  content: ContentEntry[];      // Filtered content
  close_character_states: any[]; // What close characters are doing
  aperture_used: ApertureConfig;
}
```

---

## Part VIII: Integration with 0.7

### What 0.7 Provides

- Commit triggers synthesis
- Single Medium-LLM per frame
- Shared solid for all participants
- Liquid table with committed entries

### What 0.8 Adds

- Multiple characters can be in same frame
- Hard-LLM determines who's "close"
- Close characters' actions coordinate in Medium-LLM
- Hard-LLM filters content by pscale aperture
- Medium-LLM receives curated context

### Modified Gather.ts

```typescript
// gather.ts with 0.8

async function gatherContext(
  frameId: string,
  committedLiquid: LiquidEntry[]
): Promise<SynthesisContext> {
  
  // Get character IDs from committed entries
  const characterIds = committedLiquid.map(l => l.character_id);
  
  // NEW: Check if characters are close
  const proximityGroups = await getProximityGroups(characterIds);
  
  // Only synthesize together if in same blob
  const closeGroup = proximityGroups.find(g => 
    characterIds.every(id => g.includes(id))
  );
  
  if (!closeGroup) {
    // Characters not close - synthesize separately
    // (or queue for later when they converge)
  }
  
  // NEW: Get Hard-LLM compiled context for the group
  const worldContext = await getCompiledContext(closeGroup[0]);
  
  return {
    liquid: committedLiquid,
    worldContext,
    participants: closeGroup
  };
}
```

---

## Part IX: Implementation Order

### 0.8 Core (Proximity + Aperture)

1. **Database**: Create character_coordinates table
2. **Database**: Create character_proximity table  
3. **Database**: Create character_context table
4. **Edge Function**: Create hard-llm-coordinate-update
5. **Edge Function**: Create hard-llm-proximity-discover
6. **Edge Function**: Create hard-llm-context-compile
7. **Integration**: Modify gather.ts to use proximity
8. **Integration**: Modify gather.ts to use compiled context
9. **Trigger**: Call Hard-LLM after Medium-LLM synthesis
10. **Frontend**: Debug view for coordinates/proximity
11. **Test**: Two characters converge when entering same room

### 0.8.5 (Procedural Content) - DEFERRED

- Author-LLM generates missing content
- Determinancy tracking
- Content gap detection

---

## Part X: Success Criteria

1. **Coordinates track**: Character movement updates pscale coordinates
2. **Proximity emerges**: Characters with overlapping coordinates become close
3. **Blobs form**: Close characters' actions coordinate in synthesis
4. **Aperture filters**: Medium-LLM receives appropriate content, not everything
5. **No grinding prose**: Narrative stays focused due to filtered context
6. **Performance**: Hard-LLM background doesn't block player experience

### The Convergence Test

1. Two players start in same frame, different rooms (nearby)
2. Player A moves toward Player B's room
3. Hard-LLM detects coordinate overlap
4. Both become close
5. Next commit from either triggers synthesis including both
6. Both see shared solid narrative

---

## Part XI: Key Quotes

From onen_v4_synthesis:
> "Hard-LLM operates in background. Maintains coherence across the entire system. Exchanges semantic coordinates with other Hard-LLMs."

From soft_medium_coordination_architecture:
> "Hard-LLM (proximity + world): Maintains semantic proximity networks (close/nearby/distant/far)"

From plex-1-specification:
> "Hard-LLM: Independent per character, healthy redundancy/convergence"
