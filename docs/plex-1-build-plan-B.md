# Plex 1 Build Plan B

**Date:** January 8, 2026
**Purpose:** Updated build plan after Set 2 implementation. Reflects the coordinate-only approach.

---

## Key Insight from Set 2

**Coordinates ARE the data.**

The original plan proposed `character_context` with resolved categories:
- `perceivable_content`, `character_state`
- `proximate_characters`, `their_liquid`, `content_conditions`

This was wrong. It pre-resolved coordinates into semantic data, which Hard-LLM would have to maintain.

**The new approach:**
- `character_context` stores only coordinates
- `relevant_coordinates` = overlapping coordinate strings (prefix matching)
- Soft/Medium unpack coordinates via skills + tabulation as needed

---

## What's Done

### Construct Button (Pre-Set)
- Extracted input from VapourZone to floating ConstructionButton
- Icon cycling: # (closed) → + (input open) → X (menu open)
- Textarea with keyboard shortcuts: ⌘↵ query, ⇧↵ submit
- VapourZone now display-only

### Set 2: Triad Binding (Partial)

**Done:**
- Simplified `OperationalFrame` type to coordinates only:
  ```typescript
  interface OperationalFrame {
    character_id: string;
    frame_id: string;
    character_coordinates: { spatial: string; temporal: string };
    relevant_coordinates: string[];  // Overlapping coordinates from proximity
    aperture: { floor: number; ceiling: number };
    compiled_at: string;
  }
  ```
- `cacheOperationalFrames()` writes coordinates only to `character_context`
- Hard-LLM prompt updated to request coordinate-only output
- `gather.ts` loads `character_context.relevant_coordinates`
- `filterContentByCoordinates()` filters content by prefix overlap

**Not done:**
- Async solid generation (placeholder → fill)
- Frontend subscription to `character_context` changes
- Hard-LLM running BEFORE Medium (currently runs after)

---

## Coordinate Flow (Current State)

```
Player commits action
    ↓
Medium-LLM synthesizes narrative (using gather.ts)
    ↓
Hard-LLM receives narrative
    ↓
Hard-LLM outputs:
  - coordinate_updates (if movement detected)
  - proximity_updates (who's near whom)
  - operational_frames (coordinates + relevant_coordinates)
    ↓
cacheOperationalFrames() writes to character_context
    ↓
Next synthesis: gather.ts reads character_context
    ↓
filterContentByCoordinates() uses relevant_coordinates
```

**Issue:** Hard runs AFTER Medium, so the first synthesis doesn't have coordinates. This works because:
1. If no `character_context` exists, all content passes through (no filtering)
2. After first synthesis, Hard populates coordinates
3. Subsequent syntheses have coordinate filtering

**Question:** Should Hard run BEFORE Medium? The original plan said yes. Current flow works but is reactive rather than proactive.

---

## What's Next

### Set 2 Remaining: Async Solid

**Goal:** Instant feedback via placeholder solid.

**Changes:**
1. Medium writes `solid` row with `narrative: null` immediately
2. Medium synthesizes asynchronously
3. Medium updates `solid.narrative` when complete
4. Frontend subscribes to solid updates, shows loading state

**Test:** Commit action → placeholder appears instantly → narrative fills in 1-2 seconds.

### Set 3: Context Binding

**Goal:** Proximity drives visibility.

**Current state:** Proximity calculated by Hard-LLM, stored in `character_proximity` table. But `gather.ts` doesn't use it — it loads ALL liquid for the frame.

**Changes needed:**
1. `gather.ts` reads `character_proximity` for triggering character
2. Filter liquid/vapor by proximity (close = full, nearby = summary, distant = none)
3. Remove frame_id as primary grouping — proximity IS the grouping

**The shift:** From "players in same session see each other" to "characters with overlapping coordinates see each other."

### Set 4: Skills Binding

**Status:** Skills load and apply, but categories may need refinement.

**Key insight from Set 2:** Skills should include coordinate unpacking. A "tabulation" skill would let the LLM decode "13.4" → "keep → kitchen → fireplace" using the cosmology's mapping.

**Potential skill categories:**
- `aperture`: what coordinates to load
- `tabulation`: how to decode coordinates to semantics
- `format`: output structure
- `gathering`: how to assemble context

### Set 5: Faces Binding

**Current:** Face determines which liquid to synthesize, but routing is similar.

**Needed:** Different aperture per face:
- Player: character coordinates → nearby characters/content
- Author: content coordinates → related content/regions
- Designer: skill coordinates → related skills/packages

---

## frames → sessions Rename

**Original plan:** Rename `frames` to `sessions` to clarify that `character_context` is the true "frame."

**Status:** Not done. Lower priority now that coordinate flow works.

**Consideration:** May not be needed if proximity-from-coordinates fully replaces frame-based grouping. The `frame_id` becomes just a session identifier for organizing play, while actual visibility comes from coordinates.

---

## The Spine (Revised)

Original: "Hard produces frame → Medium consumes it"

Revised: "Hard discovers coordinate overlap → writes relevant_coordinates → Medium filters content by overlap"

The "frame" isn't a pre-resolved bundle of content. It's a set of coordinates that Medium uses to filter what's relevant in real-time.

---

## Test Criteria

1. **Coordinate filtering works:** Character at "13.4" sees content at "13." and "13.2", not content at "2."
2. **Proximity updates:** Hard-LLM calculates who's close/nearby/distant
3. **Async solid:** Placeholder appears instantly, fills in background
4. **Liquid visibility:** Only see liquid from proximate characters

---

## Notes for Next Session

- Check if `hard-movement` and `hard-proximity` skills exist in DB
- Verify coordinate format in existing data
- Consider: should Hard run on a schedule for active characters? (proactive frame compilation)
- The `frames` → `sessions` rename is deferrable but clarifies mental model
