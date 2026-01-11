# Implementation Learnings

Findings from JSX prototypes and experimental artifacts that inform production implementation.

---

## 1. The Unified Loop Works

The JSX prototype demonstrates the single loop handling all three faces:

```
vapor → liquid → frame-assembly → llm-call → solid
```

**Key validation**: Same code path, different outcomes based on:
- Entity coordinates (where the face is positioned)
- Skill prompts (what instructions the LLM receives)
- Persistence rules (where output gets stored)

**What differs per face is not the loop, but:**
- Designer output → negative pscale coordinates (rules)
- Author output → positive pscale coordinates (world content)
- Player output → zero pscale coordinates (present action)

---

## 2. Frame Assembly is Pure Coordinate Filtering

The core operation that makes the architecture work:

```javascript
function assembleFrame(contentStore, entityCoords, aperture) {
  return contentStore.filter(content =>
    isProximate(content.coords, entityCoords, aperture)
  );
}
```

**Frame assembly returns:**
- Rules (negative pscale) — always included, they govern
- World content (positive pscale) — filtered by proximity
- Recent actions (zero pscale) — filtered by proximity

**The LLM receives assembled content, not raw database.** This is the "chunk loader" for narrative context.

---

## 3. Temporal Asymmetry Requires Tier-Specific Filtering

The temporal frame prototype revealed:

| Tier | Temporal Visibility | Purpose |
|------|---------------------|---------|
| Soft | Past + present only | Character knowledge |
| Medium | Past + present only | Narrative synthesis |
| Hard | All time including future | Coherence validation |

**Implementation requirement**: Frame assembly must accept a `tier` parameter that modifies temporal filtering:

```javascript
if (tier === 'hard') {
  return true; // Hard sees all temporal coordinates
} else {
  return content.t <= characterT; // Others see only past/present
}
```

**Why this matters**: Hard-LLM can validate "I burn down the castle" against future content ("army needs this castle in t:2000") while soft/medium remain appropriately ignorant.

---

## 4. The i:0 Confusion — Canonical vs Position

**The problem**: Two different meanings of "0" collided.

1. **Pscale place value**: In coordinate `321`, the `1` is at pscale 0 (room scale)
2. **Canonical content**: `i:0` was used to mean "universal, visible to all"

**Resolution**: These are compatible if we understand:

- Lower precision = wider scope = more inclusive
- `i:0` (single digit) is pscale +0, the most abstract identity level
- `i:400` (three digits) is pscale +2, a specific individual
- Content at `i:0` encompasses all specific identities

**The rule**: Content is visible if its coordinates are *equal to or less precise than* the query position, AND share a prefix relationship.

| Content coords | Query from i:400 | Visible? | Why |
|----------------|------------------|----------|-----|
| i:0 | Yes | Universal, encompasses all |
| i:4 | Yes | Community level, contains 400 |
| i:40 | Yes | Group level, contains 400 |
| i:400 | Yes | Exact match |
| i:401 | Maybe | Same group (40x), proximity check |
| i:500 | No | Different branch |

---

## 5. Character Coordinates are Absolute, Not Normalized

**The JSX shortcut** used `{ T: 0, S: 0, I: 0 }` for "player face" — meaning "present, here, self."

**Production reality**: Characters have absolute coordinates:

```
Character position: t:1005, s:321, i:400
```

**The pscale level is derived from place value**, not from the coordinate being literally zero:
- `321` → spatial pscale 0 (room), within pscale 1 (building), within pscale 2 (region)
- `1005` → temporal pscale 0 (moment), within larger time structures

**There is no normalization.** Queries use absolute coordinates with aperture as radius.

---

## 6. Aperture Defines Visibility Radius

From the prototype:

```javascript
const DEFAULT_APERTURE = { T: 4, S: 4, I: 2 };
```

**Aperture is skill-defined**, not hardcoded. Different skills load different apertures:
- Combat skill: narrow temporal (T:1), tight spatial (S:2)
- Historical reflection: wide temporal (T:6), narrow spatial (S:1)
- Community governance: narrow temporal (T:2), wide identity (I:4)

**Frame assembly uses aperture to filter**:
```javascript
const withinAperture =
  dT <= aperture.T &&
  dS <= aperture.S &&
  dI <= aperture.I;
```

---

## 7. Skill Prompts Structure the LLM's Interpretation

The prototype used face-specific prompt templates:

```javascript
const SKILL_PROMPTS = {
  player: (frame) => `You are processing a PLAYER action...
    ACTIVE RULES: ${frame.rules}
    WORLD CONTEXT: ${frame.worldContent}
    RECENT ACTIONS: ${frame.recentActions}`,

  author: (frame) => `You are processing an AUTHOR submission...`,

  designer: (frame) => `You are processing a DESIGNER rule proposal...`
};
```

**The assembled frame is injected into the prompt.** The LLM doesn't query the database — it receives pre-filtered content organized by coordinate type.

**Production implication**: Skills are markdown documents that include:
- Context definition (what coordinates this skill applies to)
- Soft instructions (how to refine vapor → liquid)
- Medium instructions (how to synthesize liquid → solid)
- Hard instructions (what to validate, what coordinates to update)

---

## 8. Persistence Rules by Face

The prototype persists output based on face:

```javascript
if (selectedFace === 'designer' && llmOutput.includes('VALID')) {
  addContent(input, 'designer', { T: -2, S: -1, I: -1 });
} else if (selectedFace === 'author' && llmOutput.includes('ACCEPT')) {
  addContent(input, 'author', { T: 2, S: 3, I: 1 });
} else if (selectedFace === 'player') {
  addContent(input, 'player', { T: 0, S: 0, I: 0 });
}
```

**This is a simplification.** Production needs:
- Hard-LLM to determine actual output coordinates
- Coordinate extraction from narrative content
- Shelf state transitions (vapor → liquid → solid)

**But the principle holds**: Where content lands in coordinate space depends on what face created it and what the content describes.

---

## 9. Rules at Negative Pscale Always Load

From the prototype:

```javascript
const isRule = contentCoords.T < 0 || contentCoords.S < 0;
if (isRule) return { proximate: true, ... }; // Always include
```

**Rules are content at negative coordinates.** They're "outward" from any positive position — they govern, constrain, shape.

**Production query pattern**:
```sql
SELECT * FROM content
WHERE cosmology_id = :cosmology
  AND (
    -- Negative pscale = rules, always load
    (coordinates->>'s')::numeric < 0
    OR
    -- Positive pscale = world content, proximity filter
    coordinate_proximate(coordinates, :entity_coords, :aperture)
  )
```

---

## 10. Open Implementation Questions

### Coordinate Storage Format

The prototypes used simple numbers (`{ T: 1005, S: 321, I: 400 }`). The pscale-implementation doc suggests strings with decimal points (`"321.4"`).

**Decision needed**: Numeric vs string storage, and how to handle the decimal point for sub-pscale-0 precision.

### Proximity Calculation

Simple distance (`Math.abs(a - b) < aperture`) works for prototypes. Production needs prefix-based proximity that respects semantic containment.

**321 and 322 are "nearby" (same building). 321 and 421 are "distant" (different buildings, same region).**

### Shelf State in Coordinates

Current model: shelf is a separate field (`'vapor' | 'liquid' | 'solid'`).

**Question**: Should shelf state be encoded in coordinates? Vapor at temporal coordinate "now", liquid slightly past, solid further past?

### Identity Coordinate for Content

World content (a room description) doesn't have identity in the same way a character does.

**Current approach**: `i:0` for canonical content. But this conflates "no identity" with "universal identity."

**Alternative**: Omit identity coordinate for spatial-only content. Query includes `i IS NULL OR i_proximate()`.

---

## Summary

The JSX prototypes validate the core architecture:
- Single loop works for all faces
- Frame assembly is pure coordinate filtering
- Temporal asymmetry is implementable via tier parameter
- Skills inject assembled context into LLM prompts
- Persistence location depends on face and content

Key issues to resolve:
- Coordinate storage format (numeric vs string)
- Prefix-based proximity calculation
- Identity coordinate semantics for non-entity content
- Integration of shelf state with coordinate model
