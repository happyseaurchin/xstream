# Plex 0.5.5: Solid Panel Navigation + Frame-Scoped Skills

**Status:** Implemented
**Depends on:** Phase 0.5 (Designer Creates Skills)

---

## Summary

Phase 0.5.5 refines the solid panel from a simple output log into a navigable substrate that adapts by face. It also corrects the skill creation scope from user-personal to frame-scoped.

---

## Conceptual Model Clarified

### State/Person Mapping

| State | Person | Nature |
|-------|--------|--------|
| Vapor (1.0) | 1st | Raw thought, unsubmitted |
| Soft-LLM (1.5) | 1st→2nd | Dialogic refinement with soft-LLM |
| Liquid (2.0) | 2nd | Relational submission, witnessed |
| Medium-LLM (2.5) | 2nd→3rd | Coordination of multiple submissions |
| Solid (3.0) | 3rd | Fixed record - the navigable substrate |
| Hard-LLM (3.5) | 3rd | Navigation/orchestration of solid |

**Key insight:** Everything before solid is process and timing. Solid is the persistent navigable space.

---

## Changes Implemented

### 1. Solid Panel Toggle

Added view toggle to solid panel header: `[log]` / `[dir]`

- **Log view** (default): Shows recent committed content
- **Directory view**: Shows navigable structure for current face

### 2. Directory View by Face

| Face | Directory contents |
|------|-------------------|
| Player | Characters in frame (placeholder) |
| Author | World elements (placeholder) |
| Designer | Skills for current frame + platform skills |

### 3. Click-to-Edit

Clicking an item in directory view loads it into liquid for editing:
- Designer clicks skill → skill content appears in liquid textarea
- Creates a prompt repository pattern

### 4. Frame-Scoped Skill Creation

**Previous:** Designer creates skill → stored in personal package → applies only to that user

**Now:** Designer creates skill in frame X → stored in frame X's package → applies to everyone in frame X

### 5. Button State Change

- Before commit: `[Submit] [Commit]`
- After commit: `[Submit] [Clear]`

Clear removes vapor/liquid but preserves solid.

### 6. Coordination Response

Designer commit now shows:
> "**skill-name** added to frame xxxxxxxx. Category: format. Applies to: player. This skill is now active for all users in this frame."

Instead of echoing the skill definition.

---

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/generate-v2/index.ts` | Frame package creation, list_frame_skills endpoint, coordination response |
| `src/App.tsx` | Solid view toggle, directory rendering, click-to-edit, clear button |
| `src/App.css` | Directory styles, view toggle styles, clear button styles |

---

## Test Criteria

1. ✓ Toggle works: [log]/[dir] switches solid panel view
2. ✓ Directory populates: Designer sees skills (platform + frame)
3. ✓ Click to edit: Clicking skill loads content to liquid
4. ✓ Frame-scoped creation: New skill appears in frame's package
5. ✓ Clear button: After commit, Clear removes vapor/liquid
6. ✓ Coordination response: Designer sees "skill added to frame" message

---

## Edge Function Version

Deployed: `generate-v2` version 5
