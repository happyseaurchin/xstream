# Phase 0.8.1 Stub: Hard-LLM Coordination

**Status**: Infrastructure complete, testing blocked pending 0.9
**Date**: January 2026

---

## What's Implemented

### Edge Function: `hard-llm`

Single skill-driven coordination function deployed to Supabase.

**Trigger types:**
- `synthesis-complete` - Called after Medium-LLM player synthesis
- `action-commit` - Direct trigger (future)
- `time-advance` - Cron-based (future)
- `manual` - Testing

**Process:**
1. Loads Hard-LLM skills from database (category = 'hard')
2. Gathers context: cosmology, characters, coordinates, content
3. Builds prompt with skills + context
4. Invokes Claude Sonnet 4 with extended thinking
5. Parses structured JSON output
6. Updates database tables

### Skills Created (6)

All in `onen` platform package:

| Skill | Purpose |
|-------|---------|
| `hard-proximity` | Determine CLOSE/NEARBY/DISTANT from coordinate prefix overlap |
| `hard-movement` | Detect location changes from narrative text |
| `hard-aperture` | Calculate perception range from action pscale |
| `hard-relevance` | Filter content by spatial overlap + aperture intersection |
| `hard-frame-assembly` | Compile operational context for Medium-LLM |
| `hard-semantic-extraction` | Extract semantic-numbers (logged only in 0.8) |

### Database Tables

```
character_coordinates
├── character_id (FK)
├── frame_id (FK)
├── spatial (text) - e.g., "12." = inn→kitchen
├── temporal (text) - e.g., "11." = morning→block-1
└── updated_by (text) - 'player' | 'hard-llm' | 'author'

character_proximity
├── character_id (FK)
├── frame_id (FK)
├── close (uuid[]) - 2+ digit overlap
├── nearby (uuid[]) - 1 digit overlap
├── distant (uuid[]) - 0 digit overlap
└── coordinated_at (timestamp)

character_context
├── character_id (FK)
├── frame_id (FK)
├── context_content (jsonb) - operational frame
├── aperture_floor (int)
├── aperture_ceiling (int)
├── compiled_at (timestamp)
└── expires_at (timestamp) - 5 min default
```

### Integration Point

`generate-v2` synthesis handler triggers Hard-LLM after player synthesis:

```typescript
// In handler.ts, after routePlayerResult()
await triggerHardLLM(context, generatedText);
```

Conditions for trigger:
- Face = 'player' (not author, not designer)
- Characters found in context (linked to participating users)
- Frame has cosmology_id set

### Test Data (Database)

| Table | Data |
|-------|------|
| `frames` | test-frame (bbbbbbbb-0000-0000-0000-000000000001) |
| `cosmologies` | test-inn-world with spatial/temporal tabulations |
| `characters` | Marcus, Elara (unlinked to users) |
| `character_coordinates` | Marcus at "11.", Elara at "12." |
| `character_proximity` | Marcus/Elara as NEARBY |

---

## What's Pending (Blocked by 0.9)

### 1. Character-User Connection

**Problem**: No mechanism to link user to character.

**0.9 provides**:
- User registration (real user accounts)
- Character creation flow (author-llm or player customization)
- Character selection UI
- `inhabited_by` field populated

### 2. Pre-Synthesis Frame Loading

**Problem**: Medium-LLM doesn't receive operational frame before synthesis.

**Required**:
```typescript
// Before compiling player prompt
const opFrame = await loadOperationalFrame(characterId, frameId);
if (opFrame) {
  // Include CLOSE/NEARBY characters in context
  // Include aperture-filtered content
}
```

**0.9 provides**:
- Known character for the triggering user
- Operational frame can be fetched/assembled

### 3. Content-Coordinate Tagging

**Problem**: Content in `content` table has no `pscale_coordinate` field.

**Required**: Content created by authors needs coordinate assignment so Hard-LLM can filter by proximity.

**0.9 provides**:
- Author content persistence
- Coordinate assignment during content creation

### 4. Persistent Test Environment

**Problem**: Test data disappears on refresh/reset.

**0.9 provides**:
- Stable database state
- Registered author can create persistent world content

---

## Test Criteria (Post-0.9)

### Convergence Test

**Setup**:
1. Two registered users
2. Each inhabits a character in test frame
3. Characters start at different coordinates (NEARBY)

**Test**:
1. User A commits: "I walk over to [User B's character]"
2. Medium-LLM synthesizes narrative
3. Hard-LLM triggered automatically

**Verify**:
- User A's character coordinate updated (matches User B's location)
- Proximity recalculated: now CLOSE
- Operational frames updated for both characters
- Next synthesis includes proximity context

### Divergence Test

**Test**:
1. User A commits: "I leave the kitchen and return to the common room"
2. Synthesis + Hard-LLM triggered

**Verify**:
- Coordinate updated back to original location
- Proximity recalculated: now NEARBY or DISTANT
- Operational frames reflect separation

### Aperture Test

**Test**:
1. User A at pscale 0 action ("I look around the room")
2. User B at pscale -2 action ("I quickly glance at the door")

**Verify**:
- Different aperture ranges calculated
- Content filtering differs based on aperture
- Operational frames show different visible content

---

## 0.8.5 Extension Points

These are prepared but not active in 0.8:

| 0.8 | 0.8.5 |
|-----|-------|
| Single Hard-LLM per frame | Per-user Hard-LLM |
| Logged semantic extraction | Stored + exchanged semantic-numbers |
| Proximity from coordinates | + Event interference quality |
| Shared operational frame | Per-character context with dominant_events |

Tables ready for 0.8.5:
- `semantic_numbers` (not yet created)
- `semantic_relationships` (not yet created)
- `character_determinancy` (not yet created)

Skills ready to add:
- `hard-coordination`
- `hard-interference`
- `hard-broadcast`

---

## Architectural Notes

### Skill-Driven Design

Hard-LLM contains no hard-coded decision logic. All coordination intelligence is in skills that the LLM reads and interprets. This allows the system to evolve with LLM improvements without code changes.

### Coordinate Semantics

Coordinates are hierarchical strings where:
- Position = pscale level (left-to-right = higher-to-lower scale)
- Value = semantic ID from cosmology tabulation

Proximity emerges from prefix overlap:
- 2+ digits = CLOSE (same room or sub-location)
- 1 digit = NEARBY (same building, different room)
- 0 digits = DISTANT (different buildings)

### Temporal Primacy

Temporal coordinate mismatch overrides spatial proximity. Characters in different time blocks cannot interact even if spatially co-located.

---

## Files Reference

**Edge Function**:
- `supabase/functions/hard-llm/index.ts`

**Integration**:
- `supabase/functions/generate-v2/synthesis/handler.ts` (triggerHardLLM)
- `supabase/functions/generate-v2/synthesis/gather.ts` (character loading)

**Skills** (in database):
- `skills` table, category = 'hard', package = 'onen'

**Utilities**:
- `src/utils/pscale.ts` (pure coordinate algorithms)

---

## Resume Checklist (When 0.9 Complete)

1. [ ] Verify user can register and login
2. [ ] Verify user can create/select character
3. [ ] Verify character has `inhabited_by` set to user_id
4. [ ] Verify frame has `cosmology_id` set
5. [ ] Verify character has initial coordinates
6. [ ] Test player commit → synthesis → Hard-LLM trigger
7. [ ] Check coordinate updates in database
8. [ ] Check proximity recalculation
9. [ ] Check operational frame assembly
10. [ ] Verify next synthesis includes proximity context
