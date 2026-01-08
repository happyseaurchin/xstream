# Plex 1 Build Plan

**Date:** January 8, 2026  
**Purpose:** Guide for completing Plex 1 — the minimal kernel that enables skill-driven narrative coordination.

---

## What Xstream Enables

Real-world collaboration has a problem: turn-taking. Only one person can speak at a time. The emphasis is on talking — who speaks, when, for how long. Ten people in a room means nine waiting.

LLMs invert this. They enable **simultaneous listening**.

Everyone expresses at once — text, voice, doesn't matter. The LLM receives all inputs and synthesizes them together. Medium-LLM gathers all liquid (everyone's intentions) and forges coherent solid. It listens to everyone simultaneously.

**Xstream is a mass listening device.**

This is the game change. Not better talking. Collective listening. A thousand people can think at once, and the system hears them all.

---

## UI Architecture

### Single Column as Core Unit

**Mobile:** One column, one character, probably player face. This is the primary experience.

**Desktop options:**
- Multiple browser tabs, each a single column (works immediately via browser)
- Future enhancement: multi-column view within same page

**For Plex 1:** Build single column properly. Parameterize by character_id so multi-column composition is possible later, but render one column.

### Layout Structure

```
┌─────────────────────────────┐
│      TOP BAR (Archive)      │  ← past: stories, content, directories
├─────────────────────────────┤
│         SOLID               │  ← display: committed narrative
├─────────────────────────────┤
│         LIQUID              │  ← display: staged intentions
├─────────────────────────────┤
│         VAPOR               │  ← display: live presence (others)
└─────────────────────────────┘
              ◉                   ← Construct button (the living person)
```

### The Construct Button (Design Consideration)

**The insight:** The living person is not any of the content on display. Vapor, liquid, solid, archive — all of this is content. What we're interested in is the living person who is thinking, breathing, and inventing concurrently.

**Current state:** Text input embedded in VapourZone.

**Possible alternative:** Extract input to floating Construct button.

**Construct opens to reveal:**
- Text field (or audio input)
- Attachments (upload content, images, etc)
- Face selector (player/author/designer)
- Mode indicators
- Settings/connectors
- Submit actions

**Benefits:**
- Clean separation: zones display states, Construct is where the person creates
- Represents the *creator*, not the created content
- Audio-first friendly (tap, speak, done)
- Natural home for growing functionality
- Scales to multi-column (one Construct per column, or shared)

**Implementation timing:** Optional. May be implemented at beginning, between sets, or as polish. Not blocking for core Sets work.

---

## Core Principle

This is a platform like Minecraft where the blocks are co-created narrative, content, and code. The codebase should remain small and tight. Complexity emerges from play; the platform minimizes complicatedness.

**Multi-column architecture from the start.** Everything parameterized by `character_id`. Single column = multi-column with N=1. This prevents coupling that would require surgery later.

---

## The Five Systemic Sets

| Set | What It Is | Current State |
|-----|------------|---------------|
| **Shelf** | vapor/liquid/solid text states | Working |
| **Triad** | soft/medium/hard LLM tiers | Partial — Hard doesn't produce frames for Medium/Soft |
| **Context** | character/cosmology/coordinates/proximity | Partial — proximity not computed from coordinates |
| **Skills** | skills/packages/aperture | Exists but inert — skills don't compile into prompts |
| **Faces** | player/author/designer | UI works — routing doesn't actually differ |

---

## The Four Missing Bindings

1. **Hard → Frame → Medium/Soft**  
   Hard produces computed frame. Medium and Soft receive it as context.

2. **Skills → Prompts**  
   Skills are instructions, not stored text. LLM reads them.

3. **Coordinates → Proximity → Visibility**  
   Who sees whom from coordinate overlap, not table joins.

4. **Face → Domain → Output**  
   Same triad, different aperture skill, different output table.

Plus: **Async Solid Generation** — Medium writes placeholder immediately, synthesizes in background, updates via subscription.

---

## The Spine

**Hard-LLM produces a frame. Medium-LLM receives it.**

Everything else hangs off this. Once Hard outputs `character_context` and Medium reads from it, the system has the correct shape. Skills, faces, async — all become configuration of that core flow.

---

## Build Sequence

### Set 2: Triad Binding (First — This Is the Spine)

**Goal:** Hard produces frame → Medium/Soft consume it. Async solid generation.

**Prerequisite:** Rename `frames` → `sessions` (see migration below). This frees "frame" to mean the computed output.

**Database:**
- `character_context` IS the frame. Expand schema to hold:
  - Frame-for-Soft: `perceivable_content`, `character_state`
  - Frame-for-Medium: `proximate_characters`, `their_liquid`, `content_conditions`
  - Meta: `applicable_skills`, `compiled_at`, `expires_at`

**Edge Functions:**

*hard-llm:*
- Runs BEFORE Medium, not after
- Computes frame from character coordinates + aperture skills
- Writes to `character_context` table (this IS the frame)
- Triggered: on schedule for active characters + after solid commits

*generate-v2 (Medium):*
- Reads frame from `character_context` instead of querying DB directly
- Async solid: write placeholder row (narrative=null), synthesize, update
- Subscribe to solid updates on frontend

*generate-v2 (Soft):*
- Reads frame-for-soft from `character_context`
- Uses cached context for <500ms response

**Frontend:**
- Subscription to `character_context` changes
- Subscription to solid updates (for async generation)
- Loading indicator while solid.narrative is null

**Test:** Commit action → placeholder appears immediately → narrative fills in seconds later.

---

### Set 3: Context Binding

**Goal:** Proximity from coordinates. Visibility from proximity.

**Database:**
- `character_coordinates`: `session_id` optional (proximity comes from coordinates, not session membership)
- `character_proximity`: computed from coordinate overlap, not manually set
- `liquid`/`solid`: keep `session_id` for now as grouping, but visibility comes from proximity

**Edge Functions:**
- Proximity calculation function:
  ```
  spatial overlap + temporal overlap → close/nearby/far/distant
  ```
- Hard-LLM uses this to populate frame with proximate characters
- Visibility filter: liquid/vapor shown based on proximity state

**Frontend:**
- Remove frame selector dropdown (or repurpose as "session")
- Character selection drives cosmology context
- Liquid/vapor visibility based on computed proximity

**Test:** Two characters with overlapping coordinates see each other's liquid. Move apart → visibility changes.

---

### Set 4: Skills Binding

**Goal:** Skills compile into LLM prompts.

**Database:**
- No schema changes. `skills` table has `content` field with markdown.

**Edge Functions:**
- Skill loading function:
  ```sql
  SELECT * FROM skills 
  WHERE package_id IN (active_packages)
    AND $face = ANY(applies_to)
    AND category = $category
  ```
- Skill compilation: include skill content in system prompt
- Categories that matter:
  - `aperture`: what Hard loads
  - `gathering`: how Medium assembles context
  - `format`: how output is structured
  - `governance`: rules for designer proposals

**Test:** Create custom aperture skill → Hard loads different content. Change gathering skill → Medium assembles differently.

---

### Set 5: Faces Binding

**Goal:** Same triad, different domain per face.

**Routing:**

| Face | Soft Does | Medium Does | Hard Does | Output |
|------|-----------|-------------|-----------|--------|
| player | Refine action intention | Synthesize narrative | Character proximity | solid.narrative |
| author | Clarify content spec | Integrate into world | World-region proximity | content table |
| designer | Specify modification | Apply governance | Skill-space proximity | skills table |

**Edge Functions:**
- Aperture skill per face:
  - `aperture-player-character`
  - `aperture-author-content`  
  - `aperture-designer-skills`
- Medium output routing by face
- Hard proximity calculation by face (same algorithm, different weights)

**Frontend:**
- Face toggle already works
- Directory shows different content per face (characters/content/skills)

**Test:** Switch to author face → can create content. Switch to designer face → can propose skill changes.

---

## Single Column Architecture

**Principle:** Build single column properly. Parameterize by `character_id` so composition is possible, but render one column for Plex 1.

**What this means for implementation:**
- All state parameterized by `character_id`
- Components receive context as props, not global state
- Subscriptions scoped to specific character
- Desktop users get "multi-column" via browser tabs (free)

**Future enhancement (post-Plex-1):**
- Multi-column view within same page
- Shared Construct button or per-column input
- Side-by-side: Marcus in URB | Author view | Profile in reflex_world_1

**For now:** Single column. Tabs for desktop. Architecture supports N, UI renders 1.

---

## Frames → Sessions Rename

**The problem:** Current `frames` table conflates two concepts:
1. Session/configuration (grouping, XYZ settings, package bindings)
2. Computed context (what Hard-LLM produces for Medium/Soft)

**The documents say:** "Frames are computed outputs, not database records."

**The fix:**
- Rename `frames` → `sessions` (placeholder name — may change)
- Rename `frame_packages` → `session_packages`
- Update all foreign key references (`frame_id` → `session_id`)
- `character_context` becomes the true "frame" — computed by Hard-LLM

**Sessions may become redundant** once proximity-from-coordinates works. The grouping they provide ("these players are together") emerges naturally from coordinate overlap. But for now, keep them as scaffolding while transposing to the proper architecture.

**Migration:**
```sql
ALTER TABLE frames RENAME TO sessions;
ALTER TABLE frame_packages RENAME TO session_packages;
ALTER TABLE liquid RENAME COLUMN frame_id TO session_id;
ALTER TABLE solid RENAME COLUMN frame_id TO session_id;
ALTER TABLE content RENAME COLUMN frame_id TO session_id;
ALTER TABLE character_coordinates RENAME COLUMN frame_id TO session_id;
ALTER TABLE character_context RENAME COLUMN frame_id TO session_id;
```

---

## What NOT to Change Yet

- **Registration/onboarding:** Builds on top of working triad. Do after Sets 2-5.
- **Character-LLM (autonomous NPCs):** Post-Plex-1. Requires working triad first.

---

## Database Reference

### The Rename

```sql
-- Old: frames (was conflating session + computed context)
-- New: sessions (just grouping/config, may become redundant)

sessions (
  id UUID PRIMARY KEY,
  cosmology_id UUID,
  name TEXT,
  x_persistence BOOLEAN,
  y_temporality BOOLEAN,
  z_mutability BOOLEAN,
  pscale_floor INTEGER,
  pscale_ceiling INTEGER
)

session_packages (
  session_id UUID,
  package_id UUID,
  priority INTEGER
)
```

### Tables That Matter

```sql
-- Character position (session_id optional, may remove later)
character_coordinates (
  character_id UUID PRIMARY KEY,
  session_id UUID,   -- optional grouping, proximity comes from coordinates
  spatial TEXT,      -- "13.4" hierarchical coordinate
  temporal TEXT,     -- "348.1" time coordinate
  updated_at TIMESTAMP
)

-- THE TRUE FRAME: Computed output from Hard-LLM
character_context (
  character_id UUID PRIMARY KEY,
  session_id UUID,   -- optional session grouping
  
  -- Frame-for-Soft
  perceivable_content JSONB,
  character_state JSONB,
  
  -- Frame-for-Medium  
  proximate_characters JSONB,
  their_liquid JSONB,
  content_conditions JSONB,
  
  -- Meta
  applicable_skills JSONB,
  aperture_floor INTEGER,
  aperture_ceiling INTEGER,
  compiled_at TIMESTAMP,
  expires_at TIMESTAMP
)

-- Proximity derived from coordinates
character_proximity (
  character_id UUID PRIMARY KEY,
  close UUID[],
  nearby UUID[],
  distant UUID[],
  coordinated_at TIMESTAMP
)
```

### Async Solid Pattern

```sql
-- Medium writes placeholder
INSERT INTO solid (session_id, face, narrative, created_at)
VALUES ($1, 'character', NULL, now())
RETURNING id;

-- Medium updates after synthesis
UPDATE solid SET narrative = $2 WHERE id = $1;

-- Frontend subscribes to changes
supabase.channel('solid-updates')
  .on('postgres_changes', { event: 'UPDATE', table: 'solid' }, handler)
```

---

## Success Criteria

When complete:

1. **Hard produces frame** before Medium runs
2. **Medium reads frame** from character_context, not raw DB queries
3. **Async solid** shows placeholder immediately, fills in background
4. **Proximity** computed from coordinates, determines liquid visibility
5. **Skills** load by face/category, compile into prompts
6. **Face routing** sends output to correct table

**The Mos Eisley Test:** Three players, different characters, shared location. Each commits action. Medium synthesizes coherent scene. Each sees correlated-but-perspectival narrative.

---

## Notes for Claude Code

- Keep components under 200 lines
- Parameterize everything by character_id
- One commit per logical change
- Test each binding before moving to next set
- The spine (Set 2) is the priority — get Hard → Frame → Medium working first
