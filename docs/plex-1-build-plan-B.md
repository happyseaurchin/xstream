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

### Set 3: Context Binding (Done)

**Goal:** Proximity drives visibility.

**Done:**
1. `gather.ts` loads `character_proximity` for triggering character
2. Filters liquid by proximity: close/nearby = visible, distant = hidden
3. `useLiquidSubscription` accepts `characterId` and loads proximity
4. Frontend filters `liquidEntries` by proximity before display

**The graceful fallback:** If no proximity data exists, all liquid is shown. This means:
- First synthesis: no filtering (proximity not computed yet)
- After Hard-LLM runs: proximity populates
- Subsequent views: filtered by proximity

**The shift realized:** "Characters with overlapping coordinates see each other" — proximity IS the grouping, frame_id is just session scaffolding.

### Set 4: Skills Binding (Done - No Changes Needed)

**Goal:** Skills compile into LLM prompts and affect behavior.

**Finding: Skills already work.**

| Layer | Skills Used |
|-------|-------------|
| **Medium-LLM** | `format` → appended to system prompt. `constraint` → appended to system prompt. `aperture` → modifies max tokens. |
| **Hard-LLM** | All `hard` category skills included in prompt. |

**Categories NOT applied:**
- `gathering`, `weighting`, `routing`, `parsing`, `display` - defined but no apply functions

**Tabulation:** Comes from cosmology, not skills. Hard-LLM includes `spatial_tabulation` and `temporal_tabulation` directly in its prompt via `formatTabulation()`.

**Does Medium-LLM need tabulation?** No. Hard-LLM does the coordinate work (proximity, filtering). Medium-LLM receives already-filtered content with human-readable descriptions.

**Conclusion:** Skill system works for its current categories. Adding more skill categories would require writing apply functions. No code changes made.

### Set 5: Faces Binding (Done - Working as Designed)

**Goal:** Same triad, different domain per face.

**Finding: Face routing already works.**

| Component | Player/Character | Author | Designer |
|-----------|-----------------|--------|----------|
| **Compile function** | `compile-player.ts` | `compile-author.ts` | `compile-designer.ts` |
| **System prompt** | Narrative synthesis (30/70 rule) | World-building synthesis | Skill parsing |
| **Output routing** | `solid.narrative` | `content` table + `solid` audit | `skills` table + `solid` audit |
| **Token default** | 512 | 512 | 2048 |
| **Filters liquid by** | `character` face | `author` face | Trigger only |

**Route functions in `route.ts`:**
- `routePlayerResult()` → `solid` table with `narrative`
- `routeAuthorResult()` → `content` table + `solid.content_data`
- `routeDesignerResult()` → `skills` table + `solid.skill_data`

**What's NOT yet implemented:**
- Different aperture skills per face (currently uses same skill lookup)
- Hard-LLM coordinate calculation per face (only works for player/character)
- Author coordinates → content-space proximity
- Designer coordinates → skill-space proximity

**Conclusion:** Face routing works for current needs. Author and Designer faces synthesize and route correctly. The coordinate-based aperture differences described in the original plan require Hard-LLM to understand multiple coordinate spaces (character-space vs content-space vs skill-space). This is future work — the current system routes by face, and skills can customize behavior per face.

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

1. **Coordinate filtering works:** Character at "13.4" sees content at "13." and "13.2", not content at "2." ✓ (Set 2)
2. **Proximity updates:** Hard-LLM calculates who's close/nearby/distant ✓ (existing)
3. **Async solid:** Placeholder appears instantly, fills in background ✓ (already implemented in route.ts)
4. **Liquid visibility:** Only see liquid from proximate characters ✓ (Set 3)
5. **Skills compile into prompts:** Format, constraint, aperture apply to Medium-LLM ✓ (Set 4)
6. **Face routing:** Each face has its own compile function and output destination ✓ (Set 5)

---

## Sprint Strategy

**Approach:** Complete all Sets (2-5) in one pass, even if incomplete. Then test end-to-end.

**If it doesn't work:**
- Document what failed and why
- Branch from original main
- Replay working parts, try different approaches for failures
- Each branch = one exploration path

**Why this works:** We learn by coding. The first pass reveals the shape of the problem. Subsequent passes refine with that knowledge.

---

## Notes for Next Session

- Check if `hard-movement` and `hard-proximity` skills exist in DB
- Verify coordinate format in existing data
- Consider: should Hard run on a schedule for active characters? (proactive frame compilation)
- The `frames` → `sessions` rename is deferrable but clarifies mental model

---

## Summary of Changes (This Session)

### Set 2 (Triad Binding)
- `hard-llm/index.ts`: Simplified `OperationalFrame` to coordinates only
- `generate-v2/synthesis/gather.ts`: Filters content by `relevant_coordinates`

### Set 3 (Context Binding)
- `generate-v2/synthesis/gather.ts`: Filters liquid by `character_proximity`
- `hooks/useLiquidSubscription.ts`: Loads proximity, filters `liquidEntries`
- `App.tsx`: Passes `characterId` to liquid subscription

### Set 4 (Skills Binding) - Investigation Only
- Skills DO work for `format`, `constraint`, `aperture` (Medium-LLM)
- Skills DO work for `hard` category (Hard-LLM)
- Tabulation comes from cosmology, not skills - already in Hard-LLM prompt
- No code changes needed - system works as designed

### Set 5 (Faces Binding) - Investigation Only
- Face routing DOES work (`route.ts`, compile functions per face)
- Each face has its own system prompt and output destination
- Player/Character → `solid.narrative`
- Author → `content` table + `solid.content_data`
- Designer → `skills` table + `solid.skill_data`
- Skills apply to all faces (loaded by `applies_to` filter)
- No code changes needed - system works as designed
