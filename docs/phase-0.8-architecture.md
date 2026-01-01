# Phase 0.8: Hard-LLM & Narrative Aperture (Revised)

**Status**: ⏳ PLANNED  
**Depends on**: 0.7 (commit triggers synthesis, shared solid)  
**Revision**: Corrected pscale coordinate model per `pscale-coordinates-implementation.md`

---

## Read First (in order)

1. `pscale-coordinates-implementation.md` — **CRITICAL**: Coordinates are hierarchical strings, not integers
2. `frame-lamina-aperture.md` — Frame is Hard-LLM's OUTPUT, not container
3. `plex-1-specification.md` — Kernel architecture

---

## What 0.8 Solves

**v3 Problem**: Dumping all context into Medium-LLM produces grinding prose.

**0.8 Solution**: Hard-LLM filters context before Medium-LLM sees it.

**How**: Pscale coordinates locate characters; narrative aperture filters content; proximity determines who synthesizes together.

---

## Core Concepts

### Pscale Coordinates (Hierarchical Strings)

Each coordinate is a string where digit **position** = pscale level, digit **value** = semantic ID:

```
Spatial: "13.4"
         │││ └─ pscale -1: digit 4 = {fireplace}
         ││└─── pscale 0:  digit 3 = {kitchen}
         │└──── pscale +1: digit 1 = {keep}
         └───── decimal separates room (0) from furniture (-1)

Temporal: "348.1"
          ││││ └─ pscale -1: digit 1 = {minute-1}
          │││└─── pscale 0:  digit 8 = {block-8} (40-50 mins)
          ││└──── pscale +1: digit 4 = {hour-4}
          │└───── pscale +2: digit 3 = {day-3}
          └────── decimal separates 5-10min block (0) from minute (-1)
```

The digit **value** is arbitrary until mapped via cosmology tabulation. `1` means "keep" because the Author defined it so.

### Aperture (Attention Scope)

Aperture is a **range** (floor, ceiling) defining what pscale levels are visible from a position:

```typescript
interface Aperture {
  floor: number;    // -2 = can see object details
  ceiling: number;  // +1 = can see building context
}
```

A character at `"13.4"` with aperture `{floor: -1, ceiling: 0}` sees:
- The fireplace they're at (-1) ✓
- The kitchen they're in (0) ✓
- NOT the keep layout (+1) ✗
- NOT items on the mantle (-2) ✗

### Proximity via Prefix Overlap

Characters are **close** when their coordinates share a prefix:

```
Character A: spatial = "13.4"  (keep, kitchen, fireplace)
Character B: spatial = "13.2"  (keep, kitchen, window)
Shared prefix: "13" → 2 digits → CLOSE

Character C: spatial = "14."   (keep, bedroom)
Shared prefix: "1" → 1 digit → NEARBY

Character D: spatial = "21."   (tower, armory)
Shared prefix: "" → 0 digits → DISTANT
```

---

## What We're Building

| Component | Purpose | Priority |
|-----------|---------|----------|
| **Character Coordinates** | Track where each character IS | Core |
| **Coordinate Update** | Hard-LLM parses narrative → updates position | Core |
| **Proximity Discovery** | Calculate who's close via prefix overlap | Core |
| **Aperture Calculation** | Determine attention scope from action context | Core |
| **Content Filtering** | Select relevant content by coordinate + aperture | Core |
| **Frame Compilation** | Assemble operational context for Medium-LLM | Core |

**Deferred to 0.8.5:**
- Identity coordinate tracking (group dynamics)
- Procedural content generation (Author-LLM)
- Determinancy cloud calculation

---

## Data Model

### New Tables

```sql
-- ============================================================
-- COSMOLOGIES: Fictional worlds with semantic tabulations
-- ============================================================
CREATE TABLE cosmologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  physics_rules TEXT,  -- 'magical', 'realistic', 'sci-fi'
  
  -- Semantic mappings: digit → name at each pscale level
  spatial_tabulation JSONB DEFAULT '{}',
  temporal_tabulation JSONB DEFAULT '{}',
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CHARACTERS: Player vessels and NPCs
-- ============================================================
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cosmology_id UUID NOT NULL REFERENCES cosmologies(id),
  created_by UUID REFERENCES users(id),
  inhabited_by UUID REFERENCES users(id),  -- NULL = NPC/auto-PC
  name TEXT NOT NULL,
  description TEXT,
  is_npc BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CHARACTER_COORDINATES: Current position (Hard-LLM updates)
-- ============================================================
CREATE TABLE character_coordinates (
  character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  frame_id UUID NOT NULL REFERENCES frames(id),
  
  -- Pscale coordinates (hierarchical strings, NOT integers)
  spatial TEXT NOT NULL DEFAULT '0.',
  temporal TEXT NOT NULL DEFAULT '0.',
  
  -- Current attention focus
  focus TEXT,
  
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT DEFAULT 'system'  -- 'hard-llm', 'player-action', 'system'
);

-- ============================================================
-- CHARACTER_PROXIMITY: Discovered relationships
-- ============================================================
CREATE TABLE character_proximity (
  character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  close UUID[] DEFAULT '{}',    -- ≥2 digit prefix overlap
  nearby UUID[] DEFAULT '{}',   -- 1 digit prefix overlap
  distant UUID[] DEFAULT '{}',  -- 0 digits, same cosmology
  coordinated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CHARACTER_CONTEXT: Hard-LLM output (operational frame cache)
-- ============================================================
CREATE TABLE character_context (
  character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  frame_id UUID NOT NULL REFERENCES frames(id),
  
  -- Assembled operational context
  context_content JSONB NOT NULL DEFAULT '{}',
  
  -- Aperture used for filtering
  aperture_floor INTEGER,
  aperture_ceiling INTEGER,
  
  compiled_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- ============================================================
-- Realtime subscriptions for Hard-LLM coordination
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE character_coordinates;
ALTER PUBLICATION supabase_realtime ADD TABLE character_proximity;

-- ============================================================
-- Indexes for proximity discovery
-- ============================================================
CREATE INDEX idx_coords_spatial 
  ON character_coordinates(frame_id, spatial text_pattern_ops);
CREATE INDEX idx_coords_temporal 
  ON character_coordinates(frame_id, temporal text_pattern_ops);
CREATE INDEX idx_proximity_close 
  ON character_proximity USING GIN(close);
```

### Modified Tables

```sql
-- Add cosmology reference to frames
ALTER TABLE frames 
  ADD COLUMN IF NOT EXISTS cosmology_id UUID REFERENCES cosmologies(id);

-- Clarify shelf column (rename for clarity)
ALTER TABLE shelf 
  RENAME COLUMN pscale_aperture TO action_pscale;

COMMENT ON COLUMN shelf.action_pscale IS
  'What pscale level is this action operating at? -1=furniture, 0=room, +2=neighborhood';

-- Add proper coordinate structure to content
ALTER TABLE content 
  ADD COLUMN IF NOT EXISTS spatial TEXT,
  ADD COLUMN IF NOT EXISTS temporal TEXT,
  ADD COLUMN IF NOT EXISTS pscale_floor INTEGER,
  ADD COLUMN IF NOT EXISTS pscale_ceiling INTEGER,
  ADD COLUMN IF NOT EXISTS cosmology_id UUID REFERENCES cosmologies(id);

-- Deprecate old column (keep for backwards compat, stop using)
COMMENT ON COLUMN content.pscale_aperture IS
  'DEPRECATED: Use pscale_floor and pscale_ceiling instead';
```

---

## Hard-LLM Operations

### Operation 1: Update Coordinates

**Trigger**: After Medium-LLM synthesis  
**Input**: Character's current coordinates, recent narrative, cosmology tabulation  
**Output**: Updated coordinates (if movement detected)

See `hard-llm-coordinate-extraction-skills.md` for detailed prompt templates.

```typescript
interface CoordinateUpdateInput {
  character_id: string;
  current_spatial: string;
  current_temporal: string;
  narrative: string;
  cosmology: {
    spatial_tabulation: SemanticTabulation;
    temporal_tabulation: SemanticTabulation;
  };
}

interface CoordinateUpdateOutput {
  spatial_changed: boolean;
  temporal_changed: boolean;
  new_spatial?: string;
  new_temporal?: string;
  reasoning: string;
}
```

### Operation 2: Discover Proximity

**Trigger**: After coordinates update  
**Input**: Character's coordinates, frame_id  
**Output**: Updated proximity lists

```typescript
async function discoverProximity(
  characterId: string,
  frameId: string,
  mySpatial: string
): Promise<CharacterProximity> {
  // Query other characters in same frame
  const others = await supabase
    .from('character_coordinates')
    .select('character_id, spatial, temporal')
    .eq('frame_id', frameId)
    .neq('character_id', characterId);
  
  const close: string[] = [];
  const nearby: string[] = [];
  const distant: string[] = [];
  
  for (const other of others.data || []) {
    const overlap = sharedPrefixLength(mySpatial, other.spatial);
    
    if (overlap >= 2) close.push(other.character_id);
    else if (overlap >= 1) nearby.push(other.character_id);
    else distant.push(other.character_id);
  }
  
  return { character_id: characterId, close, nearby, distant, coordinated_at: new Date().toISOString() };
}
```

### Operation 3: Calculate Aperture

**Trigger**: When compiling operational frame  
**Input**: Recent action's pscale level  
**Output**: Aperture range

```typescript
function calculateAperture(actionPscale: number): Aperture {
  // Aperture centers on action level, extends 2 levels each direction
  return {
    floor: actionPscale - 2,
    ceiling: actionPscale + 2
  };
}

// Combat action (action_pscale = -1, furniture level)
// → Aperture: { floor: -3, ceiling: +1 }
// → Sees: cellular detail to building context

// Journey action (action_pscale = +2, neighborhood level)  
// → Aperture: { floor: 0, ceiling: +4 }
// → Sees: room to regional context
```

### Operation 4: Filter Content

**Trigger**: When compiling operational frame  
**Input**: Character coordinates, aperture, all content in cosmology  
**Output**: Relevant content entries

```typescript
function filterContent(
  characterSpatial: string,
  aperture: Aperture,
  allContent: ContentEntry[]
): ContentEntry[] {
  return allContent.filter(content => {
    // Spatial relevance: any prefix overlap
    const spatialOverlap = sharedPrefixLength(characterSpatial, content.spatial || '') > 0;
    
    // Aperture relevance: content's pscale range overlaps aperture
    const contentFloor = content.pscale_floor ?? -10;
    const contentCeiling = content.pscale_ceiling ?? 10;
    const apertureOverlap = 
      contentFloor <= aperture.ceiling && 
      contentCeiling >= aperture.floor;
    
    return spatialOverlap && apertureOverlap;
  });
}
```

### Operation 5: Compile Operational Frame

**Trigger**: Before Medium-LLM synthesis  
**Input**: Character ID, frame ID  
**Output**: Complete operational context

```typescript
interface OperationalFrame {
  character_id: string;
  frame_id: string;
  
  // Current position
  coordinates: {
    spatial: string;
    temporal: string;
  };
  
  // Who's here
  proximity: {
    close: CharacterState[];   // Full state for close characters
    nearby: string[];          // Just IDs for nearby
  };
  
  // What's relevant
  content: ContentEntry[];
  
  // Attention scope used
  aperture: Aperture;
  
  compiled_at: string;
}

async function compileFrame(characterId: string): Promise<OperationalFrame> {
  // 1. Get character's coordinates
  const coords = await getCharacterCoordinates(characterId);
  
  // 2. Get proximity
  const proximity = await getCharacterProximity(characterId);
  
  // 3. Get recent action pscale from latest shelf entry
  const recentAction = await getRecentAction(characterId);
  const aperture = calculateAperture(recentAction?.action_pscale ?? 0);
  
  // 4. Filter content
  const allContent = await getCosmologyContent(coords.frame_id);
  const relevantContent = filterContent(coords.spatial, aperture, allContent);
  
  // 5. Get close character states
  const closeStates = await Promise.all(
    proximity.close.map(id => getCharacterState(id))
  );
  
  return {
    character_id: characterId,
    frame_id: coords.frame_id,
    coordinates: {
      spatial: coords.spatial,
      temporal: coords.temporal
    },
    proximity: {
      close: closeStates,
      nearby: proximity.nearby
    },
    content: relevantContent,
    aperture,
    compiled_at: new Date().toISOString()
  };
}
```

---

## Integration with 0.7

### What 0.7 Provides

- Commit triggers Medium-LLM synthesis
- Single synthesis per frame (all committed liquid)
- Shared solid for all participants

### What 0.8 Adds

- Characters have coordinates (spatial, temporal)
- Only `close` characters synthesize together
- Medium-LLM receives filtered content (not everything)
- Hard-LLM runs after synthesis to update coordinates

### Modified Synthesis Flow

```
0.7 Flow (current):
  Commit → Gather ALL liquid → Medium-LLM → Solid

0.8 Flow (new):
  Commit → 
    For each committing character:
      → Hard-LLM compiles operational frame
      → Filter to close characters only
    → Medium-LLM synthesizes per-blob
    → Solid (per blob)
    → Hard-LLM updates coordinates post-synthesis
```

---

## Test: The Convergence Test

**Setup:**
1. Frame `test-frame` with cosmology `test-world`
2. Cosmology tabulation: `{"+1": {"1": "inn"}, "0": {"1": "common-room", "2": "kitchen"}}`
3. Character A at spatial `"11."` (inn, common-room)
4. Character B at spatial `"12."` (inn, kitchen)

**Test sequence:**
1. Initial state: A and B share prefix `"1"` → 1 digit → **NEARBY**
2. Player A commits: "I walk into the kitchen looking for ale"
3. Hard-LLM parses: movement detected, A's spatial → `"12."`
4. Proximity recalculated: `"12."` vs `"12."` → 2 digits → **CLOSE**
5. A.close = [B], B.close = [A]
6. Player B commits: "I pour two mugs from the barrel"
7. Both A and B are close → synthesize together
8. Both see shared solid: "Marcus enters the kitchen as Elara pours ale..."

---

## Implementation Order

| Step | Component | Description |
|------|-----------|-------------|
| 1 | Migration | Create cosmologies, characters, character_* tables |
| 2 | Migration | Modify frames, shelf, content |
| 3 | Types | Add TypeScript types to `src/types/` |
| 4 | Utils | Create `src/utils/pscale.ts` with coordinate functions |
| 5 | Edge Function | `hard-llm-coordinate-update` |
| 6 | Edge Function | `hard-llm-proximity-discover` |
| 7 | Edge Function | `hard-llm-frame-compile` |
| 8 | Integration | Modify synthesis flow to use proximity |
| 9 | Frontend | Debug view for coordinates/proximity |
| 10 | Test | Run Convergence Test |

---

## Success Criteria

1. **Coordinates track**: Character movement updates spatial/temporal strings
2. **Prefix overlap works**: `"13.4"` vs `"13.2"` correctly yields `close`
3. **Proximity emerges**: Characters with overlapping coordinates become close
4. **Aperture filters**: Medium-LLM receives appropriate content subset
5. **Blobs form**: Only close characters synthesize together
6. **No grinding prose**: Filtered context produces focused narrative
7. **Convergence Test passes**: Two characters can find each other

---

## Related Documents

- `pscale-coordinates-implementation.md` — Coordinate system specification
- `hard-llm-coordinate-extraction-skills.md` — How Hard-LLM parses narrative
- `pscale-spine.md` — Conceptual foundation
- `frame-lamina-aperture.md` — Frame as Hard-LLM output
- `plex-1-specification.md` — Kernel architecture
- `phase-0.7-architecture.md` — What 0.8 builds on
