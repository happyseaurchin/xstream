# The Single Loop

## The Vision

**Minecraft for narrative.** Blocks are co-created text — narrative, world content, code. Players don't consume story; they build it together, block by block, in real-time.

**A mass listening device.** Hundreds of concurrent voices synthesized into cohesive narrative. Not turn-taking. Simultaneous expression, LLM-mediated into shared meaning. Architecture that scales to millions.

**Reflexive reading.** Text transforms in the moment of reading — compiled live in the reader's mind. Not documents but experiences. Three thousand years of static text, disrupted.

**High-trust preparation.** A simple app maximizing human engagement through text, so when we meet in person, we do so having already listened deeply. Imagination synchronized before bodies convene.

**LLM-native.** Maximizing what language models do naturally — interpret, synthesize, respond. Avoiding external frameworks, rigid schemas, code where prompt suffices. The system thinks in language because LLMs think in language.

---

## What This Is

One code path serves all operations. Player intention, designer proposal, author content, registration profile — all traverse the same loop. Variation comes from skills, not branches.

---

## The Loop

```
vapor → [soft-LLM] → liquid → [medium-LLM] → solid → [hard-LLM] → frame update → ...
```

| Stage | What Happens | Output |
|-------|--------------|--------|
| **Vapor** | Human types, LLM sees live | Transient stream |
| **Soft** | Refines intention against character knowledge | Liquid (proposed) |
| **Liquid** | Visible to coordinate-proximate entities | Input to Medium |
| **Medium** | Synthesizes across entities, applies skill rules | Solid (contingent) |
| **Solid** | Committed for this entity's perspective | Stored, triggers Hard |
| **Hard** | Updates coordinates, recomputes frames | New context for next loop |

This is the only path. Everything passes through it.

---

## Pscale as Filter

What enters each LLM stage is determined by **coordinate proximity**. Not by type, role, or operation category.

```
Frame = f(entity_coordinates, proximity_threshold, pscale_level)
```

The frame for a player-character in a tavern and the frame for a designer proposing a skill change are computed identically: *what's coordinate-proximate to this entity right now?*

### Proximity Dimensions

| Dimension | What It Measures | Example |
|-----------|------------------|---------|
| **Temporal** | When relative to now | Yesterday's conversation vs. ancient lore |
| **Spatial** | Where relative to here | Same room vs. distant kingdom |
| **Identity** | Who relative to self | Close friend vs. stranger vs. institution |

### The Filter Rule

**Lower pscale trumps higher pscale.**

When a player-character acts (pscale 0), it pulls proximate entities into that temporal window — like "I attack" pulling everyone into combat rounds. When a designer proposes (pscale 0), it surfaces governance rules (negative pscale) that apply at that scope.

The filter doesn't know what kind of action is happening. It only knows: *these coordinates are proximate to these coordinates.*

---

## Skills as Variation

The skill-pack loaded determines what the loop *does* at each stage:

| Skill Pack | Soft Does | Medium Does | Hard Does |
|------------|-----------|-------------|-----------|
| **Scene** | Refines player intention into character action | Synthesizes actions, applies physics/rules | Updates character coordinates, perceivable state |
| **Governance** | Refines designer proposal into formal change | Applies voting/threshold rules | Commits or rejects, updates cosmology state |
| **Authoring** | Refines author content into canonical form | Validates against cosmology constraints | Places content at coordinates |
| **Onboarding** | Guides self-description into profile | Validates against reflection constraints | Builds profile-character progressively |

### What Skills Contain

```markdown
# [Skill Name]

## Context
What this skill applies to (coordinate range, entity types)

## Soft Instructions
How to refine vapor → liquid

## Medium Instructions
How to synthesize liquid → solid
What rules/constraints apply

## Hard Instructions
What coordinates update
What triggers next frame computation
```

Skills are markdown. LLMs interpret them. No parsing, no schema — natural language instructions that compile at read-time.

---

## Faces as Skill Selection

"Switching faces" = switching which skill-pack Soft loads. The loop doesn't know the difference.

| Face | Primary Skill Pack | What User Experiences |
|------|-------------------|----------------------|
| **Player** | Scene | "I do X" → character acts |
| **Author** | Authoring | "This exists" → content placed |
| **Designer** | Governance | "This should change" → proposal evaluated |

### Face Selection Is Coordinate-Based

A user doesn't "switch modes." Their current coordinates determine which skills are proximate:

- At character-coordinates → scene skills load
- At cosmology-coordinates (meta) → governance skills load
- At content-coordinates (authoring) → authoring skills load

The UI may present this as "tabs" or "faces," but underneath: same loop, different skill proximity.

---

## Bootstrap: How Loops Begin

### First Loop (Registration)

Platform performs ONE hard-coded operation: creates stub entity at `reflex_world_1` coordinates and instantiates the loop.

```
PLATFORM: create_entity(coordinates: reflex_world_1.entry)
          instantiate_loop(skill_pack: onboarding)
```

From this point, the onboarding skill-pack drives everything:
- Soft asks "tell me about yourself"
- Medium validates against reflection constraints
- Hard updates profile-character as it builds

**No special registration system.** Just the loop with onboarding skills.

### Subsequent Loops

Every new context (joining a cosmology, entering a scene, opening designer view) instantiates the same loop:

```
instantiate_loop(
  entity: [character_id | user_id],
  coordinates: [entry_point],
  skill_pack: [determined by coordinate proximity]
)
```

Invitations, transitions, new characters — all just loop instantiation with appropriate starting coordinates.

---

## Database: Minimal Schema

```sql
-- Entities with coordinates
entities (
  id,
  cosmology_id,
  coordinates,      -- pscale position (t, s, i)
  entity_type       -- character | content | skill | user
)

-- Content at coordinates
content (
  id,
  entity_id,
  coordinates,
  shelf,            -- vapor | liquid | solid
  text
)

-- Skills (also content, but loaded as instructions)
skills (
  id,
  cosmology_id,
  coordinates,      -- what scope this skill applies to
  skill_text        -- markdown instructions
)
```

**No frames table.** Frames are computed from coordinate proximity queries.

**No operations table.** Operations are just content moving through shelf states.

**No governance table.** Governance is skills at negative pscale coordinates.

---

## What This Prevents

| Problem | How Single Loop Prevents It |
|---------|----------------------------|
| Code branches per operation type | One path. Skills vary behavior. |
| Stored frames getting stale | Frames computed fresh from coordinates. |
| Registration as special architecture | Just onboarding skills in reflex_world_1. |
| Governance as separate system | Just skills Medium applies at meta-coordinates. |
| Face-switching as mode change | Just coordinate movement loading different skills. |

---

## The Recursive Property

Designers can propose changes to skills — including governance skills. Those proposals traverse the same loop, with current governance skills determining whether the change commits.

This isn't a feature. It's what happens when you have one loop and skills are just coordinate-proximate content.

---

## Implementation Sequence

Because everything is the same loop, implementation order is:

1. **The loop** — vapor/liquid/solid transitions, triple-LLM calls
2. **Coordinate proximity** — frame computation from pscale
3. **Skill loading** — markdown retrieval and injection into LLM context
4. **One skill pack** — prove the loop works with scene skills
5. **Additional skill packs** — governance, authoring, onboarding are variations

Once (1-4) work, adding new behaviors is writing markdown, not code.

---

## Summary

One loop. Pscale filters what enters. Skills determine what happens. Faces are UI over skill selection. Bootstrap is just first loop instantiation.

The system doesn't distinguish player from designer from author. It only knows: *entity at coordinates, proximate content, loaded skills, run loop.*
