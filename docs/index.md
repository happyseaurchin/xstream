# Documentation Index

> **Branch:** `reverse-sequence`
> **Last updated:** 2026-01-14
>
> Phased development following the Reversed Development Sequence (F before E).

---

## Start Here

<!-- The authoritative docs for this branch -->

- `xstream-build-phases.md` - **READ FIRST** — The phased development approach, current status, why F before E
- `unified-loop.md` - The single loop architecture (vapor → liquid → solid)

---

## Phase 3 Target (Current)

<!-- What we're building now -->

**Goal:** Real-world user identity, single-player, pscale coordinate assignment.

**Key docs:**
- `pscale-spine.md` - Coordinate system: three dimensions (T, S, I), place value = semantic scale
- `pscale-implementation.md` - Coordinate mechanics: strings, proximity, aperture queries
- `pscale-functions.md` - The three functions: determinancy cloud, purpose tree, narrative aperture

**Why Phase 3 first:** LLM has training data for real world. Can validate coordinate coherence before attempting Phase 4 (E) where authored content is required.

---

## Pscale Reference

<!-- Core coordinate system docs -->

- `pscale-spine.md` - Three dimensions (T, S, I), place value = semantic scale
- `pscale-implementation.md` - Coordinate mechanics: strings, proximity, aperture queries
- `pscale-functions.md` - Determinancy cloud, purpose tree, narrative aperture
- `pscale-aperture-notation.md` - X/X-/X+/X~ attention modes from any position
- `pscale-temporal-and-meta-layer-synthesis.md` - Synthesis of pscale coordinates and functions including 0.x coding
- `pscale-semantic-coordinate-whitepaper.md` - Overview of complete pscale implementation

---

## Architecture

<!-- System design docs -->

- `data-governance.md` - Hard-edge architecture: everything is text at coordinates
- `usecases.md` - Three faces (player, author, designer) proving the loop handles all domains
- `multiplayer-coordination.md` - Window timing, entity states, determinancy flow (Phase 4+)
- `agent-architecture.md` - Three faces, LLM stacks, context flow vs skill modification

---

## Experimental Results

<!-- Findings from previous work -->

- `experiments/pscale-coordinate-findings.md` - Core discovery: place value = semantic scale
- `experiments/pscale-aperture-experiments.md` - X/X-/X+/X~ notation tested
- `experiments/implementation-learnings.md` - JSX prototype findings, i:0 confusion
- `experiments/coordinate-sign-exploration.md` - ± sign semantics, membrane model
- `experiments/pscale-encoding-speculation.md` - Encoding everything in pscale coordinates

---

## Other Development Paths

<!-- Alternative approaches in other branches -->

- `plex-1-challenge.md` - The integrated build challenge (attempt-N branches)
- `new-build-transition-notes.md` - Transition notes from previous builds

---

## Infrastructure

<!-- Setup guides -->

- `setup.md` - Local dev, Supabase, Vercel *[pending]*

---

## Root Files

- `CLAUDE.md` - Claude Code instructions for this branch
- `README.md` - Project readme
