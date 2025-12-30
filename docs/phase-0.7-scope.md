# Phase 0.7: Core Gameplay — Cross-Player Synthesis

**The heart of Xstream: where individual inputs become shared story**

---

## Purpose

Phase 0.7 implements the core gameplay loop that makes Xstream unique: Medium-LLM synthesizes all player actions + author content into coherent shared narrative.

This is the phase that proves the concept works.

---

## The Pub Test

Success criterion for Phase 0.7:

1. **Author** creates "The Rusty Anchor" pub + "Birdie" the barkeep (content persists)
2. **Player A** commits: "I order an ale"
3. **Player B** commits: "I ask about the stranger in the corner"
4. **Medium-LLM** synthesizes both + author content:
   > "You catch Birdie's eye and order an ale. She slides it across the worn counter, then leans in as your companion asks about the stranger. 'That one?' she whispers, nodding toward the hooded figure. 'Been here three days. Pays in gold but never speaks...'"
5. **Both players** see this same narrative in solid

If this works, everything else is elaboration.

---

## Deliverables

### 1. Medium-LLM Cross-Player Synthesis

**Current state:** Medium-LLM sees only the committing user's input.

**Required:**
- On commit, Medium-LLM queries ALL committed entries in frame (not just single user)
- Synthesizes multiple player actions into single coherent narrative
- Outputs to solid for all players to see
- Can add comments to liquid if there are conflicts/issues

**Implementation:**
```typescript
// In generate-v2 edge function, medium mode:
const allCommitted = await supabase
  .from('shelf')
  .select('*')
  .eq('frame_id', frameId)
  .eq('state', 'committed')
  .is('response', null)  // Not yet processed
  .order('created_at', { ascending: true })

// Compile prompt includes ALL actions
const synthesisPrompt = compileSynthesisPrompt(allCommitted, authorContent)
```

### 2. Author Content → Player Context

**Current state:** Author can create content, but it doesn't appear in player generation.

**Required:**
- Content table stores author-created elements (locations, NPCs, items, lore)
- When players act in a location, Medium-LLM has that location's details
- NPCs can be referenced in narrative generation

**Implementation:**
- Use existing `shelf` table with `face='author'` and `state='committed'`
- OR create dedicated `content` table per plex-1-spec
- Gathering skill queries relevant content for prompt compilation

### 3. Frame-Scoped Content View

**Current state:** Directory shows user's own artifacts only.

**Required:**
- Directory view shows all content in frame (from all authors)
- Players can see what locations/NPCs exist
- Content is queryable by type (location, npc, item, lore)

### 4. Synthesis Timing

**Current state:** Medium-LLM fires immediately on single commit.

**Required:**
- Reasonable accumulation window (e.g., 2-5 seconds after first commit)
- OR trigger when all "nearby" players have committed
- Timing metadata from Soft-LLM (immediate/reactive/coordinated)

**Simple approach for Phase 0.7:**
- Trigger synthesis when commit button pressed
- Include all unprocessed committed entries in frame
- Mark entries as processed after synthesis

---

## Technical Changes

### Database

```sql
-- May need to track which entries have been synthesized
ALTER TABLE shelf ADD COLUMN IF NOT EXISTS synthesized_at TIMESTAMPTZ;

-- Or use a synthesis_batch_id to group entries processed together
ALTER TABLE shelf ADD COLUMN IF NOT EXISTS synthesis_batch_id UUID;
```

### Edge Function (generate-v2)

**Medium mode changes:**
1. Query all unprocessed committed entries in frame
2. Query relevant author content for context
3. Compile synthesis prompt with all inputs
4. Generate single coherent narrative
5. Store response, mark all entries as processed
6. Broadcast to all users in frame

### Frontend

**Solid panel changes:**
- Show synthesis results (narrative that includes all players)
- Attribute which players' actions were included
- Real-time update when synthesis arrives

---

## Not in Phase 0.7

- Hard-LLM background processing (Phase 0.8)
- Procedural content generation (Phase 0.8)
- Proximity-based filtering (Phase 0.8)
- Authentication (Phase 0.9)
- Frame creation UI (Phase 0.9)

---

## Dependencies

Phase 0.7 depends on:
- ✅ Multi-user presence (Phase 0.6)
- ✅ Live text states (Phase 0.6.5)
- ✅ Author face working (Phase 0.5)

---

## Architecture Reference

From `soft_medium_timing_architecture.md` in project knowledge:

> "Medium-LLM (action coordinator + perceptual filter):
> - Receives action from own Soft with timing condition
> - Reads accumulated actions from other characters (shared space)
> - Sets own wake-up timer based on timing condition from Soft
> - When timer expires: synthesizes relevant actions into narrative bones
> - Delivers synthesis to own Soft for final rendering"

Phase 0.7 implements the core of this: reading accumulated actions and synthesizing narrative. Timing refinements come later.

---

## Success Metrics

1. Two players commit different actions → one coherent narrative output
2. Author content appears in player narrative generation
3. All players see same synthesis result
4. Synthesis feels natural, not like "Player A did X. Player B did Y."

The narrative should read like a story, not a list of actions.
