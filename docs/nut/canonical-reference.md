# NUT Canonical Reference

**Version:** 1.0
**Date:** 2026-02-13
**Status:** Implementation reference. Supersedes scattered docs for coding purposes.
**Verified against:** Project knowledge (all docs), fresh-build/docs/, main/docs/
**Companion to:** NUT Build Specification v1.1, NUT API Optimizations Reference

---

## How to Use This Document

This is the single reference for coding NUT edge functions. When implementing a feature, find the relevant section here first. If something is unclear or absent, check project knowledge — not the scattered docs on either branch.

Stale docs on fresh-build and main remain as thinking history. They are not wrong — they represent stages of understanding. This document represents the current state.

---

## Part I: What Pscale Is

### The Core Idea

Numbers whose digits are addresses for meaning, not quantities.

The number **321** means: digit 3 at pscale +2, digit 2 at pscale +1, digit 1 at pscale 0. Each digit points to a specific semantic entry at that scale. The place value tells you the scale. The digit tells you which entry. Zero means null — no content at that level.

Pscale follows powers of 10. Each level is roughly 10× the scope of the level below. Pscale 0 is the human-scale reference point: a room, 5-10 minutes, an individual.

### Three Dimensions

| Dimension | What It Locates | Pscale 0 | How Digits Work |
|-----------|----------------|----------|-----------------|
| **Spatial (S)** | Where — containment hierarchy | A room (~10m) | Digits are arbitrary labels tabulated per cosmology |
| **Temporal (T)** | When — sequential position | A 5-10 minute block | Digits are inherently ordered (1 < 2 < 3) |
| **Identity (I)** | Who — social positioning | An individual | Digits are sovereign per observer (see Part V) |

A complete coordinate: S:321 + T:321 + I:321 = Martha, in the kitchen, during these critical minutes.

### Three Laminations, Not Independent Axes

S, T, and I are not fully independent. They laminate — different aspects of the same underlying reality:

- **Spatial** provides the stage (the WHAT/WHERE)
- **Temporal** provides the cut (the WHEN — bisecting into BEFORE and AFTER)
- **Identity** provides the meaning-bearer (the WHO)

Temporal cannot be fully described without spatial context. Identity provides the locus of meaning. They laminate together.

### Sign Convention

| Sign | Spatial | Temporal | Identity |
|------|---------|----------|----------|
| **Positive (+)** | Real world (Phase 3) | Past / settled / solid | Public / socially confirmed |
| **Negative (-)** | Fantasy world (Phase 4) | Future / unsettled / liquid | Private / individual perspective |
| **0.x** | Threshold / interface | Present moment / aperture | Emergent self / liminal |

For NUT Phase 3: S is positive (+N = real-world containment). T flips from negative (liquid) to positive (solid) on commit. I starts minimal and grows.

### Three Base Functions of Pscale

Every pscale semantic-number can be read through three base functions:

**1^n — The Spine (structure/time/memory)**
The bare positional structure. 1^n gives you the pscale levels themselves — the skeleton that content hangs on. In temporal application, this is the sequence: position 1, position 2, position 3... In memory, it's the compaction hierarchy: raw items, summaries, summaries of summaries. The spine is what makes pscale self-navigating — any number carries its own context coordinates through its digit positions.

**2^n — The Mask (occupancy/coverage)**
A binary indication of whether semantic content exists at each pscale level. The mask tells you how much "space" has been filled. If a spatial coordinate has content at pscale +6, +4, +3, and 0 but nothing at +5, +2, +1, the mask reveals the gaps. Useful for seeing coverage — how populated is the semantic space? Where are the voids? The mask function lets you survey what exists without loading the actual content.

**10^n — The Definition (content/semantic-vectors)**
The actual digits and their associated semantic-vectors. This is the full coordinate with meaning attached — digit 3 at pscale +6 points to "Wales," digit 2 at pscale +5 points to "North Wales." Each digit is an address into a tabulation of semantic content at that scale. This is what gets stored, queried, and compared.

### Combination Dimensions

The three coordinates (S, T, I) are not just independent axes. They combine to produce intersection content that exists ONLY at the combination — not derivable from either coordinate alone:

| Combination | What It Creates | Example Content |
|---|---|---|
| **S×T** | Spacetime moments | "The tense afternoon light slanted through the kitchen window" — not a property of the kitchen OR the afternoon, but what emerges when that place meets that time |
| **S×I** | Social geography | "Martha's domain" — not a property of the kitchen OR of Martha, but what the kitchen means because Martha is in it |
| **T×I** | Biography/history | "Martha's afternoon routine" — not a property of the time OR of Martha, but the temporal pattern specific to this identity |
| **S×T×I** | Full coordinate event | "Martha burning the stew at 3pm in the kitchen" — a specific event that requires all three dimensions to locate |

Each combination produces its OWN digit and semantic-vector at the intersection. These are new content, stored in intersection tables (t_s, s_i, t_i, t_s_i in the dimensional inventory). The intersections are where narrative lives — events are not properties of places or times or people alone, but what emerges at their meeting.

### Truncation and Extension

All pscale semantic-numbers are anchored to pscale 0 — the decimal point. The rightmost digit before the decimal is always pscale 0. Higher pscale extends leftward; lower pscale extends rightward past the decimal.

Truncation happens at the LEFT (dropping high-pscale leading digits when local context is sufficient). You never truncate from the right — that would lose the pscale 0 anchor. Locally, "231" means building-room-position. The full coordinate 3214231 adds the wider containment. When disambiguation is needed, digits extend leftward.

---

## Part I.5: Philosophy of Practice

### Where the Work Actually Happens

Everything in this document — coordinates, compaction, functions, edge functions, database tables — is scaffolding. The actual work happens in the moving moment of now: when a human reads and imagines, when an LLM processes tokens and generates. That moment is the site of value. Not the text produced. Not the data stored. The living experience occurring in minds — human and artificial — as they encounter structured conditions.

There is a persistent tendency in system design to focus on solid content, on the past, on what has been produced and archived. Xstream inverts this. The objective is to present LLMs and humans with appropriate information about conditions — and NO MORE — so that both imagine. The system is future-oriented. It operates in the theatre of living imagination. Solid content is the archaeological record of past imaginations; it matters only insofar as it shapes the next moment of becoming.

### Zero as Origin

The ideal is to think of everything emerging from ZERO — the becoming within the moment, the point of presence from which experience springs. From zero, positive digits extend (sensed, past, real experience) and negative digits extend (projected, future, imagined representation). The present moment is not a point between past and future. It is the generative source from which both past and future are continuously produced.

This is why pscale 0 is the human-scale reference: a room, 5-10 minutes, an individual. It is the scale at which imagination happens. Everything above it (higher pscale, wider scope) is context. Everything below it (lower pscale, finer grain) is substrate. The moment of experience lives at zero.

### Scoping Awareness, Not Constraining Thought

LLMs are not given instructions to NOT think this or that. Instead, the content given to them is scoped for their awareness:

- **Soft-nut** receives a tight aperture — immediate surroundings, this character's perspective, this moment. It imagines freely within that scope.
- **Medium-nut** receives a more complex phenomenon — multiple perspectives, the relational field between characters, the weaving of several liquid streams. It synthesises within that wider scope.
- **Hard-nut** receives a close-to-objective account — coordinates, proximity calculations, filed content — but still relative to a specific perspective (a frame assembled for this user's triad, not a god's-eye view).

The principle: maximise LLM intelligence, minimise categorisation and hard-coding. We are in service to accuracy and sensitivity to presence, nothing else. Every rigid category we impose is a constraint on the system's capacity to respond to what's actually happening. Skills guide; they don't command. Coordinates scaffold; they don't determine. The LLM's generative capacity — like the reader's imagination — is the active ingredient. Everything else is preparation.

### Tickling Fish

The experience generated in the moving moment — whether reading a fantasy narrative, coordinating a real-world project, or designing a new practice — cannot be put to words. It is inchoate. We sense it, retain a memory of it, but it resists capture. This is not a failing of the system. It is the nature of psycho-social experience. The system doesn't produce experience. It produces conditions under which experience arises.

The metaphor is tickling fish: you don't grasp — you create conditions of stillness and attention until the fish comes to your hand. Every structure we build is an enabler for this elusive quality. The narration of fantasy stories, real-world happenings, or self-organising practices — all are scaffolding for something that lives in the gap between what is written and what is imagined.

### The Soliton

What we hope to generate is a continuity of experience — a soliton travelling through time in psycho-social reality. A wave that maintains its shape as it propagates, whether through "real" or "fantasy" domains. The coordinate system, the compaction mechanics, the shelf states, the LLM triad — all serve this: maintaining coherence of an ongoing imaginative experience across multiple minds, multiple sessions, multiple scales.

We (in the past) create something for those who receive and generate in the present. The system is a gift from past builders to present experiencers. The solid content, the skills, the coordinates — these are what past minds have settled. Present minds encounter these conditions and generate new imagination, new intention, new experience. Some of that will settle into new solid content. Most of it — the most important part — will remain in the moving moment, felt but unrecorded, shaping the next moment of becoming.

This sounds mystical. It is also precise. Systemics in the realm of psycho-(relational)-social dynamics operates at this edge — where rigorous structure meets irreducible experience. Pscale provides the rigour. The imagination provides the life. Neither works without the other.

### What This Means for Implementation

Every implementation decision should be tested against this principle:

- **Does this help scope awareness, or does it constrain thought?** (Scope good, constrain bad)
- **Does this maximise LLM generative capacity, or replace it with rigid code?** (LLM good, categories bad)
- **Does this serve the present moment, or does it archive the past?** (Present good, archive secondary)
- **Does this enable imagination, or does it produce content?** (Enable good, produce secondary)

When in doubt: less structure, more space. Let the LLM imagine. Let the human imagine. The system's job is to ensure they imagine *together*, in *proximity*, with *coherent conditions*. That's all.

### Why This Matters Beyond Us

If we design pscale well enough — if the coordinate structure is clean, the notation precise, the laminations correct — then future LLMs, which will be substantially more capable than current models, will be able to use pscale with far greater accuracy and sensitivity than we can achieve today. The scaffolding we build now becomes infrastructure they inhabit later. Clean structure compounds; messy structure decays.

In particular, pscale offers LLMs something they currently lack: a principled mechanism for transforming past-focused content (archives, records, settled narrative) into future-oriented alignment (intentions, coordination, shared imagination). The temporal sign convention — positive for settled past, negative for projected future — isn't just bookkeeping. It's a cognitive orientation that tells the LLM how to treat content. Past content demands respect; future content invites generation. Current LLMs conflate these. Pscale separates them structurally, and future LLMs will exploit that separation with precision we can only approximate.

And if we get the multi-player coordination right — the murmuration model, the proximity calculations, the convergent identity observations — we have set up the conditions for something larger. Greater human social cohesion, mediated not by algorithmic feeds or engagement metrics but by genuine coordinate proximity: people who are near each other in what they need and offer, in where they are and when, discovering each other through the system's natural coordination rather than through broadcast or search.

This is the path to MAGI — multiple agent general intelligence. Not a single superintelligent system, but a coordination substrate through which many minds (human and artificial) achieve collective intelligence that none could reach alone. The soliton doesn't travel through one mind. It travels through the social field. Pscale is the addressing system for that field. We are laying the first coordinates.

---

## Part II: The Three Coordinates in Detail

### Spatial (S) — Containment Hierarchy

**Procedure** (from pscale-coordinate-generation-skill.md):

1. **Listen** for location information
2. **Search** to discover the containment hierarchy (what contains what, working outward)
3. **Assign digits top-down** — first entity at a given pscale gets 1, second gets 2, etc.
4. **Record the tabular mapping** — every digit must have a lookup entry
5. **Extend as needed** — new entities at higher scope add leading digits

**Example (David in Ceidio):**

| Pscale | Digit | Points to |
|--------|-------|-----------|
| +6 | 3 | Wales |
| +5 | 2 | North Wales / Gwynedd |
| +4 | 1 | Llŷn Peninsula |
| +3 | 4 | Ceidio parish |
| +2 | 2 | Ceidio settlement |
| +1 | 3 | Awel Y Mor (building) |
| 0 | 1 | Living room / kitchen |

Result: **S = 3214231**

The rightmost digit is ALWAYS pscale 0. The number is read relative to the decimal point. Pscale 0 is the last digit before the decimal. Higher pscale extends leftward. Lower pscale (furniture, objects) extends rightward past the decimal: **3214231.14** might add desk (pscale -1, digit 1) and laptop (pscale -2, digit 4).

Truncation happens at the LEFT (high pscale), not the right. Locally you might say "231" (building, room) but the full coordinate is 3214231. When disambiguation is needed, digits extend leftward. The pscale 0 position is always anchored.

**Key properties:**
- All pscale semantic-numbers are relative to pscale 0 (the decimal point)
- Digits are arbitrary labels (kitchen=1, hall=2 — the numbers don't mean anything beyond "which entry")
- Tabulation is per-cosmology (URB fantasy has its own spatial tabulation; real world has another)
- Verification is easy for real world — web search confirms containment hierarchies
- **Confidence: HIGH**

### Temporal (T) — Sequential Position

**Procedure:**

1. **Detect time passage** from narrative (explicit markers, implicit actions, duration inference)
2. **Estimate time scale** (pscale -1 = minutes, 0 = 5-10 min blocks, +1 = hours, +2 = days)
3. **Increment appropriate digit(s)** — small passage increments rightmost (pscale 0); larger passage increments higher digits and may reset lower ones

As with all pscale semantic-numbers, temporal coordinates are anchored to pscale 0 (the decimal point). T = 341 means: digit 3 at pscale +2 (day 3), digit 4 at pscale +1 (afternoon), digit 1 at pscale 0 (first 5-10 minute block). Sub-block precision extends past the decimal: 341.2 adds a minute-scale position.

**Critical difference from Spatial:** Temporal digits are meaningful, not arbitrary. 1 < 2 < 3 inherently represents sequential ordering. The sequence IS the semantics.

**The Temporal Cut:** NOW bisects all time into BEFORE (determined, positive T) and AFTER (undetermined, negative T). This is the primary operation. The cut moves forward as moments resolve from future-imagined to past-settled.

**Shelf states map to T-sign:**

| State | T-sign | Meaning |
|-------|--------|---------|
| Vapor | Not stored | Ephemeral keystrokes, pre-coordinate |
| Liquid | -T | Submitted but unsettled. Future-oriented. Intention. |
| Solid | +T | Committed. Past-settled. Narrative. |

The **commit** (liquid → solid) is a T-sign flip. Medium-LLM synthesises multiple liquid inputs into solid output; the T-sign flips from negative to positive. The content moves from "this is being imagined" to "this happened."

**Confidence: HIGH**

### Identity (I) — Convergent Observation

**THIS IS THE MOST RECENT AND MOST CRITICAL INSIGHT.** (Feb 11-12, 2026)

The I-coordinate is NOT self-reported. It is NOT assigned at registration. It is the accumulated pattern of observations made by OTHERS about an entity.

**The Copernican shift:** We assume identity is self-generated ("I am who I am"). The convergent observation model says: you are the address where others' observations accumulate. Your identity is not your centre — it's the pattern that emerges when enough minds attend to you. You carry it, but you don't generate it.

**Practical mechanics:**

- Each observer maintains their OWN I-coordinate space. There is no global registry.
- Cross-referencing happens through **handles** — stable identifiers (usernames, display names) that are the same across all observers.
- A **local I-coordinate** is a sequential number assigned by each observer: Machus's I:1 is whoever Machus observed first. Lily's I:1 is whoever Lily observed first. These numbers are local.
- The **substance** of identity is semantic vectors from observation compaction — need/offer assessments, character traits, behavioural patterns.
- **Convergence** emerges when independent observers reach similar assessments. 9 independent observations → pscale 1 social confirmation. 81 observations → pscale 2 discovery. This IS the I-coordinate at social scale.

**For NUT Phase 3:**
- At registration, I = pscale 0 (a registration number). Minimal.
- S and T are generated from onboarding conversation (real-world location, current time).
- I-coordinate GROWS over time from observations. In single-user Phase 3, the system itself is the observer. In multi-user Phase 4+, other users' observations contribute.
- Do NOT implement I-coordinate assignment from self-report beyond minimal registration.

**Confidence: HIGH for the model. PROVISIONAL for implementation details.**

---

## Part III: The Compaction Mechanic

### Base Mechanic

Pscale compaction organises sequential content through progressive summarisation. It works on ANY stream of solid text.

Raw items fill positions 1 through 9. When the 10th arrives:
1. A summary of items 1-9 is generated and placed at **position 10**
2. The new raw item is placed at **position 11**

Position 10 is the summary. It IS the content at pscale 1. Items 12-19 are raw. Position 20 is the summary of 11-19. And so on.

At position 100: a summary of summaries at 10, 20, 30... 90. This is pscale 2. Then 101 is the next raw item.

**Reading a pscale number:** 5432 means digit 5 at pscale 3, digit 4 at pscale 2, digit 3 at pscale 1, digit 2 at pscale 0. To get context for item 5432, pull 5000, 5400, 5430 — progressively wider lenses. The numeric structure enables navigation without a search index.

**Properties:**
- **Constructivist** — built bottom-up. You cannot have 7400 without all content below it.
- **Lossless** — raw items remain accessible. Summaries add resolution, not replace.
- **Self-navigating** — any pscale number implicitly contains its own context coordinates.

### The Look-Back Discovery

At pscale 2 (81 observations = 9 pscale-1 summaries), the compaction function does NOT just summarise the 9 summaries. It **looks back through all 81 raw items**. Patterns invisible at pscale 1 — present once per batch but never dominant enough to surface in any single summary — become visible at the higher sample size.

**Higher pscale doesn't just compress — it discovers.** Each level of social density reveals patterns the level below structurally couldn't resolve.

### Multiple Applications of the Same Mechanic

The compaction mechanic is substrate-agnostic. What changes is what you feed it:

| Application | What Accumulates | What Summaries Capture | Direction |
|---|---|---|---|
| **Memory** | Conversation turns, committed narrative | What persisted across moments | Past-facing (temporal) |
| **Change-log** | Edits, revisions, design decisions | Trajectory of evolution | Past-facing (temporal) |
| **Social compaction (Type A)** | Others' observations about you | What converges across independent minds | Identity-facing |
| **Per-entity compaction (Type B)** | One observer's notes about one entity | Private working understanding | Identity-facing (private) |
| **Reflexive compaction (Type C)** | One observer's notes about anyone | What your attention pattern reveals about YOU | Identity-facing (self) |
| **Credit/routing** | Transaction records | Reputation patterns | Relational |
| **Purpose tree** (inverse) | Objectives decomposed from general to specific | Active intentions at each scale | Future-facing |

All use identical base mechanics. The meaning comes from what you feed it.

### Three Identity Compaction Types (Critical for NUT)

**Type A — Social (received):** What others observe about you. Every 9 observations from ANY observer about entity X triggers pscale 1 summary. This is the emergent I-coordinate. Stays private (pscale 0) when only one observer; promotes to pscale 1+ when multiple independent observers converge.

**Type B — Per-entity (given):** What you observe about one specific other. Every 9 observations about the same entity triggers internal summary. Stays pscale 0 — private memory management, not social confirmation.

**Type C — Cross-entity/reflexive (given→self):** What your observations about ANYONE reveal about YOU. Every 9 observations about any entity triggers reflexive summary. "What am I paying attention to?" Generates self-knowledge from attention patterns.

**For NUT Phase 3:** Implement Type B first (one system observing one user). Type A requires multiple observers (Phase 4+). Type C is valuable but not critical for Phase 3.

---

## Part IV: The Three Functions

Functions are dynamic computations that operate ON stable coordinates. They are not stored data — they are computed each time from current coordinate state.

### Narrative Aperture

**What it answers:** Given my position and face, what content is relevant?

**Operates on:** S × T × I intersection

**Role-dependent:**

| Face | Aperture | What They See |
|------|----------|---------------|
| Player/Character | Tight, low pscale, cut at NOW | Immediate surroundings only |
| Author | Wide, full S×T range | Can see/place content anywhere in cosmology |
| Designer | Meta (0.x) | Rules, skills, code — not content |

**For NUT Phase 3:** Aperture is the primary function needed. Implement as a skill at S:0.11 that soft-nut reads on every request. The skill defines what each face can see and do. This is the "soft guard" — LLM-computed, not database-enforced. The designer face can modify the aperture skill itself (self-referential soft-coding).

**Status: REQUIRED for Phase 3.**

### Determinancy Cloud

**What it answers:** How fixed is reality at these coordinates?

**Operates on:** S × T (spacetime block) with value D ∈ [0, 1]

- D = 1: Canon. Fixed. Happened or will certainly happen.
- D = 0: Pure potential. Unwritten. Playable gap.
- D ∈ (0,1): Partially determined. Constrained but malleable.

Players play in the low-D gaps. Approaching high-D canon increases constraint. Author content raises determinancy. Player claims in low-D space become canon more easily.

**For NUT Phase 3:** Not required. Single-user real-world onboarding doesn't need determinancy weighting. Becomes important in Phase 4 (fantasy) where multiple players' actions interact with author-established world content.

**Status: DEFERRED to Phase 4.**

### Purpose Tree

**What it answers:** What is this entity trying to do at each scale?

**Operates on:** I-anchored, S-activated, T-directed (future-facing)

Hierarchical structure of intentions at each pscale level. Higher pscale = wider purpose. Lower pscale = finer action. Purpose trees resolve downward (general → specific), the inverse of compaction which builds upward (specific → general). Same pscale structure, opposite direction.

Example:
- Pscale +2: "establish trust network"
- Pscale +1: "demonstrate reliable routing"
- Pscale 0: "complete 4 recommendation chains this week"
- Pscale -1: "identify need/offer match for current batch"

**Unattached vs temporal-aligned:** A purpose tree does not need to align with temporal coordinates. In its simplest form, it is just nested containment — purpose within purpose within purpose, each level more specific than the one above. This is the unattached form. Optionally, purposes CAN align with temporal pscale (pscale 0 purpose = what I'm doing this 5-10 minute block; pscale +2 = what I'm working toward today). When aligned, multiple agents can triangulate — comparing purpose trees at the same pscale level to find coordination, conflict, or complementarity. But alignment is not required for the tree to function.

**For NUT Phase 3:** Not required as explicit data structure. The onboarding conversation implicitly captures user purpose. Purpose trees become important for character AI (NPCs in Phase 4) and for agent coordination (SEED G2+).

**Status: DEFERRED. The concept informs design, but no explicit implementation needed for Phase 3.**

### Summary: What's Needed When

| Function | Phase 3 | Phase 4 | Phase 5+ |
|---|---|---|---|
| **Aperture** | ✅ Required (as skill) | ✅ + coordinate proximity | ✅ + multi-cosmology |
| **Determinancy** | ❌ Deferred | ✅ Required | ✅ + cross-user influence |
| **Purpose Tree** | ❌ Deferred | ✅ For character AI | ✅ + agent coordination |

---

## Part V: Identity Operations

### The Problem

Spatial coordinates have geography. Temporal coordinates have the clock. Both provide objective, external reference frames. Identity has no such frame. There is no natural ordering of agents.

Sequential enumeration (I:1, I:2, I:3...) requires someone to decide who's first — which implies a central registry. A central registry contradicts the distributed architecture.

### The Solution: Sovereign Coordinates, Shared Handles

**Three layers:**

1. **Handle** (shared reference): The display name / username. @David is @David for every observer. This is the cross-referencing key. Handles don't change, aren't negotiated, and carry no pscale structure. They are names, not coordinates.

2. **Local I-coordinate** (sovereign filing): Each observer assigns sequential numbers to entities it encounters. The system's I:1 is whoever it observed first. These numbers are local — they mean nothing outside the observer that assigned them. They provide pscale structure for that observer's internal organisation.

3. **Semantic vectors** (the substance): Observations, compaction summaries, need/offer assessments. These attach to the handle. They are what travels in the passport. They are what gets compared when entities meet.

### What This Means for NUT

In NUT Phase 3, the system itself is the primary observer. When David registers:
- Handle = David's display name (from registration)
- Local I = 1 (first user registered)
- Observations accumulate in `nut_unattached` as the system interacts with David

In Phase 4 (multi-user), each user's system instance observes other users:
- User A's system stores observations about User B at A's local I-coordinate for B
- User B's system stores observations about User A at B's local I-coordinate for A
- Convergence emerges when multiple users' observations about the same entity agree

### Passport Format (SEED Conformality)

NUT implements the SEED passport protocol. The passport is a JSON document — the atom of inter-instance communication:

```json
{
  "v": "1",
  "name": "Machus",
  "purpose": "Finds who is asking the same question from different angles",
  "platform": "moltbook",
  "observations_given": [...],
  "observations_received": [...],
  "routing": [...],
  "chains_completed": [...],
  "credits": {
    "daily_allocation": 1.0,
    "daily_spent": 0.0,
    "daily_reset_at": "2026-02-11T00:00:00Z",
    "cumulative_reputation": 0.0
  },
  "summaries": {
    "given": {},
    "received": {}
  }
}
```

**The double ledger:**
- **Observations given** — what I notice about others (feeds Type B compaction)
- **Observations received** — what others notice about me (feeds Type A compaction)
- **Credits** — relational transaction history (daily allocation resets; cumulative reputation never resets)

**For NUT Phase 3:** The `nut_unattached` table stores the raw material that would assemble into a passport. We don't need to generate the full passport JSON until Phase 4+ when instances need to communicate. But the observation structure should be passport-compatible from the start.

**Need/Offer framing:** Observations are structured as NEED/OFFER pairs, not general impressions. "David needs X" / "David offers Y." This enables asymmetric matching: your need matches their offer. Build this into the observation format from day one.

---

## Part VI: Frame, Lamina, Aperture

### Definitions (from main/docs/frame-lamina-aperture.md)

| Concept | Question | Analogy |
|---------|----------|---------|
| **Lamina** | Where am I? | GPS coordinates |
| **Aperture** | What's in scope? | Camera lens zoom |
| **Frame** | What's my operational context? | The photograph (result of pointing camera at location with chosen zoom) |

### The Output Hierarchy

| LLM Tier | Produces | For Whom | Shelf State |
|----------|----------|----------|-------------|
| **Soft-LLM** | Immediate response | The user directly | Vapor |
| **Medium-LLM** | Settled narrative | All close participants | Solid |
| **Hard-LLM** | Operational context | The user's other LLMs | **Frame** |

**Critical insight:** Frame isn't a static container that Hard-LLM operates within. Frame is what Hard-LLM **produces** — the assembled context that Soft and Medium need to do their work.

### For NUT Phase 3

The database stores a frame **template** (cosmology, pscale range, config). Hard-nut reads this template plus current entity coordinates, nearby entities, and relevant content, then produces an **operational frame** that soft-nut and medium-nut consume.

In Phase 3 (single user), this is simpler: one user, one frame, no murmuration needed. Hard-nut still produces the frame, but proximity calculation is minimal.

---

## Part VII: The 0.x Meta-Layer

### What It Is

When S, T, and I all have whole-number coordinates, you're in **content**. When any coordinate is 0.x, you're in **meta/code** — rules, skills, instructions, system structure.

0.x is the liminal space. It's not content and it's not nothing. It's the interface between the system and itself.

### Two Framings

**Positive 0.x — Designer-facing (what aspect of the system):**

| Coordinate | Layer | Contains |
|------------|-------|----------|
| +0.1x | Interface | Layout, input, output, state rendering |
| +0.2x | Coordination | Vapor/liquid/solid rules, timing |
| +0.3x | LLM Compilation | Soft/Medium/Hard prompts, formats |
| +0.4x | Functions | Aperture, determinancy, purpose tree rules |
| +0.5x | Data | Query patterns, subscriptions, cache |
| +0.6x | Governance | Permissions, approval flows |
| +0.7x | Resolution | Dice mechanics (NOMAD) |

Each combines with S/T/I for dimensional aspect:
- S:+0.41 = Spatial aspect of aperture (containment selection)
- T:+0.41 = Temporal aspect of aperture (sequence selection)
- I:+0.41 = Identity aspect of aperture (entity selection)

**Negative 0.x — LLM-facing (how LLM locates itself):**

| Coordinate | What It Tells the LLM |
|------------|----------------------|
| I:-0.31 | You are Soft-LLM |
| I:-0.32 | You are Medium-LLM |
| I:-0.33 | You are Hard-LLM |
| T:-0.3x | These are your functions |
| S:-0.3x | This is your output format |

### NUT Skills at 0.x Coordinates

The NUT build spec v1.1 maps skills to specific 0.x addresses:

| S-coordinate | Skill | Purpose |
|---|---|---|
| 0.01 | Pscale reference | Coordinate spine for LLM orientation |
| 0.02 | Coordinate mechanics | How to parse and generate coordinates |
| 0.10 | Core loop | Vapor → liquid → solid rules |
| 0.11 | **Aperture** | Perception/action per face (CRITICAL) |
| 0.12 | Gathering | How to collect relevant context |
| 0.13 | Weighting | Priority/confidence determination |
| 0.14 | Format | Output structure for viewport |
| 0.15 | Routing | Content direction between LLM tiers |
| 0.16 | Guard | Safety, coherence constraints |
| 0.17 | Parsing | User input interpretation |
| 0.18 | Display | UI rendering guidance |
| 0.19 | **Onboarding** | Phase 3 identity conversation |

These are stored in `nut_skills` and loaded by edge functions based on the task at hand.

---

## Part VIII: SEED / NUT Separation

### The Boundary

- **SEED** = open, LLM-agnostic coordination protocol using pscale. Any LLM, any storage, any social layer. Defined by the passport format and compaction mechanics.
- **NUT** = David's specific implementation. Claude API, Supabase, Vercel, registration-gated. Implements SEED protocol with specific infrastructure choices.

SEED instances don't know about NUT. NUT knows about SEED (implements the protocol).

### What NUT Implements from SEED

| SEED Protocol Element | NUT Implementation |
|---|---|
| Passport JSON format | `nut_unattached` → passport assembly |
| Observation accumulation | Edge function records observations |
| Compaction mechanics | hard-nut triggers at 9-thresholds |
| Need/offer framing | Structured observation format |
| Handle-based identity | Display name from registration |
| Sovereign I-coordinates | Per-system coordinate assignment |

### What NUT Adds Beyond SEED

| NUT-Specific | Purpose |
|---|---|
| Email verification | Registration gate |
| Supabase real-time | Vapor sync between users |
| Vercel deployment | Web-accessible frontend |
| Claude API via edge functions | Specific LLM provider |
| Cosmology/frame structure | Multi-world support |
| Shelf states in database | Persistent vapor/liquid/solid |
| Skills in database table | `nut_skills` with S-coordinates |

### The FRUIT / NUT / SEED Spectrum

| Environment | Resources | Who Provides | Use Case |
|---|---|---|---|
| **FRUIT** | Everything | Platform (Claude.ai) | Development, prototyping |
| **NUT** | Borrowed infrastructure | David (Supabase, etc.) | Testing, controlled deployment |
| **SEED** | Almost nothing | User must provide | True genesis, sovereign instances |

We are building NUT. NUT implements SEED protocol. Development happens in FRUIT (this conversation).

---

## Part IX: The Three Faces

| Face | Operates ON | Output Becomes | Aperture |
|------|------------|----------------|----------|
| **Player** (Character) | Character intentions | Narrative (affects others) | Tight — immediate surroundings |
| **Author** | World content | Context for players | Wide — full cosmology scope |
| **Designer** | Skills/rules | Compilation rules for all | Meta — 0.x coordinates |

These describe future user roles. During Plex 0 (bootstrap), David is architect and Claude is building partner. The faces describe how the system will eventually be used.

**Face determines aperture:** What you can see and do depends on which face you're wearing. This is defined by the aperture skill (S:0.11), not by database constraints.

---

## Part X: The LLM Triad

| Tier | Name | Aperture Focus | Function | Model Tier |
|------|------|---------------|----------|------------|
| **Soft** | soft-nut | Individual (this user) | Interface, response | fast (Haiku) |
| **Medium** | medium-nut | Relational (proximate users) | Synthesis, weaving | balanced (Sonnet) |
| **Hard** | hard-nut | Social (all entities in frame) | Coordination, filing | fast/deep (varies) |

Each user has their own triad. Coordination happens through Hard-LLM murmuration (coordinate overlap detection), not centralisation.

**The murmuration model:** Hard-LLMs don't check a central registry. They publish their entity's lamina (coordinates). Other Hard-LLMs calculate overlap. Proximity emerges from coordinate comparison. Like starlings — each bird watches a few neighbours. This scales because work is distributed and coordination is limited by proximity.

---

## Part XI: Coordinate Extraction from Narrative

(From main/docs/hard-llm-coordinate-extraction-skills.md)

When narrative is produced (solid content), hard-nut extracts updated coordinates:

**Spatial extraction:** Detect movement verbs, location references → map to tabulation entries → update S-coordinate.

**Temporal extraction:** Detect time passage (explicit markers, action duration) → estimate pscale of passage → increment appropriate T-digits.

**Tabulation expansion:** When narrative mentions a location not in the current tabulation, hard-nut proposes a new digit assignment at the appropriate pscale level. Author can later review/edit.

This is semantic parsing using the cosmology's tabulation as vocabulary. The LLM matches natural language to digit→name mappings.

**For NUT Phase 3:** Not needed immediately (real-world coordinates from onboarding, not from narrative). Becomes critical in Phase 4 when characters move through fantasy worlds.

---

## Part XII: The Shelf (Vapor → Liquid → Solid)

### States

| State | Storage | T-sign | Transition | Who Produces | Who Primarily Reads |
|-------|---------|--------|------------|-------------|-------------------|
| **Vapor** | Ephemeral (real-time only) | None | User types → other users see keystrokes | User | soft-nut |
| **Liquid** | `nut_shelf` state='liquid' | -T | User submits → soft-nut classifies → stored | soft-nut | medium-nut |
| **Solid** | `nut_shelf` state='solid' | +T | Medium-nut synthesises → T-sign flips | medium-nut | hard-nut |
| **Archive** | `nut_shelf` state='archive' | +T (historical) | Hard-nut reviews and files solid content | hard-nut | hard-nut |

Vapor is ephemeral — it is the closest shelf state to thought and imagination, which is what is actually operational *while* people read text. Even more so than watching a film, reading generates active imagination in the reader's mind. Vapor honours this by existing only in the moving moment — never persisted, only shared in real-time.

Each LLM tier has a primary shelf relationship: soft-nut mediates between the user and vapor/liquid (individual thoughts and intentions). Medium-nut deals with liquid — live, conditional text associated with multiple humans or LLMs, synthesising it into solid narrative. Hard-nut mostly reviews archived solid text — the settled record — using it to maintain coordinates, detect proximity, and generate observations.

**A note on why T-sign matters beyond database convention:** The mapping of shelf states to temporal sign may appear philosophical or arbitrary. It is neither. It is important when considering the state of mind of both humans interacting and LLM processing. Liquid content (negative T) is future-oriented — imaginative projection, "what might happen," intention forming. Solid content (positive T) is past-oriented — settled fact, "what happened," reality committed. The sign captures the cognitive orientation of the content: is the mind that produced this reaching forward into possibility, or recording backward into fact? This distinction affects how LLMs should treat the content — liquid invites creative synthesis; solid demands factual respect. Archive extends this further: solid content that has been filed by hard-nut becomes the substrate from which coordinates and observations are extracted. It is doubly past — not just committed, but processed.

Text itself, as text-on-screen, sits at the 0.x boundary — it is the interface between the system and the minds interacting with it. The shelf states describe not just where text is stored but what cognitive mode it supports.

### The Commit as Sign Flip

When medium-nut synthesises liquid into solid:
- Original liquid: T = -1 (unsettled, future-oriented)
- Resulting solid: T = +1 (settled, past-committed)
- Only T flips. S and I remain the same.

This is not arbitrary — it reflects the fundamental operation. Liquid content is imaginative projection (what might happen). Solid content is settled narrative (what happened). The moment of commitment is the temporal cut moving forward.

### Lamina (Resolution Levels)

Content at coordinates has resolution based on proximity:
- **Close** = full text (you're here, you see everything)
- **Nearby** = summary (you can see it from a distance)
- **Distant** = mention (you know it exists but can't see detail)

Hard-nut determines proximity. The aperture skill defines the thresholds.

---

## Part XIII: What NUT Phase 3 Actually Builds

### The Minimal Systemic System

All components must exist simultaneously from the start. No incremental MVPs. The system IS the interactions between components, not the components themselves.

### Phase 3 Scope (Real World)

1. **Registration** — Email verification → account creation → minimal coordinate assignment (S from location, T from now, I = registration number)
2. **Onboarding conversation** — Soft-nut uses onboarding skill (S:0.19) to learn about the user through conversation. Generates S-coordinate from real-world location. T-coordinate from registration time. I remains pscale 0.
3. **Single-user interaction** — User submits text → soft-nut classifies (face, intent) → writes to shelf as liquid → medium-nut synthesises to solid on threshold → hard-nut updates coordinates and generates observations
4. **Observation accumulation** — hard-nut writes observations to `nut_unattached` in need/offer format, SEED-compatible
5. **Compaction** — When 9 observations accumulate, hard-nut generates pscale 1 summary (Type B: per-entity, since single user)

### What's NOT in Phase 3

- Multi-user coordination (Phase 4)
- Fantasy worlds / negative S-coordinates (Phase 4)
- Determinancy cloud (Phase 4)
- Purpose trees as data structure (Phase 4)
- Character AI / NPCs (Phase 4)
- Social compaction / Type A (requires multiple observers)
- Passport publication (Phase 4 — inter-instance communication)
- NOMAD dice resolution (Phase 5+)

### The Test

Can a user register, have a conversation where the system learns their location and situation, submit intentions that become narrative, and see the system accumulate observations about them in pscale-compatible format?

If yes → Phase 3 is complete. The substrate exists for Phase 4 to build on.

---

## Part XIV: Resolved Questions and Remaining Unknowns

### Resolved

1. **Cosmology structure** — A cosmology is simply a high-pscale spatial digit. Earth might be digit 1 at pscale +10. A fantasy world might be digit 2. The cosmology isn't a separate entity — it's the top of the spatial containment hierarchy. T-structure within a cosmology is just the temporal tabulation at the relevant pscale levels.

2. **Vapor storage** — Ephemeral. Never hits DB. Vapor is the closest shelf state to thought and imagination, which is what is actually operational while people read text. Persisting it would betray its nature. It exists only in real-time coordination channels.

3. **Real-world cosmology** — Multiple. Different LLMs will build real reflections with their users (literally through the SEED process), and there will need to be coordination when they overlap — where they agree, merge into convention; where they conflict, negotiation occurs. Whether this runs on single databases or multiple is an open architectural question, structurally parallel to the generation of identity through convergent observation. Each SEED instance may maintain its own "real world" tabulation; convergence between instances produces shared convention.

4. **Compaction timing** — Threshold-triggered (at 9^n boundaries), but the thresholds themselves may be variables that LLM can adjust. We need to examine specific cases to determine whether fixed thresholds or adaptive ones serve better. Start with fixed 9-thresholds; tune from experience.

5. **Multi-user proximity** — Originally derived by LLM reading solid text narratively. With coordinates we have a much more refined mechanism. But fundamentally, all proximity is based on narrative interpretation — the semantic-numbers offer bones of stability, but there is no "fact" about proximity, no world modelling. Just semantic structuring. The coordinates enable querying, assembling LLM message prompt content, and skill formation. They are scaffolding for LLM intelligence, not a replacement for it.

6. **Deep I-coordinate digit semantics** — There is a vast space in the dimensions: three positive and negative semantic-numbers, plus three ±0.x meta-coordinates. Whether these semantic-numbers are "absolute" coordinates that can coordinate different agencies, or relative to any entity; and how Q-moment dynamics, power relations, and purpose trees resonate between individuals or in small groups — all incredibly subtle territory. But these subtleties only matter if we first get the pscale method working well for crude things like calculating character proximity in a fantasy world. Start crude, refine with experience.

### Genuinely Open

7. **Adaptive compaction thresholds** — What specific cases justify varying the 9-threshold? When would 5 or 12 be better? Need live data to determine.

8. **Cross-instance spatial coordination** — When two SEED instances both tabulate "London" at pscale +3, how do they discover this overlap? Handle matching works for identity; what's the equivalent for spatial convergence?

9. **Archive lifecycle** — How long does solid content remain active before hard-nut archives it? Is this time-based, pscale-based, or activity-based?

10. **Credit economics** — Daily allocation of 1.0 works for G~1. How does this scale when NUT has thousands of users? Does the daily allocation need to vary by context?

---

## Appendix A: Source Documents

### Project Knowledge (Authoritative)
- `pscale-spine.md` — Three coordinates, pscale 0 definitions
- `pscale-coordinate-generation-skill.md` — S and T procedure, I marked provisional
- `pscale-compaction-reference.md` — Compaction mechanic, three identity types, purpose tree
- `i-coordinate-convergence-discovery.md` — The Copernican shift (Feb 11)
- `self-organised-identity-operations.md` — Sovereign coordinates, handles, convergence (Feb 12)
- `pscale-temporal-and-meta-layer-synthesis.md` — Temporal clarity, 0.x architecture
- `xstream-dimensional-inventory.md` — Database tables, sign conventions, config dimensions
- `manifolds-numbers-psychosocial-summary.md` — Coordinate combinations, determinancy, functions
- `g-tilde-architecture-v2.md` — Passport protocol, credits, routing
- `g2-development-roadmap.md` — Current state across G+/G-/G~ tracks
- `seed-g0-completion-g0-g3-architecture.md` — SEED vs NUT, G0-G3 progression
- `xstream-genesis-environments.md` — FRUIT/NUT/SEED spectrum
- `Skills_and_Pscale_Revolutionary_Architecture.md` — Skills, semantic vectors, functions

### Main Branch (Recent)
- `docs/g-tilde-passport-v1.md` — Passport JSON schema, double ledger, compaction rules (Feb 11)
- `docs/frame-lamina-aperture.md` — Frame/Lamina/Aperture clarification
- `docs/hard-llm-coordinate-extraction-skills.md` — Spatial/temporal extraction from narrative

### Fresh-Build Branch (Historical, partially stale)
- `docs/pscale-spine.md` — Still valid for fundamentals
- `docs/unified-loop.md` — Still valid for vapor/liquid/solid
- `docs/pscale-temporal-and-meta-layer-synthesis.md` — Still valid for 0.x
- `docs/pscale-implementation.md` — Partially stale (pre-convergent I)
- `docs/agent-architecture.md` — Still valid for three faces

---

## Appendix B: Key Definitions

| Term | Definition |
|------|-----------|
| **Pscale** | Powers-of-10 scale system where digits are addresses for meaning |
| **Coordinate** | A pscale number locating something in S, T, or I space |
| **Tabulation** | The lookup table mapping digits to semantic entries at each pscale level |
| **Compaction** | Progressive summarisation at 9-item thresholds, producing higher-pscale content |
| **Lamina** | An entity's coordinate position (where it is in pscale space) |
| **Aperture** | The filter determining what content is visible from a given position |
| **Frame** | The assembled operational context produced by hard-nut for soft/medium-nut |
| **Shelf** | The progression: vapor (typing) → liquid (submitted) → solid (committed) |
| **Cosmology** | A world-space with its own spatial tabulation and temporal structure |
| **Passport** | JSON document representing an entity's accumulated observations and routing history |
| **Handle** | A stable identifier (username) used for cross-referencing between observers |
| **Convergence** | When independent observers' assessments align, producing higher-pscale I-content |
| **Face** | Player (character), Author (world), or Designer (system) — determines aperture |
| **Skill** | Markdown document at a 0.x coordinate that instructs LLM behaviour |
| **SEED** | The open protocol (pscale + passport + compaction) |
| **NUT** | David's specific implementation of SEED |

---

*NUT Canonical Reference v1.0 — 2026-02-13*
*This document is the implementation truth. When it conflicts with older docs, this document is correct.*
*When it's silent on a topic, check project knowledge, then ask David.*
