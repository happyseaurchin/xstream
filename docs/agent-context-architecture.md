# Agent-Context Architecture

**The Three Faces: Foreground Scope vs Background Context**

---

## Plex 0: The Bootstrap

You are reading a document created in Plex 0.

Plex 0 is the current state: a human (David) wearing all three faces simultaneously, collaborating with a proto-LLM (Claude) that hasn't yet specialized. The tools:

| Component | Plex 0 Implementation |
|-----------|----------------------|
| Interface | Claude.ai (this conversation) |
| Database | Supabase (xstream project) |
| Orchestration | n8n (xstream-orchestration) |
| Code | GitHub (happyseaurchin/xstream) |
| Skills | These documents |

In Plex 0, there is no separation between Player, Author, and Designer. David is all three. Claude is the undifferentiated LLM that will become Character-LLM, Author-LLM, and Designer-LLM. The work happening now creates the conditions for Plex 1, where the faces separate and the system becomes usable by others.

**Plex 0 is the chicken that lays the egg.**

---

## Core Insight

Every user wears one of three faces. Each face operates **in** a specific context and **on** a specific scope. What they can affect (foreground) differs from what informs them (background).

**Critical Distinction:** There are TWO different relationships at play:

1. **Context Flow** (transitive, hierarchical):
   - Author output becomes Player context (world content → narrative environment)
   - Player output affects other Players (and feeds upward through events)

2. **Skill Modification** (direct, non-hierarchical):
   - Designer modifies Player skills directly
   - Designer modifies Author skills directly
   - Designer modifies Designer skills directly ← the bootstrap problem

These are not the same thing. Designer doesn't "control" Authors who "control" Players. Designer modifies the **compilation rules** used at all levels.

---

## The Bootstrap Problem

Who creates the first designer skills? The recursion must terminate somewhere.

**Answer: Platform is the only hard-coded layer.** (And Platform is created in Plex 0.)

```
┌─────────────────────────────────────────────────┐
│  PLATFORM (hard-coded, Onen/David only)         │
│  • What a skill IS (structure, format)          │
│  • What skills CAN'T do (guard rails)           │
│  • The compiler that assembles skills           │
│  • The minimal interface (input → shelf → LLM)  │
└─────────────────────────────────────────────────┘
                      ↓
         Everything below is skills/packages
```

When in Designer mode, the system uses `designer-skills` to compile your prompt. Those designer-skills are themselves skills. The bootstrap:

1. Platform defines the *structure* of skills (what fields, what format)
2. Platform provides *default* designer-skills (how to help someone write skills)
3. Designer can modify designer-skills (using the default designer-skills to do so)
4. Modified designer-skills are used for future designer operations

The recursion terminates at Platform. Platform is created in Plex 0 by David + Claude before the system exists.

---

## The Three Agents

### 1. Player (Character-World Relationship)

**Operates IN:** The fantasy world (as a Twilighter)  
**Operates ON:** Character intentions only

| Aspect | Description |
|--------|-------------|
| **Foreground Scope** | Controls the *intentionality* of a character. "I want to sneak past the guards." The rules of how that intention becomes action are defined by the DM/system. |
| **Output** | Prompts expressing character desire → narrative generation |
| **Background Context** | The world as it exists, other characters present, character capabilities, scene constraints |
| **Cannot Touch** | World content directly. Cannot declare "there is a door here." Can only intend within what exists. |
| **Pscale Range** | Zero (moment-to-moment) |

**Soft-LLM function:** Mediates player-character relationship. "Can my character do this?"  
**Medium-LLM function:** Coordinates character interactions, generates narrative  
**Hard-LLM function:** Determines narrative proximity (which characters are "close")

---

### 2. Author (World-Content Relationship)

**Operates IN:** The universe (as an architect/god)  
**Operates ON:** World content directly

| Aspect | Description |
|--------|-------------|
| **Foreground Scope** | Creates and modifies world content. Adds stories, locations, events. Establishes what exists and what has happened. |
| **Output** | World content → database (not delivered to players directly, but accessible when they enter that region) |
| **Background Context** | Existing world content, P-scale structure, other authors' contributions, canonical history |
| **Cannot Touch** | The rules by which world content becomes narrative. Cannot change how Player prompts are processed. |
| **Pscale Range** | Positive (+1 to +10: social → civilisational) |

**Soft-LLM function:** Mediates author-world relationship. "Does this fit the world?"  
**Medium-LLM function:** Coordinates authors working in same region, synthesizes contributions  
**Hard-LLM function:** Determines world context (what exists, what has settled)

**URB Parallel:** The Meherim creating the illusory world for Twilighters

---

### 3. Designer (User-System Relationship)

**Operates IN:** The skills/system layer (as a meta-architect)  
**Operates ON:** The rules/skills that govern how Players and Authors operate

| Aspect | Description |
|--------|-------------|
| **Foreground Scope** | Creates and modifies skills. Defines how prompts are compiled, how context is gathered, how generation rules work. |
| **Output** | Skills (compilation protocols) → affects how all subsequent LLM calls are assembled |
| **Background Context** | Existing skills base, other designers' modifications, platform constraints |
| **Cannot Touch** | Core platform mechanics (guard rails). Cannot bypass logging, cannot access other players' private data. |
| **Pscale Range** | Negative (-5 to -6: preconscious/meta) |

**Soft-LLM function:** Mediates user-system relationship. "Will this modification work?"  
**Medium-LLM function:** Coordinates designers working on related skills  
**Hard-LLM function:** Determines architectural proximity (which skills affect which processes)

---

## The Two Relationships Clarified

### 1. Context Flow (What becomes environment for what)

```
AUTHOR OUTPUT ──→ becomes world context ──→ PLAYER operates within
PLAYER OUTPUT ──→ becomes narrative events ──→ feeds back to AUTHORS
```

### 2. Skill Modification (What Designer can touch)

```
DESIGNER ───┬──→ modifies PLAYER skills (direct)
            ├──→ modifies AUTHOR skills (direct)
            ├──→ modifies DESIGNER skills (direct)
            └──→ constrained by PLATFORM (hard-coded minimum)
```

These are orthogonal. The context flows between Authors and Players. The Designer operates on the *rules* at all levels simultaneously.

---

## The Package System

Packages are composable skill-bundles with signatures. Not hierarchical control, but **composition**:

| Level | Example | What It Contains | Signed By |
|-------|---------|------------------|----------|
| **Platform** | `onen` | Kernel structure, guard rails, skill format | David (hard-coded) |
| **Rule-set** | `nomad`, `d&d`, `freeform` | Resolution mechanics, evaluation skills | Rule-set author |
| **World** | `urb`, `forgotten-realms` | World-specific gathering, content rules, lore | World author |
| **Campaign** | `david-urb-campaign-1` | Tone, lethality, session-specific tuning | Campaign manager |

**Composition Examples:**
- Campaign A uses `urb` world + `nomad` rules + `david-player-skills`
- Campaign B uses `urb` world + `d&d` rules + `standard-player-skills`
- Both run on `onen` platform

**Signature Authority:**
- `onen-official` = David's stamp (platform level)
- `urb-official` = David's stamp (world level, for URB specifically)
- `nomad-official` = David's stamp (rule-set level, for NOMAD)
- `david-*` = David's personal skill contexts (campaign level)

Anyone can create packages at any level. The signature indicates provenance, not permission.

---

## Skills as Background Context

Skills are what **operates on** the agent (input/context), not what they **operate on** (output).

| Agent | Skills That Inform Them |
|-------|------------------------|
| **Player** | Character generation rules, world rules, evaluation rules, narrative format rules |
| **Author** | World structure protocols, P-scale assignment rules, content integration rules |
| **Designer** | Platform skills (read-only), skill creation templates, architectural constraints |

**Key Insight:** Skills are the "background context" that shapes how each agent's foreground actions are processed. The Designer modifies skills; those skills then become context for Authors and Players.

---

## Skill-Context Sets

Each face (Player, Author, Designer) has its own skill-context set that can be packaged:

| Set | What It Governs | Example Skills |
|-----|-----------------|----------------|
| `*-skill-context-player` | How player prompts are compiled | Character generation, action evaluation, narrative format |
| `*-skill-context-author` | How author prompts are compiled | World integration, content validation, lore consistency |
| `*-skill-context-designer` | How designer prompts are compiled | Skill creation templates, modification validation |

**Naming Convention:** `{signature}-skill-context-{face}`
- `david-skill-context-player` = David's player skill set
- `urb-official-skill-context-author` = Official URB author skills
- `onen-skill-context-designer` = Platform default designer skills

---

## Package Resolution

When a user enters a context, skills are loaded from multiple packages:

```
Platform (onen) 
    └── Rule-set (nomad)
            └── World (urb)
                    └── Campaign (david-urb-campaign-1)
                            └── User's face (player/author/designer)
```

**Resolution Rules:**
- Lower levels can **override** higher levels (campaign overrides world)
- Lower levels can **extend** higher levels (add skills, don't remove)
- Platform guard rails **cannot** be overridden (hard-coded)

| Level | Who Creates | What They Create | Scope |
|-------|-------------|------------------|-------|
| Platform | Onen only | Base mechanics, guard rails | All users |
| Rule-set | Rule-set authors | Resolution mechanics | Users in campaigns using this rule-set |
| World | World authors | World-specific skills | Users in campaigns in this world |
| Campaign | Campaign managers | Session tuning | Users in this campaign |

---

## Same Interface, Different Coordinates

All three faces use the same Xstream interface:
- Text input → Shelf
- Synthesis display
- Triple-LLM stack

What differs:
- **Which world is queried** (fantasy world, world-content database, skills base)
- **What "synthesis" means** (narrative, integrated lore, interface change)
- **What the input becomes** (action/dialogue, world content, config/skills)

---

## The LLM Pairs

Each face has both a **mediating stack** (Soft/Medium/Hard) and a **simulating LLM**:

| Face | Stack Function | Simulation LLM |
|------|---------------|----------------|
| Player | Mediates human-character relationship | Character-LLM (generates NPC behavior) |
| Author | Mediates human-world relationship | Author-LLM (generates world content autonomously) |
| Designer | Mediates human-system relationship | Designer-LLM (generates skill modifications autonomously) |

The simulation LLMs allow AI agents to operate in the same space as humans, entering through the same door.

**Plex 0 Note:** Currently, Claude serves as all three simulation LLMs undifferentiated. Specialization happens as Plex 1 develops.

---

## Minimal Definition

**Player:** "I want X" → system determines if/how  
**Author:** "X exists" → system integrates it  
**Designer:** "X works this way" → system uses it for all subsequent operations  

Each operates within constraints set by the level above. Each produces context for the level below.

---

## The Package Principle

The architecture is a kernel, not a product. "Onen" is just the platform layer—the hard-coded minimum.

Everything above platform is **packaged skills**:

```
Platform: onen (hard-coded)
    ├── Rule-sets: nomad, d&d, freeform, etc.
    ├── Worlds: urb, custom-world-1, etc.
    ├── Campaigns: david-urb-1, public-urb-starter, etc.
    └── Skill-context sets: david-skill-context-player, etc.
```

**Anyone can create packages** at any level except Platform:
- Create a new rule-set (resolution mechanics)
- Create a new world (content and gathering rules)
- Create a new campaign (tuning for a specific group)
- Create skill-context sets (personal preferences for how prompts compile)

**Official stamps** are just David's signature indicating "this is canonical":
- `onen-official` on platform
- `urb-official` on URB world
- `nomad-official` on NOMAD rule-set

The signature is provenance, not permission. Unofficial packages work identically.

---

## Implementation Note

The "trickiest bit" from the original design: The Designer level must be carefully constrained. Designers modify skills, not code. Skills are markdown files with specific scope:

| Skill Type | Designer Can Customize | Designer Cannot |
|------------|------------------------|------------------|
| Aperture | Which pscale layers to include | Access all layers simultaneously |
| Evaluation | Modifiers, difficulty scales | Skip evaluation entirely |
| Gathering | Filter criteria | Access other users' private data |
| Format | Style, structure | Bypass logging |

The platform defines **what's possible**. Designers customize **within those bounds**.

This prevents the meta-level from consuming everything while still enabling meaningful modification of how the system operates.