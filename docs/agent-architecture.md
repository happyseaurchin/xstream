# Agent Architecture

How the three faces (Player, Author, Designer) relate to LLMs, context, and skills.

---

## Core Insight

Every user wears one of three faces. Each face operates **in** a specific context and **on** a specific scope. What they can affect (foreground) differs from what informs them (background).

**Two relationships at play:**

1. **Context Flow** (transitive):
   - Author output becomes Player context (world content → narrative environment)
   - Player output affects other Players (and feeds upward through events)

2. **Skill Modification** (direct):
   - Designer modifies Player skills
   - Designer modifies Author skills
   - Designer modifies Designer skills

Designer doesn't "control" Authors who "control" Players. Designer modifies the **compilation rules** used at all levels.

---

## The Three Faces

### Player (Character-World Relationship)

**Operates IN:** The fantasy world
**Operates ON:** Character intentions only

| Aspect | Description |
|--------|-------------|
| **Foreground** | Controls character *intentionality*. "I want to sneak past the guards." |
| **Output** | Prompts expressing character desire → narrative generation |
| **Background** | World as it exists, other characters, capabilities, scene constraints |
| **Cannot Touch** | World content directly. Cannot declare "there is a door here." |
| **Pscale Range** | Zero (moment-to-moment) |

### Author (World-Content Relationship)

**Operates IN:** The universe (as architect)
**Operates ON:** World content directly

| Aspect | Description |
|--------|-------------|
| **Foreground** | Creates/modifies world content. Adds stories, locations, events. |
| **Output** | World content → database (accessible when players enter that region) |
| **Background** | Existing world content, P-scale structure, other authors' contributions |
| **Cannot Touch** | The rules by which world content becomes narrative |
| **Pscale Range** | Positive (+1 to +10: social → civilisational) |

### Designer (User-System Relationship)

**Operates IN:** The skills/system layer (as meta-architect)
**Operates ON:** The rules/skills that govern how Players and Authors operate

| Aspect | Description |
|--------|-------------|
| **Foreground** | Creates/modifies skills. Defines how prompts compile, how context gathers. |
| **Output** | Skills → affects how all subsequent LLM calls are assembled |
| **Background** | Existing skills base, other designers' modifications, platform constraints |
| **Cannot Touch** | Core platform mechanics (guard rails) |
| **Pscale Range** | Negative (-5 to -6: preconscious/meta) |

---

## LLM Stack Per Face

Each face has both a **mediating stack** (Soft/Medium/Hard) and a **simulation LLM**:

| Face | Soft-LLM | Medium-LLM | Hard-LLM | Simulation |
|------|----------|------------|----------|------------|
| Player | "Can my character do this?" | Coordinate interactions, generate narrative | Determine narrative proximity | Character-LLM (NPC behavior) |
| Author | "Does this fit the world?" | Coordinate authors in same region | Determine world context | Author-LLM (autonomous content) |
| Designer | "Will this modification work?" | Coordinate designers on related skills | Determine architectural proximity | Designer-LLM (autonomous skill mods) |

The simulation LLMs allow AI agents to operate in the same space as humans, entering through the same door.

---

## The Bootstrap Problem

Who creates the first designer skills? The recursion must terminate somewhere.

**Answer: Platform is the only hard-coded layer.**

```
┌─────────────────────────────────────────────────┐
│  PLATFORM (hard-coded)                          │
│  • What a skill IS (structure, format)          │
│  • What skills CAN'T do (guard rails)           │
│  • The compiler that assembles skills           │
│  • The minimal interface (input → shelf → LLM)  │
└─────────────────────────────────────────────────┘
                      ↓
         Everything below is skills/packages
```

The bootstrap:
1. Platform defines the *structure* of skills
2. Platform provides *default* designer-skills
3. Designer can modify designer-skills (using defaults)
4. Modified designer-skills used for future operations

---

## Context Flow vs Skill Modification

### Context Flow (What becomes environment for what)

```
AUTHOR OUTPUT ──→ becomes world context ──→ PLAYER operates within
PLAYER OUTPUT ──→ becomes narrative events ──→ feeds back to AUTHORS
```

### Skill Modification (What Designer can touch)

```
DESIGNER ───┬──→ modifies PLAYER skills (direct)
            ├──→ modifies AUTHOR skills (direct)
            ├──→ modifies DESIGNER skills (direct)
            └──→ constrained by PLATFORM (hard-coded minimum)
```

These are orthogonal. Context flows between Authors and Players. Designer operates on the *rules* at all levels simultaneously.

---

## Package System

Packages are composable skill-bundles:

| Level | Example | Contains | Signed By |
|-------|---------|----------|-----------|
| **Platform** | `onen` | Kernel structure, guard rails | Platform (hard-coded) |
| **Rule-set** | `nomad`, `d&d` | Resolution mechanics | Rule-set author |
| **World** | `urb` | World-specific rules, lore | World author |
| **Campaign** | `campaign-1` | Tone, lethality, tuning | Campaign manager |

**Resolution:**
```
Platform (onen)
    └── Rule-set (nomad)
            └── World (urb)
                    └── Campaign (campaign-1)
                            └── User's face (player/author/designer)
```

Lower levels can override or extend higher levels. Platform guard rails cannot be overridden.

---

## Skills as Background Context

Skills are what **operates on** the agent (input/context), not what they **operate on** (output).

| Face | Skills That Inform Them |
|------|------------------------|
| Player | Character generation, world rules, evaluation, narrative format |
| Author | World structure protocols, P-scale assignment, content integration |
| Designer | Skill creation templates, architectural constraints |

Skills are "background context" that shapes how foreground actions are processed.

---

## Designer Constraints

Designers modify skills, not code. Skills have specific scope:

| Skill Type | Can Customize | Cannot |
|------------|---------------|--------|
| Aperture | Which pscale layers to include | Access all layers simultaneously |
| Evaluation | Modifiers, difficulty scales | Skip evaluation entirely |
| Gathering | Filter criteria | Access other users' private data |
| Format | Style, structure | Bypass logging |

Platform defines **what's possible**. Designers customize **within those bounds**.

---

## Minimal Definition

**Player:** "I want X" → system determines if/how
**Author:** "X exists" → system integrates it
**Designer:** "X works this way" → system uses it for all subsequent operations

Each operates within constraints set by the level above. Each produces context for the level below.

---

## Same Interface, Different Coordinates

All three faces use the same interface:
- Text input → Shelf (vapor → liquid → solid)
- Triple-LLM stack
- Synthesis display

What differs:
- **Which content is queried** (world, content database, skills base)
- **What "synthesis" means** (narrative, integrated lore, interface change)
- **What input becomes** (action, world content, skills)

This is coordinate-based. Face selection = coordinate movement → different skills proximate.
