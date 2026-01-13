# Plex 1 Architecture: Unified Design for E, F, G

**Attempt 1 — January 2026**

---

## The Insight

Targets E, F, and G are not three systems. They are three **coordinate positions** in one system:

| Target | Coordinate Position | What Happens |
|--------|---------------------|--------------|
| **E** (Fantasy Play) | S:1+, T:1+, I:1+ | Players at whole-number coordinates — content, narrative |
| **F** (Registration) | S:1, T:1, I:0.x | User identity emerging — profile-character building |
| **G** (Code as Content) | S:0.x, T:0.x, I:0.x | Meta-layer — skills, rules, UI instructions |

Same table. Same loop. Same edge functions. The coordinate determines behavior.

---

## The Single Table

```sql
CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The three coordinates (hierarchical digit strings)
  t TEXT NOT NULL,        -- temporal: "348.1" = day 3, hour 4, block 8, minute 1
  s TEXT NOT NULL,        -- spatial: "13.4" = building 1, room 3, furniture 4
  i TEXT NOT NULL,        -- identity: "21." = group 2, individual 1

  -- Shelf state
  shelf TEXT NOT NULL CHECK (shelf IN ('vapor', 'liquid', 'solid')),

  -- The content
  text TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index for proximity queries (prefix matching)
CREATE INDEX idx_content_spatial ON content (s text_pattern_ops);
CREATE INDEX idx_content_temporal ON content (t text_pattern_ops);
CREATE INDEX idx_content_identity ON content (i text_pattern_ops);
CREATE INDEX idx_content_shelf ON content (shelf);
```

No frames table. No users table beyond auth. No cosmologies table. No categories.

---

## Coordinate Semantics

### Positive Coordinates = Content World

Whole-number coordinates locate entities in the narrative:

```
S: "13."   = Keep (1) → Kitchen (3)
T: "348."  = Day 3 → Hour 4 → Block 8 (the scene moment)
I: "21."   = Thornkeep folk (2) → Martha (1)
```

### Sub-unity Coordinates (0.x) = Meta/Code

When any coordinate starts with `0.`:

```
S: "0.11"  = Interface → Layout
T: "0.31"  = LLM Compilation → Soft-LLM prompt
I: "0.32"  = Medium-LLM identity/constraints
```

### How This Unifies E, F, G

**Target E (Fantasy Play):**
- Content at S:"13.", T:"348.", I:"21."
- Soft-LLM refines player intention into character action
- Medium-LLM synthesizes across proximate characters
- Hard-LLM updates coordinates, determinancy

**Target F (Registration):**
- Content at S:"1.", T:"1.", I:"0.1" (identity emerging)
- Same Soft-LLM, but skills at I:"0.x" guide profile-building
- Medium-LLM validates against reflection constraints
- Hard-LLM assigns identity coordinate when complete

**Target G (Code as Content):**
- Skills at S:"0.31", T:"0.31", I:"0.31" (Soft-LLM template)
- Designer edits text at these coordinates
- Next compilation loads updated skill
- The system modifies itself through the same loop

---

## The Three Edge Functions

### Soft-LLM

**Trigger:** Vapor submitted
**Input:** User text + proximate content + skills at 0.x
**Output:** Refined liquid

```typescript
// Pseudocode
async function soft(vapour: ContentEntry): Promise<ContentEntry> {
  // 1. Load skills by proximity to vapour coordinates
  const skills = await loadProximate({
    s: "0.3%",  // LLM compilation layer
    i: "0.31"   // Soft-LLM identity
  });

  // 2. Load entity context (character knowledge, etc.)
  const context = await loadProximate({
    s: vapour.s,
    t: vapour.t,
    i: vapour.i,
    shelf: 'solid'
  });

  // 3. Compile prompt from skills + context + vapour
  const prompt = compilePrompt(skills, context, vapour);

  // 4. Call LLM
  const refined = await callLLM(prompt);

  // 5. Return as liquid
  return { ...vapour, shelf: 'liquid', text: refined };
}
```

### Medium-LLM

**Trigger:** Commit (or coordination window closes)
**Input:** All liquid in proximity + skills
**Output:** Synthesized solid

```typescript
async function medium(trigger: ContentEntry): Promise<ContentEntry> {
  // 1. Gather all proximate liquid
  const allLiquid = await loadProximate({
    s: trigger.s.slice(0, -1) + '%',  // Same parent spatial
    t: trigger.t.slice(0, -1) + '%',  // Same temporal window
    shelf: 'liquid'
  });

  // 2. Load Medium skills
  const skills = await loadProximate({
    s: "0.3%",
    i: "0.32"  // Medium-LLM identity
  });

  // 3. Synthesize
  const narrative = await callLLM(compilePrompt(skills, allLiquid));

  // 4. Store as solid
  return {
    ...trigger,
    shelf: 'solid',
    text: narrative,
    // Coordinates may shift based on action outcome
  };
}
```

### Hard-LLM

**Trigger:** Solid created
**Input:** New solid + determinancy cloud + coordinate state
**Output:** Coordinate updates, frame recomputation

```typescript
async function hard(solid: ContentEntry): Promise<void> {
  // 1. Load Hard skills
  const skills = await loadProximate({
    s: "0.3%",
    i: "0.33"  // Hard-LLM identity
  });

  // 2. Analyze solid for coordinate implications
  const analysis = await callLLM(compilePrompt(skills, solid));

  // 3. Update coordinates (character moved, time advanced, etc.)
  await applyCoordinateUpdates(analysis.updates);

  // 4. Update determinancy cloud
  await updateDeterminancy(analysis.events);
}
```

---

## Proximity Queries

All context loading uses **prefix matching**:

```sql
-- Find content spatially proximate to S:"13."
SELECT * FROM content
WHERE s LIKE '13.%'    -- Same room
   OR s LIKE '1%'      -- Same building (less proximate)
   OR '13.' LIKE s || '%'  -- I'm more specific than stored content
```

The `sharedPrefixLength` algorithm from pscale-implementation.md determines proximity state:

| Shared Digits | State | Query |
|---------------|-------|-------|
| ≥2 | close | `WHERE s LIKE '13%'` |
| 1 | nearby | `WHERE s LIKE '1%'` |
| 0 | distant | All content at any s |

---

## Skills as Content at 0.x

Skills are just text at meta-coordinates. Example skill at `S:"0.31"`:

```markdown
# Soft-LLM: Player Face

## Identity
You are Soft-LLM, operating at pscale -1 to 0.
Tight aperture. Immediate response. Player-facing.

## Instructions
Given player vapour, refine into character action.
- Use first person for the character
- Keep to 1-2 sentences
- Express intention, not outcome
- Medium-LLM will synthesize with others

## Output Format
Return the refined text only. No metadata.
```

To modify system behavior, edit the text at `S:"0.31"`. Next compilation loads the updated skill.

---

## Real-time Subscriptions

```typescript
// Subscribe to proximate liquid (see others typing)
supabase
  .channel('liquid')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'content',
    filter: `shelf=eq.liquid`
  }, (payload) => {
    // Filter by coordinate proximity client-side
    if (isProximate(payload.new, myCoordinates)) {
      updateLiquidZone(payload.new);
    }
  })
  .subscribe();
```

---

## Bootstrap Sequence

### First Content (The Seed)

Before any user exists, we need content at 0.x to define how the system works:

```sql
-- Seed: Soft-LLM skill
INSERT INTO content (t, s, i, shelf, text, created_by) VALUES (
  '0.31', '0.31', '0.31', 'solid',
  '# Soft-LLM: Default Skill\n\nRefine vapour into liquid...',
  NULL  -- System-created
);

-- Seed: Medium-LLM skill
INSERT INTO content (t, s, i, shelf, text, created_by) VALUES (
  '0.32', '0.32', '0.32', 'solid',
  '# Medium-LLM: Default Skill\n\nSynthesize liquid into solid...',
  NULL
);

-- Seed: Hard-LLM skill
INSERT INTO content (t, s, i, shelf, text, created_by) VALUES (
  '0.33', '0.33', '0.33', 'solid',
  '# Hard-LLM: Default Skill\n\nUpdate coordinates, maintain determinancy...',
  NULL
);

-- Seed: Entry point (where new users start)
INSERT INTO content (t, s, i, shelf, text, created_by) VALUES (
  '1.', '1.', '0.', 'solid',
  '# Entry Point\n\nNew users begin here. Identity coordinate 0 = no identity yet...',
  NULL
);
```

### Registration Flow (Target F)

1. User authenticates (Supabase auth)
2. System creates vapour at `S:"1.", T:"1.", I:"0.1"` (identity emerging)
3. Soft-LLM (with onboarding skills) asks "tell me about yourself"
4. User responds, loop iterates
5. Hard-LLM assigns full identity coordinate when profile complete
6. User can now enter fantasy world (Target E) at `I:"21."` etc.

---

## File Structure

```
src/
  App.tsx                    # Minimal orchestrator
  components/
    VapourZone.tsx           # Input + soft response
    LiquidZone.tsx           # Others' proposals
    SolidZone.tsx            # Committed narrative
  lib/
    supabase.ts              # Client
    coordinates.ts           # Pscale utilities
    proximity.ts             # Prefix matching
  hooks/
    useContent.ts            # CRUD + subscriptions
    useCoordinates.ts        # Current position
supabase/
  functions/
    soft/                    # Soft-LLM edge function
    medium/                  # Medium-LLM edge function
    hard/                    # Hard-LLM edge function
  migrations/
    001_content_table.sql    # Single table
    002_seed_skills.sql      # Bootstrap 0.x content
```

---

## What Makes This Different

**No type fields.** Content at `S:"13."` and content at `S:"0.31"` are the same entity type. The coordinate IS the type.

**No operation categories.** Player action, designer edit, registration step — all traverse the same loop. Skills loaded by proximity determine behavior.

**No stored frames.** Frame = `SELECT ... WHERE s LIKE prefix AND t LIKE prefix`. Computed fresh each time.

**Self-modifying.** The skills that govern the LLMs are content in the same table. Edit them through the same loop.

---

## Immediate Next Actions

1. **Create content table** with pscale coordinates
2. **Seed 0.x skills** (minimal Soft/Medium/Hard prompts)
3. **Wire VapourZone** to insert vapour at test coordinates
4. **Implement Soft edge function** — load skills, refine, store liquid
5. **Wire LiquidZone** to subscribe to proximate liquid
6. **Test with two browsers** — see each other's liquid

This proves the core loop. Then:
- Medium synthesis
- Hard coordination
- Real-time typing (vapor presence)
- Registration flow (Target F)
- Skill editing (Target G)

---

## Open Questions

1. **How do we handle temporal advancement?** Does Hard-LLM increment T coordinate after each solid? Or is T external clock-driven?

2. **Cosmology as coordinate prefix?** Different fictional worlds could be different high-pscale S prefixes. But the constraint says "no cosmologies table."

3. **Aperture storage.** Where does a character's current aperture live? As content at their identity coordinate?

4. **Auth → Identity mapping.** Supabase auth gives us a UUID. How does that map to pscale identity coordinate? Stored as content at `I:"0.user-uuid"`?

---

*Attempt 1 design document. To be updated as implementation reveals what works.*
