# Pscale Encoding Speculation

Exploring whether the entire system — content, memory, code — can be encoded in pscale coordinates.

**Status**: Speculative. Not validated.

---

## The Loop Sequence (Corrected)

```
vapor → [soft-LLM] → liquid → [medium-LLM] → solid → [hard-LLM] → archive
```

- **Soft** refines vapor into liquid
- **Medium** synthesizes liquid into solid
- **Hard** validates solid and archives to pscale coordinates

Solid is produced by Medium. Hard validates whether it earns a place in the coordinate system.

---

## Three Coordinate Spaces

| Space | Range | Directionality | Used for |
|-------|-------|----------------|----------|
| **Positive** | 1, 321, etc. | Right-to-left (rightmost = finest) | World content: places, events, characters |
| **Negative** | -1, -321, etc. | Right-to-left (rightmost = most recent) | Character memory: archived solid |
| **Sub-unity** | 0.1, 0.123, etc. | Left-to-right (leftmost = broadest) | Infrastructure: code, skills, pending content |

---

## Positive Coordinates: World Content

Established usage. Characters, places, events at positive coordinates.

```
s:321  → region 3, area 2, location 1
t:1005 → era 1, age 0, year 0, season 5
i:400  → faction 4, group 0, individual 0
```

Pscale = rightmost significant digit's place value. Lower pscale = finer detail.

---

## Negative Coordinates: Character Memory

Archived solid accumulates at negative identity coordinates.

```
i:-1    → first solid moment (raw)
i:-2    → second solid moment
...
i:-9    → ninth solid moment
i:-11   → new moment (1), chapter summary implicit at i:-10
i:-12   → next moment
...
i:-321  → arc 3, chapter 2, moment 1
```

**How compression works:**

The pscale of the negative number indicates compression depth:
- pscale 0 (i:-X) = raw solid moments
- pscale 1 (i:-X0) = chapter summaries (compression of ~9 moments)
- pscale 2 (i:-X00) = arc summaries (compression of ~9 chapters)

When `-9` fills, the next solid becomes `-11`. The `-10` position holds the compressed summary of `-1` through `-9`. This continues recursively.

**Reading `-321`:**
- 3 = third arc (pscale 2, broadest)
- 2 = second chapter within that arc (pscale 1)
- 1 = first moment within that chapter (pscale 0, finest)

The number *is* the memory address. No separate indexing needed.

---

## Sub-Unity Coordinates: Infrastructure

The 0.xxx space for code, skills, and liminal content.

```
s:0.1   → code domain 1
s:0.12  → module 2 within domain 1
s:0.123 → function 3 within module 2 within domain 1
```

**Opposite directionality from positive/negative:**

- `321` reads right-to-left: 1 is most specific
- `0.123` reads left-to-right: 1 is broadest category, 3 is most specific

This matches how code is structured:
- `0.1` = auth domain
- `0.12` = auth/permissions module
- `0.123` = auth/permissions/check-role function

**Pscale in sub-unity:**
- pscale -1 (0.X) = domain level (coarsest sub-unity)
- pscale -2 (0.0X) = module level
- pscale -3 (0.00X) = function level (finest sub-unity)

---

## Sign Applied Contextually

Signs aren't stored universally. Applied when operation needs the distinction:

| Dimension | Positive | Negative | When applied |
|-----------|----------|----------|--------------|
| **Spatial** | Actual location | Representation of | Distinguishing real vs fictional |
| **Temporal** | Settled/known | Unknown to character | Character's awareness horizon |
| **Identity** | Public | Private | Content visibility scope |

The coordinate magnitude is stable reference. Sign is relative interpretation.

---

## Where Content Lives Before Archive

| Content type | Pre-validation location | Post-validation destination |
|--------------|------------------------|----------------------------|
| Player solid | Liminal (0.xxx or shelf state) | Negative-i (character memory) |
| Author solid | Liminal (0.xxx or shelf state) | Positive coordinates (world) |
| Designer solid | Liminal (0.xxx) | Stays in 0.xxx (compiled to skill) |

**Liquid** exists at character's current position with `shelf:'liquid'`. Visible to proximate entities during coordination window.

**Solid** (from Medium) awaits Hard validation. Could live:
- At character position with `shelf:'solid'` (simplest)
- In 0.xxx liminal space (keeps it separate from archived content)

**Archive** (after Hard validation) moves to final pscale coordinates.

---

## The Radical Proposition

Files don't exist as files. Code is content at sub-unity coordinates.

A skill like `scene.md` becomes text at `{s:0.31, t:0.1, i:0}`:
- `s:0.31` = skills domain (3), scene module (1)
- `t:0.1` = version 1
- `i:0` = public (no identity restriction)

Hard-LLM or a compiler reads from 0.xxx coordinates, assembles skill text, injects into LLM context.

**Why this might matter for LLMs:**

If LLMs can reason natively about pscale coordinates, then:
- Code structure is queryable the same way content is
- Skill loading is coordinate proximity, not file paths
- Version control is temporal coordinates, not git
- Permissions are identity coordinates, not ACLs

Everything becomes: text at coordinates, queried by proximity, interpreted by LLM.

---

## Open Questions

1. **Liquid's exact location** — shelf state at position, or 0.xxx liminal?

2. **Compression trigger** — count-based (every 9), time-based, or Hard-LLM judgment?

3. **Cross-dimension consistency** — does negative work the same for t and s as for i?

4. **Auth mapping** — where does `auth.uid → i:XXX` live? Content at 0.xxx?

5. **Practical compilation** — how does 0.xxx text become executable skill context?

---

## Summary

| Question | Proposed answer |
|----------|-----------------|
| Where is world content? | Positive coordinates (s, t, i all positive) |
| Where is character memory? | Negative identity (i:-321 encodes compression) |
| Where is code/skills? | Sub-unity coordinates (0.xxx, left-to-right hierarchy) |
| Where is pending content? | Liminal 0.xxx or shelf state |
| How is sign used? | Applied contextually, not stored |
| What's the compression mechanism? | Pscale place value = compression depth |

This is speculative. The test is whether it simplifies implementation or complicates it.
