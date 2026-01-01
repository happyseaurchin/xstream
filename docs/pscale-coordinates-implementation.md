# Pscale Coordinates: Implementation Specification

**Purpose**: Canonical reference for implementing pscale coordinates in Xstream  
**Companion to**: `pscale-spine.md` (conceptual), `phase-0.8-architecture.md` (build spec)

---

## Core Concept

Pscale coordinates are **hierarchical strings** where:
- Each **digit position** corresponds to a pscale level (power of 10)
- Each **digit value** is a semantic ID at that level
- The **decimal point** separates pscale 0 (magnitude point) from negative pscale

```
Coordinate: "13.4"

Position:   [1]    [3]    .    [4]
Pscale:     +1     0           -1
Semantic:   {keep} {kitchen}   {fireplace}

Human reads: "the fireplace in the kitchen of the keep"
```

---

## The Three Coordinate Dimensions

| Dimension | What It Locates | Pscale 0 Meaning | Decimal Separates |
|-----------|-----------------|------------------|-------------------|
| **Spatial** | Where | Room | Room (0) from furniture (-1) |
| **Temporal** | When | 5-10 minute block | Block (0) from minute (-1) |
| **Identity** | Who | Individual | Individual (0) from sub-individual states (-1) |

### Spatial Coordinate Examples

```
"1."      = {keep} — at building level, no room specified
"13."     = {keep}{kitchen} — in the kitchen, no furniture focus
"13.4"    = {keep}{kitchen}.{fireplace} — at the fireplace
"13.42"   = {keep}{kitchen}.{fireplace}{mantle} — on the mantle
"213."    = {region}{keep}{kitchen} — with regional context
```

### Temporal Coordinate Examples

```
"3."      = {day-3} — on the third day, no finer detail
"34."     = {day-3}{hour-4} — third day, fourth hour
"348."    = {day-3}{hour-4}{block-8} — specific 5-10 min block
"348.1"   = {day-3}{hour-4}{block-8}.{minute-1} — first minute of that block
```

### Identity Coordinate Examples (deferred to 0.8.5)

```
"5."      = {tamor-tribe} — tribal identity only
"54."     = {tamor-tribe}{brothers-family} — family within tribe
"543."    = {tamor-tribe}{brothers-family}{third-brother} — specific individual
"543.2"   = {tamor-tribe}{brothers-family}{third-brother}.{focused-state} — psychological state
```

---

## Coordinate vs Aperture

These are **different concepts**:

| Concept | Type | What It Does | Example |
|---------|------|--------------|--------|
| **Coordinate** | String | Locates WHERE/WHEN/WHO | `"13.4"` |
| **Aperture** | Range (floor, ceiling) | Filters what's VISIBLE from a location | `{floor: -1, ceiling: +1}` |

**Coordinate** = objective position in psycho-social space  
**Aperture** = subjective scope of attention from that position

### Aperture as Attention Filter

A character at coordinate `"13.4"` (fireplace in kitchen of keep) with aperture `{floor: -2, ceiling: 0}`:
- **Sees**: objects on mantle (-2), the fireplace itself (-1), the room (0)
- **Doesn't see**: the building layout (+1), the surrounding region (+2)

The same character with aperture `{floor: 0, ceiling: +2}`:
- **Sees**: the room (0), the building (keep) (+1), nearby structures (+2)
- **Doesn't see**: fireplace details (-1), object details (-2)

---

## Semantic Tabulation

Digit values are **arbitrary** until mapped to semantics. Each cosmology defines its own tabulation:

```typescript
interface SemanticTabulation {
  [pscaleLevel: string]: {
    [digit: string]: string;
  };
}

// Example for a fantasy keep:
const keepTabulation: SemanticTabulation = {
  "+2": { "1": "kingdom", "2": "wilderness" },
  "+1": { "1": "keep", "2": "tower", "3": "village", "4": "forest" },
  "0":  { "1": "great-hall", "2": "armory", "3": "kitchen", "4": "bedroom", "5": "dungeon" },
  "-1": { "1": "throne", "2": "fireplace", "3": "window", "4": "table", "5": "door" }
};
```

### Decoding a Coordinate

```typescript
function decodeCoordinate(
  coord: string, 
  tabulation: SemanticTabulation
): string[] {
  const [intPart, decPart] = coord.split('.');
  const result: string[] = [];
  
  // Positive pscale (left of decimal)
  for (let i = 0; i < intPart.length; i++) {
    const pscale = intPart.length - 1 - i;  // Rightmost is pscale 0
    const digit = intPart[i];
    const name = tabulation[`+${pscale}`]?.[digit] || tabulation[`${pscale}`]?.[digit];
    if (name) result.push(name);
  }
  
  // Negative pscale (right of decimal)
  if (decPart) {
    for (let i = 0; i < decPart.length; i++) {
      const pscale = -(i + 1);
      const digit = decPart[i];
      const name = tabulation[`${pscale}`]?.[digit];
      if (name) result.push(name);
    }
  }
  
  return result;
}

// decodeCoordinate("13.4", keepTabulation)
// → ["keep", "kitchen", "fireplace"]
```

---

## Proximity Calculation

Characters are **narratively proximate** when their coordinates share a common prefix.

### Prefix Overlap Algorithm

```typescript
/**
 * Calculate shared prefix length between two coordinates.
 * Counts matching digits from left, stopping at first mismatch.
 * Decimal point must match but doesn't count toward length.
 */
function sharedPrefixLength(coordA: string, coordB: string): number {
  // Normalize: ensure decimal point present
  const a = coordA.includes('.') ? coordA : coordA + '.';
  const b = coordB.includes('.') ? coordB : coordB + '.';
  
  let shared = 0;
  const minLen = Math.min(a.length, b.length);
  
  for (let i = 0; i < minLen; i++) {
    if (a[i] !== b[i]) break;
    if (a[i] !== '.') shared++;  // Don't count decimal
  }
  
  return shared;
}
```

### Proximity States

| Shared Digits | State | Narrative Meaning |
|---------------|-------|-------------------|
| ≥2 | **close** | Same room or immediate vicinity; actions coordinate |
| 1 | **nearby** | Same building or adjacent; outcomes visible |
| 0 | **distant** | Same region; only major events propagate |
| (different cosmology) | **far** | No narrative connection |

```typescript
type ProximityState = 'close' | 'nearby' | 'distant' | 'far';

function spatialProximity(coordA: string, coordB: string): ProximityState {
  const shared = sharedPrefixLength(coordA, coordB);
  if (shared >= 2) return 'close';
  if (shared >= 1) return 'nearby';
  return 'distant';
}
```

### Combined Proximity (Spatial + Temporal)

Characters must be proximate in **both** space and time to interact:

```typescript
function areProximate(
  a: { spatial: string; temporal: string },
  b: { spatial: string; temporal: string }
): ProximityState {
  const spatialState = spatialProximity(a.spatial, b.spatial);
  const temporalState = spatialProximity(a.temporal, b.temporal);  // Same algorithm
  
  // Return the worse of the two
  const rank = { close: 0, nearby: 1, distant: 2, far: 3 };
  const worst = Math.max(rank[spatialState], rank[temporalState]);
  
  return Object.entries(rank).find(([, v]) => v === worst)![0] as ProximityState;
}
```

---

## Coordinate Validation

Coordinates must follow format: `digits` + optional (`.` + `digits`)

```typescript
const COORDINATE_PATTERN = /^[0-9]+\.?[0-9]*$/;

function isValidCoordinate(coord: string): boolean {
  if (!COORDINATE_PATTERN.test(coord)) return false;
  if (coord.startsWith('.')) return false;  // Must have integer part
  return true;
}

// Valid: "1.", "13.", "13.4", "13.42", "0.", "0.1"
// Invalid: ".4", "13..4", "1a.4", "", "."
```

---

## Database Schema

### Core Tables

```sql
-- Cosmologies: fictional worlds with semantic tabulations
CREATE TABLE cosmologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  
  -- Semantic mappings: digit → name at each pscale level
  spatial_tabulation JSONB DEFAULT '{}',
  temporal_tabulation JSONB DEFAULT '{}',
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Characters: vessels for players
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cosmology_id UUID NOT NULL REFERENCES cosmologies(id),
  created_by UUID REFERENCES users(id),
  inhabited_by UUID REFERENCES users(id),  -- NULL = NPC
  name TEXT NOT NULL,
  description TEXT,
  is_npc BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Character coordinates: current position (updated by Hard-LLM)
CREATE TABLE character_coordinates (
  character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  frame_id UUID NOT NULL REFERENCES frames(id),
  
  -- Pscale coordinates (hierarchical strings)
  spatial TEXT NOT NULL DEFAULT '0.',
  temporal TEXT NOT NULL DEFAULT '0.',
  
  -- Optional attention focus
  focus TEXT,
  
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT DEFAULT 'system'  -- 'hard-llm', 'player-action', 'system'
);

-- Character proximity: discovered relationships
CREATE TABLE character_proximity (
  character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  close UUID[] DEFAULT '{}',
  nearby UUID[] DEFAULT '{}',
  distant UUID[] DEFAULT '{}',
  coordinated_at TIMESTAMPTZ DEFAULT now()
);

-- Character context: Hard-LLM output (operational frame)
CREATE TABLE character_context (
  character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  frame_id UUID NOT NULL REFERENCES frames(id),
  context_content JSONB NOT NULL DEFAULT '{}',
  aperture_floor INTEGER,
  aperture_ceiling INTEGER,
  compiled_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);
```

### Indexes for Proximity Discovery

```sql
-- Pattern matching on spatial prefix
CREATE INDEX idx_coords_spatial ON character_coordinates(frame_id, spatial text_pattern_ops);

-- Pattern matching on temporal prefix  
CREATE INDEX idx_coords_temporal ON character_coordinates(frame_id, temporal text_pattern_ops);

-- GIN index for proximity array lookups
CREATE INDEX idx_proximity_close ON character_proximity USING GIN(close);
```

### Realtime Subscriptions

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE character_coordinates;
ALTER PUBLICATION supabase_realtime ADD TABLE character_proximity;
```

---

## TypeScript Types

```typescript
// ============================================================
// COORDINATE TYPES
// ============================================================

/**
 * Pscale coordinate string.
 * Format: digits + optional decimal + digits
 * Example: "13.4" = pscale +1 digit 1, pscale 0 digit 3, pscale -1 digit 4
 */
export type PscaleCoordinate = string;

/**
 * Character's current position in narrative space.
 */
export interface CharacterCoordinates {
  character_id: string;
  frame_id: string;
  spatial: PscaleCoordinate;
  temporal: PscaleCoordinate;
  focus?: string;
  updated_at: string;
  updated_by: 'hard-llm' | 'player-action' | 'system';
}

/**
 * Discovered proximity relationships.
 */
export interface CharacterProximity {
  character_id: string;
  close: string[];    // ≥2 digit overlap
  nearby: string[];   // 1 digit overlap
  distant: string[];  // 0 digit overlap, same cosmology
  coordinated_at: string;
}

export type ProximityState = 'close' | 'nearby' | 'distant' | 'far';

// ============================================================
// APERTURE TYPES
// ============================================================

/**
 * Attention scope: what pscale range is visible.
 */
export interface Aperture {
  floor: number;    // Minimum pscale (detail level)
  ceiling: number;  // Maximum pscale (scope level)
}

/**
 * Hard-LLM output: assembled operational context.
 */
export interface OperationalFrame {
  character_id: string;
  frame_id: string;
  
  // Who's here
  proximity: {
    close: string[];
    nearby: string[];
  };
  
  // What's relevant (filtered by aperture)
  content: ContentEntry[];
  
  // Current attention scope
  aperture: Aperture;
  
  compiled_at: string;
}

// ============================================================
// LAMINA TYPES (face-specific shelf coordinates)
// ============================================================

export interface LaminaPlayer {
  character_id: string;
  spatial: PscaleCoordinate;
  temporal: PscaleCoordinate;
  action_pscale: number;  // What scale is this action? (-1 = furniture, +2 = neighborhood)
}

export interface LaminaAuthor {
  content_id?: string;
  spatial: PscaleCoordinate;
  temporal?: PscaleCoordinate;
  pscale_floor: number;
  pscale_ceiling: number;
  determinancy: number;  // 0-1: how fixed is this content
}

export interface LaminaDesigner {
  skill_target?: string;
  package_target?: string;
  affected_faces: ('player' | 'author' | 'designer')[];
  stack_depth: number;
}

export type Lamina = LaminaPlayer | LaminaAuthor | LaminaDesigner;

// ============================================================
// TABULATION TYPES
// ============================================================

export interface SemanticTabulation {
  [pscaleLevel: string]: {
    [digit: string]: string;
  };
}

export interface Cosmology {
  id: string;
  name: string;
  description?: string;
  spatial_tabulation: SemanticTabulation;
  temporal_tabulation: SemanticTabulation;
}
```

---

## Hard-LLM Operations

### Operation 1: Parse Narrative → Update Coordinates

After Medium-LLM synthesis, Hard-LLM analyzes the narrative to determine if character moved:

**Input:**
- Character's current coordinates
- Recent narrative text
- Cosmology tabulation (for semantic reference)

**Output:**
- Updated coordinates (if movement detected)
- Reasoning

**Prompt Pattern:**
```
You are analyzing narrative to extract character position.

Current spatial coordinate: "13.4" (keep → kitchen → fireplace)
Tabulation: {"+1": {"1": "keep"}, "0": {"3": "kitchen"}, "-1": {"4": "fireplace"}}

Narrative: "Marcus leaves the warmth of the fire and walks into the great hall."

Does the character's position change? If so, what is the new coordinate?
Output JSON: { "moved": boolean, "new_spatial": string, "reasoning": string }
```

### Operation 2: Discover Proximity

Hard-LLM queries for other characters in the same frame and calculates overlap:

```sql
-- Find characters with spatial prefix match
SELECT character_id, spatial, temporal
FROM character_coordinates
WHERE frame_id = $1
  AND character_id != $2
  AND (
    spatial LIKE $3 || '%'  -- They're in my space
    OR $4 LIKE spatial || '%'  -- I'm in their space
  );
```

Then calculate proximity state for each and update `character_proximity` table.

### Operation 3: Compile Operational Frame

Assemble everything Medium-LLM needs:

1. Get character's coordinates
2. Determine aperture based on recent action pscale
3. Query content within aperture range at character's location
4. Get close/nearby character states
5. Package into `OperationalFrame`

---

## Content Location

Author content also has pscale coordinates:

```sql
ALTER TABLE content
  ADD COLUMN spatial TEXT,          -- Where this content exists
  ADD COLUMN pscale_floor INTEGER,  -- Minimum detail level (-2 = has object info)
  ADD COLUMN pscale_ceiling INTEGER,-- Maximum scope (+3 = city-relevant)
  ADD COLUMN temporal TEXT;         -- When this exists (for historical events)
```

Content is included in operational frame when:
1. Character's spatial coordinate has prefix match with content's spatial
2. Character's aperture overlaps with content's pscale range

```typescript
function isContentRelevant(
  characterSpatial: string,
  characterAperture: Aperture,
  contentSpatial: string,
  contentFloor: number,
  contentCeiling: number
): boolean {
  // Spatial relevance: prefix overlap
  const spatialMatch = sharedPrefixLength(characterSpatial, contentSpatial) > 0;
  
  // Aperture relevance: ranges overlap
  const apertureMatch = 
    contentFloor <= characterAperture.ceiling &&
    contentCeiling >= characterAperture.floor;
  
  return spatialMatch && apertureMatch;
}
```

---

## Migration from Current Schema

### What Changes

| Table | Change | Notes |
|-------|--------|-------|
| `frames` | Add `cosmology_id` | Reference to cosmology |
| `shelf` | Rename `pscale_aperture` → `action_pscale` | Clarify purpose |
| `content` | Add `spatial`, `temporal`, `pscale_floor`, `pscale_ceiling` | Replace single integer |
| `content` | Add `cosmology_id` | Reference to cosmology |
| NEW | `cosmologies` | Fictional worlds with tabulations |
| NEW | `characters` | Player vessels |
| NEW | `character_coordinates` | Current positions |
| NEW | `character_proximity` | Discovered relationships |
| NEW | `character_context` | Hard-LLM output cache |

### What Stays

| Table | Status |
|-------|--------|
| `users` | Unchanged |
| `packages` | Unchanged |
| `skills` | Unchanged |
| `frame_packages` | Unchanged |
| `user_packages` | Unchanged |
| `liquid` | Unchanged |
| `solid` | Unchanged |
| `frames.pscale_floor`, `frames.pscale_ceiling` | Unchanged (operational range) |

---

## Summary

**Coordinates** locate entities in psycho-social space using hierarchical strings where digit position = pscale level and digit value = semantic ID.

**Aperture** filters what's visible from a coordinate position, defined as a pscale range (floor to ceiling).

**Proximity** emerges from coordinate prefix overlap, enabling Hard-LLM murmuration without central coordination.

**Narrative aperture** (the function) is Hard-LLM determining what content feeds into Medium-LLM based on character coordinates + aperture + content locations.