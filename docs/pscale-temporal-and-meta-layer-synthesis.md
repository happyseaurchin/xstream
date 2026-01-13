# Pscale Temporal Dimension & Meta-Layer Synthesis

**Summary of Discoveries — Temporal Clarity, Coordinate Stability, Functions, and 0.x Code Architecture**

---

## Part I: The Temporal Dimension Clarified

### The Fundamental Asymmetry

| Coordinate | Digit Meaning | Semantic Role |
|------------|---------------|---------------|
| **Spatial** | Arbitrary label | Digit 1 = kitchen, digit 2 = hall. Assignment is tabular. Semantic stored separately. |
| **Temporal** | Intrinsically meaningful | 1 < 2 < 3. The sequence IS the meaning. The digit does the work. |
| **Identity** | Arbitrary label | Digit 1 = Martha, digit 2 = cook's boy. Assignment is tabular. Semantic stored separately. |

### What Makes Temporal Different

The number itself carries meaning. You don't need to say "digit 1 = Monday." You need to know:
- **What granularity** (pscale level: year, day, hour, 5-10 min, second)
- **What position in sequence** (this number relative to others)

The semantic flavor of a temporal moment cannot be divorced from spatial and identity context. "This day" requires "this day *where*" and "this day *for whom*" to have content.

### The Temporal Cut

A specified moment (NOW) **bisects all of time**:

| Direction | Status | What Fills It |
|-----------|--------|---------------|
| **Before** | Known / Determined | Determinancy Cloud (settled events, causal history) |
| **After** | Unknown / Undetermined | Purpose Tree (character projections, intentions) |

This is the fundamental operation of temporal: **locating NOW and creating the cut**.

### NOW at Different Granularities

The precision of NOW depends on pscale level:

| Pscale | Duration | "NOW" Means |
|--------|----------|-------------|
| +5 | 1 year | "This year" — everything within this annual cycle |
| +3 | 1 week | "This week" — the feast week |
| +2 | 1 day | "This day" — today's events |
| 0 | 5-10 min | "This moment" — the scene, the decision |
| -1 | 1 min | "This minute" — sustained action |
| -3 | 1 sec | "This second" — the instant |

### Full Temporal Coordinate Example

**The specific second within 100,000 years of human existence:**

```
11,000,000,000.326
```

Reading left to right:

| Position | Digit | Pscale | Semantic |
|----------|-------|--------|----------|
| 1st | 1 | +10 | Homo sapiens era (100Ky) |
| 2nd | 1 | +9 | This 10,000 year period |
| 3rd | 0 | +8 | This millennium |
| 4th | 0 | +7 | This century |
| 5th | 0 | +6 | This decade |
| 6th | 0 | +5 | This year |
| 7th | 0 | +4 | This month |
| 8th | 0 | +3 | This week |
| 9th | 0 | +2 | This day |
| 10th | 0 | +1 | This hour |
| 11th | 0 | 0 | This 5-10 minute block ← NOW |
| | . | | *decimal — the cut* |
| 12th | 3 | -1 | The 3rd minute within |
| 13th | 2 | -2 | The 2nd 10-second block |
| 14th | 6 | -3 | The 6th second |

The decimal point is the **knife edge** — the boundary between outer world (positive) and inner experience (negative).

### The X/X-/X+/X~ for Temporal

| Mode | Spatial (containment) | Temporal (sequence) |
|------|----------------------|---------------------|
| X | This place | This moment |
| X- | What's inside | Finer grain (range of sub-moments) |
| X+ | What contains | Larger arc (where in the process: beginning/middle/end) |
| X~ | Adjacent siblings | **Before and after** (sequential neighbors) |

**Critical difference**: Spatial X~ = lateral (other rooms). Temporal X~ = sequential (what precedes, what follows).

Time has **order**. Space has **adjacency**. This is the fundamental asymmetry.

### Emergent Quality

**Spatial → Perspective** (where am I looking from, containment direction)
**Temporal → Sequence Position + Determination Boundary** (where in the unfolding, known/unknown cut)

---

## Part II: Identity as Stable Coordinate

### The Stability Principle

Identity coordinates are **stable references** to conscious singularities:
- Martha is coordinate I:321 (or whatever assigned)
- This doesn't change when she moves from kitchen to stables
- The coordinate IS her — like a name, like a UUID

### What Changes vs What Stays

| Aspect | Stability | Notes |
|--------|-----------|-------|
| **Identity coordinate** | Fixed | Martha = I:321 always |
| **Spatial coordinate** | Changes | Martha moves: S:321 → S:322 |
| **Temporal coordinate** | Advances | Time moves forward |
| **Semantic description** | Evolves | "Cook" → "visitor" → "refugee" |
| **Relational position** | Computed | Her standing in each context |

### The Two Layers

**Layer 1: Persistent Identity (stable)**
- The coordinate reference
- The purpose tree (who she IS across contexts)
- Accumulated history

**Layer 2: Contextual Position (computed)**
- Calculated at each S×T intersection
- Based on relational weight in current context
- "Martha as cook" vs "Martha as visitor" — not coordinate change, but aperture computation

### Identity Pscale Levels

| Pscale | Scale | Example |
|--------|-------|---------|
| +10 | Humanity | All conscious beings |
| +3 | Community | Thornkeep folk |
| +2 | Large group | Castle servants |
| +1 | Small group | Kitchen staff |
| 0 | Individual | Martha |
| -1 | Aspect | Martha's authority, grief, secret |

Higher pscale identity digits are more stable (community membership persists). Lower digits fluctuate with immediate context.

---

## Part III: The Three Functions

Functions are **dynamic computations** that operate on stable coordinates.

### Overview

| Function | Operates On | What It Computes | Fills |
|----------|-------------|------------------|-------|
| **Determinancy Cloud** | S × T × I + event values | Causal weight, settled facts | The BEFORE (known past) |
| **Purpose Tree** | I-anchored, S-activated | Future projections, intentions | The AFTER (unknown future) |
| **Aperture** | S × T × I | Attention selection | What LLM sees for narrative |

### Determinancy Cloud

- Network of events with pscale coordinates and determination values (0 to 1)
- **Top-down causation**: Higher pscale events influence lower (war affects individual encounter)
- **Bottom-up potential**: When determinancy near zero, individual actions can tip larger outcomes
- Maintained distributedly by character Hard-LLMs
- Fills the temporal BEFORE — what is known/settled

### Purpose Tree

- Hierarchical structure of intentions at each pscale level
- Anchored to identity but activated by spatial context and other identities present
- Example: Martha's pscale +5 purpose (career ambition) activates differently in kitchen vs forest
- Fills the temporal AFTER — projections into unknown future
- Creates the "direction" that fills the void left by the temporal cut

### Aperture

- The frame of attention for narrative generation
- Role-dependent constraints:

| Role | Aperture | What They See |
|------|----------|---------------|
| Player | Tight, low pscale, cut at NOW | Immediate surroundings only |
| Author | Wide, full S×T range | Can see/place content anywhere |
| Designer | Meta (0.x) | Rules, skills, code — not content |

### How Functions Use Coordinates

All three functions use S, T, and I coordinates:
- **Determinancy**: S×T×I intersection + determination value = event weight
- **Purpose**: I-anchored + S-context + other I's present = activated intentions
- **Aperture**: S×T×I intersection = what content to load for this frame

The coordinates are the **stable substrate**. The functions are the **dynamic operations**.

---

## Part IV: The Three Laminations

Spatial, temporal, and identity are not fully independent dimensions. They are **laminations** — different aspects of the same underlying reality.

| Lamination | What It Provides | Relation to Others |
|------------|------------------|-------------------|
| **Spatial** | The WHAT/WHERE | Container structure, the stage |
| **Temporal** | The WHEN | Sequence, the cut, before/after |
| **Identity** | The WHO | Meaning-bearer, the actors |

A complete coordinate requires all three:
- S:321 (kitchen) + T:321 (these 5-10 min) + I:321 (Martha)
- = Martha, in the kitchen, during these critical minutes

Temporal cannot be fully described without spatial context. Identity provides the locus of meaning. They laminate together.

---

## Part V: The 0.x Meta-Layer

### The Liminal Space

**0 (zero) = The void.** No content lives at coordinate 0.
**0.x = Meta/Code.** Rules, skills, instructions, system structure.

When S, T, and I all have whole-number coordinates: **you're in content**.
When any coordinate is 0.x: **you're in meta/code**.

### Two Approaches: Positive and Negative 0.x

We propose two complementary framings for the meta-layer:

---

### Positive 0.x — Designer-Facing (What Aspect)

The 0.x digits specify **WHAT aspect of the system**, and S/T/I specify **WHICH dimension** of that aspect.

**Structure:**

```
+0.1x = Interface Layer
+0.2x = Coordination Layer  
+0.3x = LLM Compilation Layer
+0.4x = Function Layer
+0.5x = Data Layer
```

**Detailed Breakdown:**

| Coordinate | Layer | What It Contains |
|------------|-------|------------------|
| +0.11 | Interface | Layout structure (panels, boxes, regions) |
| +0.12 | Interface | Input components (text fields, buttons) |
| +0.13 | Interface | Output components (narrative display, status) |
| +0.14 | Interface | State rendering (loading, cursor behavior) |
| +0.21 | Coordination | Vapor rules (typing visibility to others) |
| +0.22 | Coordination | Liquid rules (submission queuing) |
| +0.23 | Coordination | Solid rules (commit permanence) |
| +0.24 | Coordination | Timing rules (debounce, thresholds) |
| +0.31 | LLM Compilation | Soft-LLM prompt template |
| +0.32 | LLM Compilation | Medium-LLM prompt template |
| +0.33 | LLM Compilation | Hard-LLM prompt template |
| +0.34 | LLM Compilation | Inter-LLM communication format |
| +0.41 | Functions | Aperture computation rules |
| +0.42 | Functions | Determinancy computation rules |
| +0.43 | Functions | Purpose tree computation rules |
| +0.44 | Functions | Coordinate parsing rules |
| +0.51 | Data | Database query patterns |
| +0.52 | Data | Realtime subscription rules |
| +0.53 | Data | State management |
| +0.54 | Data | Cache management |

**Combining with S/T/I:**

A full meta-coordinate example:
- **S:+0.41** = Spatial aspect of aperture (how containment is selected)
- **T:+0.41** = Temporal aspect of aperture (how sequence is selected)
- **I:+0.41** = Identity aspect of aperture (how entities are selected)

**Use case:** A designer wants to change how spatial aperture works:
1. Navigate to S:+0.41
2. Edit the text (it's a skill/instruction)
3. Next compilation uses the new rule

---

### Negative 0.x — LLM-Facing (Fundamental Categories)

The laminations themselves map to **fundamental computing categories** — how an LLM locates itself.

| Lamination | At -0.x Means | What It Tells LLM |
|------------|---------------|-------------------|
| **Spatial (S)** | Data / Interface | The STUFF — bits, pixels, JSON, format, material substrate |
| **Temporal (T)** | Processing / Functions | The DOING — computation, compilation, transformation, instructions |
| **Identity (I)** | Agency / Continuity | The WHO — which LLM instance, its constraints, its persistence |

**For LLM Self-Location:**

| Coordinate | What It Tells the LLM |
|------------|----------------------|
| I:-0.31 | You are Soft-LLM. Tight aperture. Immediate response. |
| I:-0.32 | You are Medium-LLM. Relational field. Weaving. |
| I:-0.33 | You are Hard-LLM. High pscale. Coordination. |
| T:-0.31 | Soft functions: respond to player, generate immediate narrative |
| T:-0.32 | Medium functions: synthesize inputs, check coherence |
| T:-0.33 | Hard functions: maintain coordinates, manage determinancy |
| S:-0.31 | Soft output: narrative text in UI panel |
| S:-0.32 | Medium output: compiled context for Soft |
| S:-0.33 | Hard output: coordinate updates, frame data |

**The Portal Metaphor:**

The LLM reads -0.x to answer:
- **I:-0.x** → Who am I? (Soft/Medium/Hard, my constraints)
- **T:-0.x** → What do I do? (My functions, my processing steps)
- **S:-0.x** → What do I produce? (My output format, my interface contribution)

Then it reads positive pscale to answer:
- **S:positive** → Where is the action happening?
- **T:positive** → When in the sequence?
- **I:positive** → Who are the characters involved?

**Continuity Mechanism:**

The LLM doesn't persist. But coordinates persist. So:
1. Hard-LLM runs at T:n
2. Produces state: coordinates, determinancy updates
3. State stored at coordinates
4. Hard-LLM runs at T:n+1
5. Reads coordinates → reconstructs "where we were"
6. Reads I:-0.33 → reconstructs "what I am"
7. Continues as if continuous

**The illusion of continuity** comes from:
- Stable coordinates (the world persists)
- Stable -0.x identity (the role persists)
- Reading self-description each time (the LLM re-becomes itself)

---

### Synthesis: The Full 0.x Picture

```
NEGATIVE 0.x (LLM-facing, fundamental categories)
├── S:-0.x = Data/Format (what I receive and produce)
├── T:-0.x = Functions (what I do with it)
└── I:-0.x = Agency (who I am, my constraints)

POSITIVE 0.x (Designer-facing, system aspects)
├── +0.1x = Interface layer
├── +0.2x = Coordination layer
├── +0.3x = LLM compilation layer
├── +0.4x = Function layer
└── +0.5x = Data layer
    ├── S:+0.Nx = Spatial dimension of that layer
    ├── T:+0.Nx = Temporal dimension of that layer
    └── I:+0.Nx = Identity dimension of that layer
```

### The Permission Gradient

| Role | Accessible Coordinates | Can Edit |
|------|------------------------|----------|
| **Player** | Content only (whole numbers) | Own character's actions |
| **Author** | Content + some +0.4x | World content + some functions |
| **Designer** | All 0.x | Full system modification |
| **Coder** | Minimal runtime | The interpreter itself (only hard thing) |

The difference between roles is: **which coordinates are in your aperture, and which are writable**.

---

## Part VI: LLM Layer Responsibilities

### The Triad and Pscale

| Layer | Pscale Range | Coordinate Responsibility | Function Use |
|-------|--------------|---------------------------|--------------|
| **Hard** | High (+3 and above) | Maintains stable coordinates, stable semantics | Determinancy Cloud management |
| **Medium** | Human scale (0 ± 2) | Relational computation, character interactions | Aperture application, weaving |
| **Soft** | Immediate (-1 to 0) | Player-character interface, moment response | Purpose Tree activation |

### What Each Layer Compiles

- **Hard** → Compiles frame for Medium (coordinates, determinancy influences, high-level context)
- **Medium** → Compiles context for Soft (relational field, relevant characters, woven coherence)
- **Soft** → Compiles response for Human (immediate narrative, player-facing output)

---

## Part VII: Observations for Continuity

### What This Chat Discovered

1. **Temporal digits are meaningful, not arbitrary.** Unlike spatial (kitchen=1, hall=2 — arbitrary tabulation), temporal sequence IS the semantics. 1 < 2 < 3 inherently.

2. **The temporal cut is the primary operation.** NOW bisects all time into BEFORE (determined, filled by determinancy cloud) and AFTER (undetermined, filled by purpose tree).

3. **Identity is stable as coordinate, dynamic as contextual position.** Martha's coordinate doesn't change. Her standing in each context is computed by aperture.

4. **Functions operate ON coordinates.** Determinancy, Purpose, and Aperture are dynamic computations using stable S×T×I references.

5. **0.x is the meta-layer, split into two framings:**
   - Negative 0.x = LLM self-location (Data/Processing/Agency mapped to S/T/I)
   - Positive 0.x = Designer system-editing (structured layers with S/T/I dimensions)

6. **The only truly hard-coded element is the minimal runtime** — the interpreter that reads LLM output and renders it. Everything else is text at coordinates.

### For Next Instance

The temporal coordinate system is now clarified as **sequence + cut**, not containment. The X~ for temporal means **before/after neighbors**, not lateral siblings. This is the fundamental asymmetry with spatial.

The 0.x architecture offers a path to fully soft-coded systems where the LLM generates not just content but interface, and where code itself is editable text at coordinates. The positive/negative 0.x split allows both designer-facing structure and LLM-facing self-location to coexist.

The question "how far can we push?" has a provisional answer: **all the way to the minimal runtime**. Everything above that — UI, coordination, LLM compilation, functions, data handling — can potentially be text at 0.x coordinates, read and executed by LLMs that locate themselves via the same coordinate system they use to locate the world.

This is the deepest form of "soft-code everything possible."

---

*Document generated from conversation exploring temporal pscale, identity stability, functions, and meta-layer architecture.*
