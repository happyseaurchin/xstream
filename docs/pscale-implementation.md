# Pscale Coordinates: Implementation Specification

**Purpose**: Canonical reference for implementing pscale coordinates in Xstream
**Companion to**: `pscale-spine.md` (conceptual)

> **Note**: This document was written for an earlier architecture with separate tables (frames, characters, content). The fresh build uses the single-loop architecture where everything is content at coordinates. Some specifics (table names, lamina types) may need revision, but the **coordinate mechanics** remain valid.

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
"10."      = {keep} — at building level, no room specified
"13."     = {keep}{kitchen} — in the kitchen, no furniture focus
"13.4"    = {keep}{kitchen}.{fireplace} — at the fireplace
"13.42"   = {keep}{kitchen}.{fireplace}{mantle} — on the mantle
"213."    = {region}{keep}{kitchen} — with regional context
```

### Temporal Coordinate Examples

```
"300."      = {day-3} — on the third day, no finer detail
"340."     = {day-3}{hour-4} — third day, fourth hour
"348."    = {day-3}{hour-4}{block-8} — specific 5-10 min block
"348.1"   = {day-3}{hour-4}{block-8}.{minute-1} — first minute of that block
```

### Identity Coordinate Examples

```
"500."      = {tamor-tribe} — tribal identity only
"540."     = {tamor-tribe}{brothers-family} — family within tribe
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

## Mapping to Single-Loop Architecture

In the fresh build (single content table), coordinates work as follows:

### Content Table with Coordinates

```sql
content (
  id UUID PRIMARY KEY,
  cosmology_id UUID,
  coordinates JSONB,     -- {t: "348.1", s: "13.4", i: "543.2"}
  shelf TEXT,            -- 'vapor' | 'liquid' | 'solid'
  text TEXT,
  created_at TIMESTAMP,
  created_by UUID
)
```

### Coordinate JSONB Structure

```json
{
  "t": "348.1",      // temporal coordinate string
  "s": "13.4",       // spatial coordinate string
  "i": "543.2"       // identity coordinate string
}
```

### Proximity Query (Single Table)

```sql
-- Find content proximate to a given position
SELECT * FROM content
WHERE cosmology_id = :cosmology
  AND shelf = 'solid'
  AND (
    -- Spatial proximity: prefix match
    coordinates->>'s' LIKE :spatial_prefix || '%'
    OR :my_spatial LIKE (coordinates->>'s') || '%'
  )
  AND (
    -- Temporal proximity: prefix match
    coordinates->>'t' LIKE :temporal_prefix || '%'
    OR :my_temporal LIKE (coordinates->>'t') || '%'
  );
```

### Negative Pscale = Rules

Content at negative pscale coordinates are rules/physics:

```sql
-- Get rules that apply to this location
SELECT * FROM content
WHERE cosmology_id = :cosmology
  AND shelf = 'solid'
  AND (
    -- Spatial rules (negative s coordinate or s starts with -)
    (coordinates->>'s')::text ~ '^-'
    OR (coordinates->>'s')::text ~ '^\d+\.-'  -- Has negative after decimal
  );
```

---

## TypeScript Types (Fresh Build)

```typescript
/**
 * Pscale coordinate string.
 * Format: digits + optional decimal + digits
 * Example: "13.4" = pscale +1 digit 1, pscale 0 digit 3, pscale -1 digit 4
 */
export type PscaleCoordinate = string;

/**
 * Three-dimensional coordinate position.
 */
export interface Coordinates {
  t: PscaleCoordinate;  // temporal
  s: PscaleCoordinate;  // spatial
  i: PscaleCoordinate;  // identity
}

/**
 * Attention scope: what pscale range is visible.
 */
export interface Aperture {
  floor: number;    // Minimum pscale (detail level)
  ceiling: number;  // Maximum pscale (scope level)
}

export type ProximityState = 'close' | 'nearby' | 'distant' | 'far';

/**
 * Semantic mapping for a cosmology.
 */
export interface SemanticTabulation {
  [pscaleLevel: string]: {
    [digit: string]: string;
  };
}

/**
 * Content entry in the single-table architecture.
 */
export interface ContentEntry {
  id: string;
  cosmology_id: string;
  coordinates: Coordinates;
  shelf: 'vapor' | 'liquid' | 'solid';
  text: string;
  created_at: string;
  created_by: string;
}
```

---

## Summary

**Coordinates** locate entities in psycho-social space using hierarchical strings where digit position = pscale level and digit value = semantic ID.

**Aperture** filters what's visible from a coordinate position, defined as a pscale range (floor to ceiling).

**Proximity** emerges from coordinate prefix overlap, enabling filtering without central coordination.

**In single-loop architecture**: coordinates are JSONB `{t, s, i}` on the content table. Negative coordinates = rules. Frame assembly queries by prefix overlap.
