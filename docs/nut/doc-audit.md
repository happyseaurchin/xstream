# NUT Documentation Audit

**Date:** 2026-02-13
**Problem:** fresh-build docs frozen at ~Jan 11. A month of critical thinking has occurred since, especially around identity coordinates, passport format, compaction mechanics, and SEED/NUT separation. Coding from stale docs = building the wrong thing.

---

## Gap Analysis

### 🔴 CRITICAL GAPS — Would cause wrong implementation

| Topic | fresh-build says | Project knowledge says | Risk |
|---|---|---|---|
| **I-coordinate** | Self-reported identity. User tells LLM about themselves. Provisional. | Convergent observation. I-coordinate is NOT self-generated — it's the accumulated pattern of observations made by OTHERS. Copernican shift. (Feb 11) | If we code onboarding to assign I-coordinates from self-report, we build the pre-Copernican model. Phase 3 should generate S and T from conversation, but I should begin as minimal (pscale 0 = registration number) and GROW from observation. |
| **Compaction types** | Fresh-build has no compaction spec. References "memory" vaguely. | Three distinct types: A) Social (cross-observer convergence), B) Per-entity (one observer's depth about one entity), C) Cross-entity/reflexive (what your attention pattern reveals about you). All use same base mechanics. (pscale-compaction-reference.md) | hard-nut compaction must implement all three types with correct trigger conditions (9 observations) and correct pscale promotion rules. |
| **Passport format** | Not mentioned anywhere on fresh-build. | Fully specified JSON schema. Version, observations, entities with need/offer summaries, routing, reflexive summary, protocol URL. Shared across G+/G-/G~ tracks. (g2-development-roadmap.md) | NUT must generate passports in this exact format for SEED conformality. The `nut_unattached` → passport assembly pipeline must output matching JSON. |
| **SEED vs NUT** | No distinction. Everything is "xstream." | SEED = open protocol (any LLM, any storage). NUT = David's specific implementation (Claude, Supabase, Vercel, registration-gated). SEED instances don't know about NUT. NUT implements SEED protocol. (seed-g0-completion) | Edge functions must implement SEED-compatible observation/compaction/passport mechanics. NUT-specific code (auth, UI, Supabase) wraps the protocol but doesn't replace it. |
| **Identity is sovereign per observer** | Not addressed. Implies global I-coordinate. | Each observer maintains their OWN I-coordinate space. No global registry. Cross-referencing via handles. Convergence emerges from independent observers reaching similar assessments. (self-organised-identity-operations.md, Feb 12) | `nut_coordinates` must store per-observer I-positions, not global ones. The entity_id + observer_id pair is the key, not entity_id alone. |

### 🟡 MODERATE GAPS — Would cause suboptimal implementation

| Topic | fresh-build says | Project knowledge says | Risk |
|---|---|---|---|
| **S-coordinate procedure** | pscale-implementation.md has general principles but no step-by-step. | Full procedure: listen → search → assign digits top-down → record tabular mapping → extend as needed. Confidence: HIGH for S and T. (pscale-coordinate-generation-skill.md) | The onboarding skill (S:0.19) needs to follow this exact procedure. Without it, LLM will improvise coordinate generation inconsistently. |
| **T-coordinate** | Described generally. Sign semantics explored. | Fully specified: sequential ordering, digits ARE the meaning (unlike S where digits are labels). Position in time. T-sign: negative = future-oriented/planning, positive = past/settled. | Medium-nut T-sign flip (liquid→solid) must follow this convention precisely. |
| **0.x meta-layer** | pscale-temporal-and-meta-layer-synthesis.md covers this well. | Still current. This doc on fresh-build is actually good. | Low risk. But should cross-reference with newer coordinate generation skill. |
| **Need/Offer framing** | Not mentioned. | Observations restructured as NEED/OFFER pairs. Compaction produces need/offer pattern summaries. Matching is asymmetric ("your need matches their offer"). (g2-development-roadmap.md) | When hard-nut generates observations in `nut_unattached`, they should be structured as need/offer from the start. Retrofitting this later is painful. |

### 🟢 STILL CURRENT — No significant drift

| Topic | Status |
|---|---|
| **Pscale spine** (pscale-spine.md) | Core three dimensions, pscale 0 definitions, power-of-10 scaling — all still valid. |
| **Unified loop** (unified-loop.md) | Vapor → liquid → solid flow — still the core architecture. |
| **Three faces** (agent-architecture.md, usecases.md) | Player/Author/Designer — still valid. |
| **Data governance** (data-governance.md) | "Everything is text at coordinates" — still valid. |
| **Pscale functions** (pscale-functions.md) | Narrative aperture, determinancy cloud, purpose tree — still valid in principle, but aperture implementation has evolved. |
| **Aperture notation** (pscale-aperture-notation.md) | X/X-/X+/X~ modes — still valid. |
| **0.x meta-layer** (pscale-temporal-and-meta-layer-synthesis.md) | Still current and well-written. |

---

## The Real Problem

The fresh-build docs are a snapshot. Project knowledge is the living source of truth. But edge functions will be coded from instructions, not from a project knowledge connection. So we need the critical insights **in the repo** where the code lives.

Updating 21 existing docs is a losing game — they'll drift again next week.

## Proposed Solution: Single Canonical Reference

Instead of updating stale docs, create ONE new document that:

1. **Is the NUT implementation reference** — what the edge functions code from
2. **Captures the current state of each critical topic** — sourced from project knowledge
3. **Lives in the repo** at `docs/nut/canonical-reference.md`
4. **Supersedes** stale docs for implementation purposes (old docs remain as historical thinking)
5. **Is versioned** — updated when thinking evolves, with changelog

### Structure

```markdown
# NUT Canonical Reference
## Last verified: [date]
## Sources: [list of project knowledge docs consulted]

### 1. Pscale Coordinates
  - S: [current procedure from coordinate-generation-skill]
  - T: [current procedure + sign convention]  
  - I: [CONVERGENT OBSERVATION model, not self-report]
  - 0.x meta-layer: [current, from synthesis doc]

### 2. Observation & Compaction
  - Three types (A: social, B: per-entity, C: reflexive)
  - Trigger conditions (9-threshold)
  - Pscale promotion rules
  - Need/offer framing

### 3. Passport Format
  - JSON schema (exact, from g2-development-roadmap)
  - Assembly pipeline (nut_unattached → passport)
  
### 4. SEED Conformality
  - What NUT implements from SEED protocol
  - What NUT adds (auth, UI, Supabase-specific)
  - Boundary: where SEED protocol ends, NUT-specific begins

### 5. Identity Operations
  - Sovereign per-observer coordinates
  - Handle-based cross-referencing
  - Convergence mechanics
  - Phase 3 implications (minimal I at registration, grows from observation)

### 6. Aperture
  - Face → perception/action mapping
  - Skill content (S:0.11)
  - How it's applied by soft-nut

### 7. Edge Function Contracts
  - soft-nut: inputs, outputs, which sections it reads
  - medium-nut: inputs, outputs, which sections it reads  
  - hard-nut: inputs, outputs, which sections it reads
```

### What This Means for Implementation

Before coding each edge function, I read the relevant section of the canonical reference — not the scattered docs. If something's unclear, we check project knowledge together. When thinking evolves, we update ONE document, not twenty-one.

The stale docs stay as they are. They're thinking history, not implementation spec.

---

## Schema Implications from Gaps

The identity gap affects the schema. Current spec has:

```sql
UNIQUE(entity_id, cosmology_id)  -- on nut_coordinates
```

But if I-coordinates are per-observer, we need:

```sql
UNIQUE(entity_id, observer_id, cosmology_id)  -- per-observer positioning
```

Or we keep nut_coordinates as the SELF-REPORTED position (S and T from onboarding, I minimal) and use nut_unattached for observation accumulation that PRODUCES emergent I-coordinates over time.

**Recommendation:** For Phase 3, keep the schema as-is. S and T are self-reported (valid). I starts at pscale 0 (registration number). Observations accumulate in nut_unattached. When we reach multi-user (Phase 4+), the convergent I-coordinate emerges from compaction across observers. No schema change needed — the convergence lives in nut_unattached compaction summaries, not in nut_coordinates.

This means: nut_coordinates.i = "your filing position" (sovereign, minimal). The RICH identity coordinate is computed from accumulated observations, not stored as a single number.

---

## Action Plan

1. **David reviews this audit** — confirms gap analysis is correct
2. **Claude drafts canonical reference** — pulls current state from project knowledge into single doc
3. **David reviews canonical reference** — corrects any misreadings
4. **Canonical reference committed to repo** — `docs/nut/canonical-reference.md`
5. **Implementation proceeds from canonical reference** — not from scattered docs
6. **Stale docs get a header note:** "Historical. For current implementation spec, see docs/nut/canonical-reference.md"

---

*This audit is the map. The canonical reference is the territory.*
