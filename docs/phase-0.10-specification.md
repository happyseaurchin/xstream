# Phase 0.10: Consolidation

**Status**: 📋 SPECIFICATION  
**Date**: January 2026  
**Depends on**: 0.9.3 complete (two-player coordination proven)

---

## Overview

Phase 0.10 consolidates the functions needed for a complete 3-player test. Currently, characters and locations are hard-coded in the database. This phase enables all three faces to perform their core functions through the interface:

| Face | Function | Status |
|------|----------|--------|
| **Character** | Inhabit & act | ✅ Works |
| **Author** | Create characters & locations | ❌ Not UI-accessible |
| **Designer** | Edit skills | ⚠️ Create works, edit doesn't |

Plus two coordination fixes discovered during 0.9.3 testing.

---

## Sub-Phases

| Phase | Deliverable | Test Criterion |
|-------|-------------|----------------|
| **0.10.1** | Stale liquid detection | Repeated commits don't re-narrate same content |
| **0.10.2** | Concurrent commit coordination | Two simultaneous commits produce one coherent solid |
| **0.10.3** | Author creates characters | "Create NPC Korven" → appears in character selector |
| **0.10.4** | Author creates locations | "Create The Rusty Anchor tavern" → usable as frame context |
| **0.10.5** | Designer edits skills | Load existing skill → modify → save |
| **0.10.6** | Three-player test | Marcus, Elara, Korven coordinate 30 minutes |

---

## 0.10.1: Stale Liquid Detection

### Problem

When a user commits, their liquid is synthesized into solid. But if they don't change their liquid and someone else commits, the Medium-LLM sees the same liquid again and re-narrates it.

Example:
- Marcus: "leans forward skeptically" → synthesized into solid
- Elara commits something new
- Medium-LLM sees Marcus's unchanged liquid → re-narrates the lean

### Solution

Mark liquid as "consumed" when synthesized.

**Database change:**
```sql
ALTER TABLE liquid ADD COLUMN consumed_by_solid_id UUID REFERENCES solid(id);
```

**Medium-LLM logic:**
1. When creating solid entry, get its ID
2. Update all liquid entries that were synthesized: `consumed_by_solid_id = {solid_id}`
3. When gathering liquid for next synthesis, filter: `consumed_by_solid_id IS NULL`

**Edge function update (generate-v2):**
```typescript
// After creating solid entry
const { data: solidEntry } = await supabase
  .from('solid')
  .insert({ frame_id, face, content, contributor_ids })
  .select('id')
  .single()

// Mark consumed liquid
await supabase
  .from('liquid')
  .update({ consumed_by_solid_id: solidEntry.id })
  .in('id', liquidIdsUsed)
```

**Gathering update:**
```typescript
// Only get unconsumed liquid
const { data: liquidEntries } = await supabase
  .from('liquid')
  .select('*')
  .eq('frame_id', frameId)
  .is('consumed_by_solid_id', null)
  .order('created_at', { ascending: false })
```

### Test

1. User A commits "walks to the bar"
2. Solid appears with narration
3. User A doesn't change liquid
4. User B commits something
5. New solid does NOT re-narrate User A walking to bar

---

## 0.10.2: Concurrent Commit Coordination

### Problem

If two users hit commit within seconds of each other, two separate Medium-LLM calls fire. Both read the same liquid entries. Both create solid entries. Result: duplicate or contradictory narrative.

### Solution: Leader Election

Before calling Medium-LLM, check if a synthesis is already in progress or recently completed.

**Database change:**
```sql
ALTER TABLE frames ADD COLUMN synthesis_in_progress BOOLEAN DEFAULT FALSE;
ALTER TABLE frames ADD COLUMN last_synthesis_at TIMESTAMPTZ;
```

**Edge function logic:**
```typescript
// Attempt to claim synthesis lock
const { data: claimed } = await supabase
  .from('frames')
  .update({ 
    synthesis_in_progress: true,
    last_synthesis_at: new Date().toISOString()
  })
  .eq('id', frameId)
  .eq('synthesis_in_progress', false)
  .select()
  .single()

if (!claimed) {
  // Another synthesis in progress - wait and return that result
  // Or: check if recent solid (< 5s) exists, return that
  const { data: recentSolid } = await supabase
    .from('solid')
    .select('*')
    .eq('frame_id', frameId)
    .gte('created_at', fiveSecondsAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (recentSolid) {
    return { success: true, result: recentSolid, skipped: true }
  }
  
  // Wait briefly and retry
  await sleep(2000)
  // ... retry logic
}

try {
  // Do synthesis
  const solid = await synthesize(...)
  return { success: true, result: solid }
} finally {
  // Release lock
  await supabase
    .from('frames')
    .update({ synthesis_in_progress: false })
    .eq('id', frameId)
}
```

### Alternative: Debounce on Client

Simpler approach - client-side batching:

```typescript
// In App.tsx
const pendingCommits = useRef<string[]>([])
const commitTimer = useRef<number | null>(null)

const handleCommit = (entryId: string) => {
  pendingCommits.current.push(entryId)
  
  if (commitTimer.current) clearTimeout(commitTimer.current)
  
  commitTimer.current = setTimeout(async () => {
    const ids = [...pendingCommits.current]
    pendingCommits.current = []
    await batchCommit(ids)  // Single Medium-LLM call
  }, 2000)  // 2 second debounce
}
```

### Recommendation

Start with **leader election** (server-side) because:
- Works even with multiple browser tabs
- No client coordination needed
- Cleaner semantics (one synthesis per moment)

### Test

1. User A and User B both have liquid ready
2. Both click commit within 1 second
3. Only ONE solid entry appears (not two)
4. Both users see the same coherent narrative

---

## 0.10.3: Author Creates Characters

### Current State

Characters created via LLM when user is in **character face** with intent "create a character...". Works, but creates player-characters.

### Required

Author face creates NPCs that appear in the character selector for players to potentially inhabit (or leave as NPCs for Character-LLM).

### Flow

```
Author in frame, character face
        │
        ▼
Types: "Create an NPC named Korven, a grizzled trapper 
        who knows something about the disappearances"
        │
        ▼
Soft-LLM detects NPC creation intent
        │
        ▼
Creates character with:
├── is_npc: TRUE
├── created_by: author's user_id
├── inhabited_by: NULL
├── cosmology_id: frame's cosmology
├── Coordinates in current frame
        │
        ▼
Character appears in dropdown for players
(with NPC indicator)
```

### Soft-LLM Update

Add to character creation detection:
- Author face + "create NPC" / "create character" → `is_npc: true`
- Character face + "create character" → `is_npc: false`

### Database

No schema change needed - `is_npc` column already exists.

### UI Update

Character selector already shows `(NPC)` indicator. Just ensure author-created NPCs appear.

### Test

1. Switch to Author face in test-frame
2. Type: "Create an NPC named Birdie, the tavern keeper"
3. Switch to Character face
4. Birdie appears in character dropdown with (NPC) tag
5. Player can inhabit Birdie (or leave for Character-LLM)

---

## 0.10.4: Author Creates Locations

### Current State

Locations don't exist as structured data. The LLM just invents based on narrative.

### Required

Author can create locations that become:
1. Selectable as "current location" context
2. Available to Medium-LLM for consistent narration
3. Stored in content table

### Flow

```
Author in frame
        │
        ▼
Types: "Create location: The Rusty Anchor - a weathered 
        tavern at the crossroads, known for cheap ale 
        and cheaper rumors"
        │
        ▼
Soft-LLM detects location creation intent
        │
        ▼
Creates content entry with:
├── content_type: 'location'
├── cosmology_id: frame's cosmology
├── data: { name, description, details }
├── pscale_aperture: +1 (building scale)
        │
        ▼
Location available for:
├── Frame default location
├── Character coordinate assignment
├── Medium-LLM context
```

### Database

Uses existing `content` table:
```sql
INSERT INTO content (cosmology_id, author_id, content_type, data, pscale_aperture)
VALUES (
  $cosmology_id,
  $author_id,
  'location',
  '{"name": "The Rusty Anchor", "description": "...", "details": {...}}',
  1  -- building scale
);
```

### Medium-LLM Context

When synthesizing, gather relevant locations:
```sql
SELECT * FROM content 
WHERE cosmology_id = $cosmology_id 
  AND content_type = 'location'
  AND pscale_aperture BETWEEN $floor AND $ceiling
```

Include in system prompt:
```
## Available Locations
- The Rusty Anchor: A weathered tavern at the crossroads...
```

### UI (Future)

Location selector in frame header. For now, just stored and used by LLM.

### Test

1. Author creates "The Rusty Anchor" location
2. Players commit actions
3. Medium-LLM consistently references the tavern by name and description
4. No contradictory location details invented

---

## 0.10.5: Designer Edits Skills

### Current State

Designer can CREATE new skills via "SKILL_CREATE..." syntax. But cannot:
- Load existing skill for viewing
- Edit existing skill
- Delete skill

### Required

Full skill lifecycle:
1. List skills (directory view exists)
2. Load skill content into liquid
3. Edit and save (update)
4. Delete skill

### Flow: Edit

```
Designer in frame, directory view
        │
        ▼
Clicks skill "my-custom-format"
        │
        ▼
Skill content loads into liquid zone:
┌─────────────────────────────────┐
│ SKILL_EDIT                      │
│ id: abc123                      │
│ name: my-custom-format          │
│ category: format                │
│ applies_to: character, author   │
│ content: |                      │
│   When formatting responses...  │
└─────────────────────────────────┘
        │
        ▼
Designer edits content
        │
        ▼
Commits
        │
        ▼
Soft-LLM detects SKILL_EDIT header
        │
        ▼
Updates skill in database
        │
        ▼
Confirmation in solid
```

### Parsing Update

Add `SKILL_EDIT` alongside `SKILL_CREATE`:

```typescript
if (text.startsWith('SKILL_EDIT')) {
  // Parse id from content
  // Update existing skill
  await supabase
    .from('skills')
    .update({ name, category, applies_to, content })
    .eq('id', skillId)
    .eq('package_id', userPackageId)  // Can only edit own skills
}
```

### Flow: Delete

```
Designer types: "Delete skill my-custom-format"
        │
        ▼
Soft-LLM confirms: "Delete skill 'my-custom-format'? 
                    This cannot be undone. [Yes] [No]"
        │
        ▼
Designer selects [Yes]
        │
        ▼
Skill deleted
        │
        ▼
Confirmation in solid
```

### Test

1. Designer creates skill "test-skill"
2. Clicks skill in directory
3. Skill loads into liquid with SKILL_EDIT header
4. Modifies content
5. Commits
6. Skill updated (verify in directory)

---

## 0.10.6: Three-Player Test

### Setup

1. Create three accounts (or use existing)
2. All enter test-frame
3. Author creates location "The Rusty Anchor"
4. Author creates NPCs as needed
5. Each player inhabits a character

### Test Protocol

**Duration:** 30 minutes minimum

**Scenario:** Three strangers meet at a tavern. One has information about disappearances in the forest.

**Players:**
- Marcus (travelling merchant)
- Elara (scholar)  
- Korven (NPC, but player-inhabited for test)

**Checkpoints:**

| Time | Check |
|------|-------|
| 0:00 | All three see each other's presence |
| 0:05 | First three-way synthesis works |
| 0:10 | Stale liquid not re-narrated |
| 0:15 | Concurrent commits handled gracefully |
| 0:20 | Location details consistent |
| 0:25 | Narrative coherence maintained |
| 0:30 | All players want to continue |

### Success Criteria

1. ✅ All three players' liquid synthesized into coherent solid
2. ✅ No duplicate narration from stale liquid
3. ✅ Concurrent commits produce single solid
4. ✅ Author-created content (location, NPCs) used consistently
5. ✅ **Mos Eisley Test passes** - synchronized imagination achieved

---

## Implementation Order

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| 0.10.1 | 1 hour | None |
| 0.10.2 | 2 hours | None |
| 0.10.3 | 1 hour | Soft-LLM skill update |
| 0.10.4 | 2 hours | Content table, Medium-LLM context |
| 0.10.5 | 2 hours | Parsing, UI |
| 0.10.6 | 1 hour | All above complete |

**Total:** ~1 day

---

## Files to Modify

### Database Migrations

```sql
-- 0.10.1_consumed_liquid
ALTER TABLE liquid ADD COLUMN consumed_by_solid_id UUID REFERENCES solid(id);

-- 0.10.2_synthesis_lock
ALTER TABLE frames ADD COLUMN synthesis_in_progress BOOLEAN DEFAULT FALSE;
ALTER TABLE frames ADD COLUMN last_synthesis_at TIMESTAMPTZ;
```

### Edge Functions

| File | Changes |
|------|---------|
| `generate-v2/index.ts` | Stale liquid filter, synthesis lock, NPC detection, location creation |

### Frontend

| File | Changes |
|------|---------|
| `src/components/SolidPanel.tsx` | Skill click loads for edit |
| `src/utils/parsing.ts` | Add SKILL_EDIT parsing |

---

## Post-0.10: Plex 1.0 Complete

After 0.10.6 passes, declare **Plex 1.0 complete**.

Create stable snapshot:
- Git tag: `v1.0.0`
- Supabase branch: `stable-v1.0`

Then continue to Plex 1.1 (Hard-LLM coordinate extraction) on development branch.

---

*Written: 2026-01-03*
