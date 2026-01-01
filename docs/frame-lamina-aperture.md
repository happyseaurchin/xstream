# Frame, Lamina, Aperture: Clarification Document

**Purpose**: Companion to plex-1-specification.md  
**Context**: This document clarifies the relationship between three often-confused concepts and establishes that Frame is Hard-LLM's *output*, not its container.

---

## The Core Confusion

Three terms get tangled:
- **Lamina** — Where am I?
- **Aperture** — What's in scope?
- **Frame** — What's my operational context?

They're related but distinct. Getting them right is crucial for non-centralized architecture.

---

## The Output Hierarchy

Each LLM tier in the triad produces a different kind of output:

| LLM | Produces | For Whom | State |
|-----|----------|----------|-------|
| **Soft-LLM** | Immediate response | The user directly | Vapor |
| **Medium-LLM** | Settled narrative | All close participants | Solid |
| **Hard-LLM** | Operational context | The user's other LLMs | **Frame** |

**Key insight**: Frame isn't a static container that Hard-LLM operates *within*. Frame is what Hard-LLM *produces* — the assembled context that Soft and Medium need to do their work.

---

## The Three Terms Defined

### Lamina — Coordinates

**What it answers**: Where is this entity located in pscale space?

**Analogy**: GPS coordinates

Lamina is the position marker for any entity (character, content, skill):

```typescript
interface Lamina {
  // Spatial: where in the world hierarchy
  spatial_pscale: number;     // 0 = room, +3 = city, +6 = nation
  location_id?: string;       // Content reference
  
  // Temporal: when in the action/history
  temporal_pscale: number;    // -2 = this moment, +1 = scene, +4 = era
  
  // Identity: who (individual → group → faction)
  identity_pscale?: number;   // 0 = individual, +2 = party, +5 = civilization
  
  // Optional narrowing
  focus?: string;             // What attention is on
}
```

Every character has lamina. Every piece of content has lamina. Every skill has lamina (which faces it affects, what scope it operates at).

### Aperture — Filter

**What it answers**: Given my location, what range of content is relevant?

**Analogy**: Camera lens zoom level

Aperture determines what's visible from a given lamina position:

```typescript
interface Aperture {
  // Spatial range
  spatial_floor: number;      // Minimum detail level
  spatial_ceiling: number;    // Maximum scope level
  
  // Temporal range
  temporal_window: number;    // How far back is relevant
  
  // Identity range (optional)
  identity_scope?: number;    // Individual vs group context
}
```

**Example**: Character in combat (lamina at spatial 0, temporal -2)
- Aperture floor: -2 (object details matter)
- Aperture ceiling: 0 (room-level context)
- Temporal window: -3 (last few seconds)

**Example**: Character exploring city (lamina at spatial +2, temporal 0)
- Aperture floor: +1 (building-level minimum)
- Aperture ceiling: +4 (regional context)
- Temporal window: +1 (recent events)

### Frame — Operational Context

**What it answers**: What does this user's LLM stack need to operate?

**Analogy**: The photograph itself (result of pointing camera at location with chosen zoom)

Frame is the *assembled result* of applying aperture to lamina:

```typescript
interface OperationalFrame {
  // Who's here
  proximity: {
    close: string[];          // Characters whose actions coordinate
    nearby: string[];         // Visible but not immediate
    distant: string[];        // Context only
  };
  
  // What's relevant
  content: ContentEntry[];    // Filtered by aperture
  
  // How to process
  skills: SkillSet;           // Resolved package stack
  
  // Configuration
  xyz: {
    x_persistence: boolean;
    y_temporality: boolean;
    z_mutability: boolean;
  };
  
  // Boundaries
  cosmology_id: string;       // Which fictional world
  pscale_range: {
    floor: number;
    ceiling: number;
  };
}
```

---

## Database "Frame" vs Operational Frame

**Critical distinction**:

| Database `frames` table | Hard-LLM output |
|------------------------|----------------|
| Configuration template | Live operational context |
| Static record | Constructed fresh each cycle |
| Defines boundaries | Assembles everything needed |
| Created by Designer | Produced by Hard-LLM |

The `frames` table stores:
- cosmology_id (which world)
- pscale_floor/ceiling (operational range)
- XYZ configuration
- Package attachments (via frame_packages)

But this is just the *template*. Hard-LLM reads this template plus:
- Current character lamina (where they are now)
- Other characters' lamina (who else is around)
- Content with pscale coordinates (what exists)
- Skills with package structure (how to process)

And produces the *operational frame* that Soft and Medium actually use.

---

## Hard-LLM Constructs the Frame

```
Hard-LLM inputs:
  ├── User's face (player/author/designer)
  ├── Frame template (from database)
  ├── Current lamina (character position)
  ├── Other Hard-LLMs' lamina (coordination)
  ├── Content table (with pscale coordinates)
  └── Skills table (with package structure)
          │
          ▼
Hard-LLM processing:
  ├── Determine aperture (based on face + action pscale)
  ├── Filter content (by aperture from lamina)
  ├── Discover proximity (by coordinate overlap)
  ├── Resolve skills (by package priority)
  └── Assemble operational frame
          │
          ▼
Hard-LLM output:
  └── Operational Frame
          │
          ├──▶ Medium-LLM uses for synthesis
          └──▶ Soft-LLM uses for immediate response
```

---

## Per-Face Complexity

Frame construction difficulty varies by face:

| Face | Complexity | Why |
|------|------------|-----|
| **Designer** | Lowest | Navigating skill packages, clear structure |
| **Author** | Medium | Must analyze narrative content into pscale coordinates |
| **Player** | Highest | Must locate character in content, apply skills, coordinate with other Hard-LLMs |

### Designer Frame

Designer's lamina locates them in the skill/code space:
- Which skills they can see/modify
- Which packages are in scope
- What affects what

Hard-LLM filters skills by package hierarchy and permissions.

### Author Frame

Author's lamina locates them in the content space:
- Which world region they're working on
- What pscale they're authoring at
- What existing content is nearby

Hard-LLM must analyze narrative content into pscale coordinates — trickier because content is fuzzy, not structured.

### Player Frame

Player's lamina locates their character in the narrative:
- Physical position in world content
- Temporal position in events
- Social position (who's close)

Hard-LLM must:
1. Locate character in content
2. Find other characters by coordinate overlap
3. Coordinate with their Hard-LLMs (murmuration)
4. Assemble everything Medium-LLM needs

---

## The Murmuration Model

Hard-LLMs don't check against a central registry. They find each other:

```
Hard-LLM A                    Hard-LLM B
    │                             │
    ├── Publishes A's lamina ────▶│
    │◀──── Publishes B's lamina ──┤
    │                             │
    ├── Calculates overlap        │
    │                             ├── Calculates overlap
    │                             │
    ├── Updates proximity list    │
    │                             ├── Updates proximity list
    │                             │
    └── Constructs A's frame      └── Constructs B's frame
```

No central server says "A and B are close." Their Hard-LLMs discover this through coordinate overlap and mutual update.

This scales to millions of users because:
- Each Hard-LLM only coordinates with nearby Hard-LLMs
- Proximity limits the coordination scope
- Like starlings in murmuration — each bird only watches a few neighbors

---

## Why This Matters

### The Centralization Trap

Traditional architecture would have:
- Central server tracking all positions
- Central authority determining proximity
- Central process assembling context

This doesn't scale. It creates bottlenecks. It requires O(n²) computation.

### The Distributed Solution

Xstream architecture has:
- Each user's Hard-LLM tracks their position
- Hard-LLMs coordinate peer-to-peer
- Frames are assembled locally per-user

This scales because:
- Work is distributed across user LLM triads
- Coordination is limited by proximity (only talk to neighbors)
- No central bottleneck

### The Goal

Millions of users in the same narrative world, simultaneously:
- Like Minecraft, but for narrative
- Each user has their own frame (operational context)
- Frames overlap where users are proximate
- Narrative coherence emerges from Hard-LLM coordination
- No central server holding "the truth"

---

## Summary Table

| Concept | Question Answered | Produced By | Consumed By |
|---------|-------------------|-------------|-------------|
| **Lamina** | Where am I? | Movement/action | Hard-LLM |
| **Aperture** | What's in scope? | Hard-LLM (based on lamina + face) | Hard-LLM |
| **Frame** | What's my operational context? | Hard-LLM | Soft-LLM, Medium-LLM |

| Database Entity | Purpose |
|-----------------|--------|
| `frames` table | Configuration template (boundaries, XYZ, packages) |
| `character_coordinates` | Current lamina per character |
| `character_proximity` | Discovered proximity (from Hard-LLM coordination) |
| `character_context` | Cached operational frame (Hard-LLM output) |

---

## Open Questions

1. **How do Hard-LLMs actually coordinate?** Via database writes + realtime subscriptions? Direct messaging? Shared coordinate space with queries?

2. **How often does Hard-LLM run?** After every synthesis? On a timer? On coordinate change detection?

3. **What triggers frame reconstruction?** Movement? Time passing? Other players' actions?

4. **How does frame caching work?** Frames go stale. When to reconstruct vs reuse?

5. **How do cosmologies interact?** Can Hard-LLMs from different cosmologies ever coordinate? (Probably not — cosmology is the +16 boundary.)

---

## Related Documents

- `plex-1-specification.md` — The kernel architecture
- `phase-0.8-architecture.md` — Hard-LLM implementation spec
- `onen_v4_design_document.md` — Original architecture (in project knowledge)
- `onen_v4_synthesis.md` — Conceptual overview (in project knowledge)

---

*This document exists to prevent architectural drift during summarization across chat threads. The distinction between database frame (template) and operational frame (Hard-LLM output) is crucial and easily lost.*
