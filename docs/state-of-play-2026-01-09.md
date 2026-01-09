# State of Play: 2026-01-09

## Context

Session on branch `set-2-spine`, testing Phase 0.12 (pscale operationalization). Discovered that pscale filtering code exists but isn't executing due to scaffolding dependencies.

## What Was Built (Sets 2-5)

### Set 2: Triad Binding
- Simplified `character_context` to store only coordinates (not resolved data)
- `OperationalFrame` now has `character_coordinates` and `relevant_coordinates`
- Hard-LLM writes coordinates, Soft/Medium unpack via skills + tabulation

### Set 3: Context Binding
- Added proximity-based liquid filtering in `gather.ts`
- Frontend filters liquid by `character_proximity` table
- Uses prefix matching: "13.4" overlaps with "13." and "1."

### Set 4: Skills Binding (Investigation)
- Skills already work for `format`, `constraint`, `aperture` (Medium-LLM)
- `hard` category skills included in Hard-LLM prompt
- No code changes needed

### Set 5: Faces Binding (Investigation)
- Face routing already works (`route.ts`, compile functions per face)
- Each face has its own system prompt and output destination
- No code changes needed

## The Problem Discovered

**Pscale filtering code exists and is correct, but it never runs.**

Root cause chain:
1. User selects character in UI → `selectedCharacterId` set in React state
2. User commits liquid → `commitLiquid` called with `characterId`
3. BUT character selection doesn't call `inhabitCharacter` to set database
4. So `character_id` is NULL on liquid entries
5. So `trigger.character_id` is NULL in `gatherContext`
6. So proximity filter and coordinate filter both skip (fallback: show everything)

**Evidence:** All liquid entries have `character_id: null` despite user selecting characters.

## The Deeper Issue

The unified-loop-architecture.md describes a simpler system:

| Aspect | Unified Design | Current Implementation |
|--------|---------------|----------------------|
| Frames | Computed from coordinate proximity | Stored in `frames` table |
| Entities | Single table with coordinates | Separate `characters`, `users`, `content` tables |
| Face selection | Determined by coordinates | Explicit UI mode switch |
| Character binding | Entity at coordinates | `inhabited_by` FK, `character_id` on liquid |

The current codebase has **scaffolding that fights the unified design**:
- `inhabited_by` - unnecessary if coordinates determine context
- `character_id` on liquid - unnecessary if submitter is entity-at-coordinates
- `frames` table - unnecessary if frames are computed
- Face as mode - should emerge from coordinates

## What Works (Keep These)

1. **Coordinate filtering logic** (`coordinatesOverlap` in gather.ts)
2. **Proximity calculation** (Hard-LLM computes close/nearby/distant)
3. **Skills loading** (markdown → LLM context)
4. **The loop** (vapor → soft → liquid → medium → solid → hard)
5. **Shelf states** (vapor, liquid, solid transitions)
6. **Tabulation** (cosmology maps digits to semantics)

## What's Scaffolding (Candidate for Removal)

1. `frames` table - frames should be computed
2. `inhabited_by` on characters - coordinates should determine
3. `character_id` FK on liquid - entity is at coordinates
4. Face as UI mode - should derive from coordinates
5. Separate character/user/content tables - could unify as entities

## Recommended Paths Forward

### Path A: Prune
Strip scaffolding from current codebase while keeping working pieces:
- Remove `inhabited_by` dependency
- Make coordinate lookup the source of truth
- Keep existing loop, skills, filtering logic

### Path B: Fresh Build
Start from unified-loop minimal schema:
```sql
entities (id, cosmology_id, coordinates, entity_type)
content (id, entity_id, coordinates, shelf, text)
skills (id, cosmology_id, coordinates, skill_text)
```
Port working pieces (coordinate logic, skills, loop).

### Suggested Approach
Run both paths in parallel:
- **Prune branch:** Minimal changes to make pscale filtering actually execute
- **Fresh build branch:** Clean implementation of unified-loop design

Compare results after each produces working synthesis with coordinate filtering.

## Test Data Available

In `test-frame-2` (frame_id: `cccccccc-0000-0000-0000-000000000001`):

| Character | Spatial | Location |
|-----------|---------|----------|
| Ada | `12.2` | Tavern bar |
| Bo | `12.2` | Tavern bar (same as Ada) |
| Cal | `13.3` | Smithy anvil |

Ada and Bo are `close`. Cal is `nearby`.

Content with coordinates also seeded (Tavern, Bar, Smithy, Mysterious Letter).

Cosmology `test-world-2` has spatial/temporal tabulations.

## Files Changed This Session

- `supabase/functions/hard-llm/index.ts` - Simplified OperationalFrame
- `supabase/functions/generate-v2/synthesis/gather.ts` - Coordinate and proximity filtering
- `src/hooks/useLiquidSubscription.ts` - Proximity-based filtering
- `src/App.tsx` - Pass characterId to subscription
- `docs/plex-1-build-plan-B.md` - Progress documentation
- `docs/supabase-query-method.md` - Curl fallback for DB queries

## MCP Status

Supabase MCP is working. Can query database directly:
```
mcp__supabase__execute_sql
mcp__supabase__list_tables
mcp__supabase__get_logs
```

## Key Insight

> "Coordinates ARE the data. No categories, no metadata. Coordinates unpack via tabulation."

The system should filter by coordinate proximity at every stage. Skills should interpret what those coordinates mean. The loop is the same for everything - variation comes from skills, not code branches.

## Next Session Actions

1. Decide: prune or fresh build (or both parallel)
2. If prune: make `selectedCharacterId` actually write to liquid, verify filtering runs
3. If fresh build: implement minimal schema, port coordinate logic
4. Test: does Ada see Bo but not Cal's liquid?
