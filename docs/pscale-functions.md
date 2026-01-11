# Pscale Functions

Three functions operate on coordinates. Everything else emerges from skills interpreting their outputs.

---

## 1. Determinancy Cloud

**What it is**: Semantic-numbers with causal relationships. Not a world model — a web of narrative potential weighted by significance.

**Stores**: Events as positional arrays ordered by pscale, with embedded intensity. Relationships: causes, anticipates, derives_from.

**Core operation**:
- Segment narrative into discrete events
- Assign pscale (when does this matter?)
- Derive magnitude from word choices
- Map causal relationships
- Store as distributed fragments

**Key principle**: The cloud doesn't exist in one place. Each character's Hard-LLM maintains a local fragment. Coherence emerges from overlapping local views during exchange between proximity characters.

**Updates when**: Hard-LLM commits solid content; fragments exchanged with proximity entities.

---

## 2. Purpose Tree

**What it is**: Standing wave of future-intention across temporal scales. Purposes at every pscale from -3 (reflexive) to +7 (lifetime).

**Stores**: Character motivations hierarchically. Lifetime ambition shapes seasonal goals shapes daily intentions shapes moment-to-moment desires.

**Core operation**:
- Generate from character background + current situation
- Query by aperture (center pscale ± width)
- Evolve after significant actions change wants
- Calculate interference when purposes align or conflict

**Key principle**: Not calculated per-call. Reactive potential — semantic-vectors accessible at any moment, triggered by external input. Higher scales constrain lower; lower feeds back to modify higher (settlement).

**Updates when**: Actions complete; significant events shift wants.

---

## 3. Narrative Aperture

**What it is**: Focus window with three parameters:
- **Center**: which pscale level
- **Width**: how many scales to include
- **Depth**: detail level at each scale

**Stores**: Nothing — it IS the query function.

**Core operation**:
- Filter by purposes within aperture range
- Match semantic-vectors from determinancy cloud to those purposes
- Further filter by proximity (who's attending to whom)
- Return minimal context (IDs and relationships, not full text)
- LLM requests expansion as needed (progressive disclosure)

**Key principle**: The aperture is attention filter AND chunk loader (like Minecraft loading world based on player position). Selects relevant context, doesn't generate content.

**Defined by**: Aperture skills at negative pscale. Face/context determines which skill loads.

---

## How They Serve the Loop

```
vapor → [Soft-LLM] → liquid → [Medium-LLM] → solid → [Hard-LLM] → frame update
```

| Function | Loop Stage | Role |
|----------|-----------|------|
| Narrative Aperture | All stages | Determines what enters context via coordinate proximity |
| Purpose Tree | Soft + Medium | Shapes response by loading motivations at aperture-determined scales |
| Determinancy Cloud | Hard-LLM | Updated after solid commits; exchanged with proximity |

---

## Mapping to Data Governance

| Pscale Range | Content Type | Primary Function |
|--------------|--------------|------------------|
| Negative | Rules, skills, physics | Aperture skills live here |
| Zero | Present-moment action | Purpose tree's active layer |
| Positive | World content, history | Determinancy cloud content |

**The three governance checks use these functions:**

1. **Physics**: Query negative spatial pscale → LLM interprets against determinancy cloud
2. **Existence**: Query positive spatial pscale → Does referenced content exist?
3. **Permission**: Query negative identity pscale → Does governance allow this?

All three checks are the same operation: coordinate-proximate query → LLM interprets fit. Functions provide content; aperture provides filter; skills provide interpretation.

---

## Frame Assembly

Uses all three:

1. **Aperture** determines query range (pscale levels, proximity threshold)
2. **Purpose tree** provides motivation context
3. **Determinancy cloud** provides world-state semantic-numbers

Frame is computed, not stored. The functions are the computation.

---

## Summary

| Function | Stores | Queried By | Updates |
|----------|--------|------------|---------|
| Determinancy Cloud | Semantic-numbers + causal relationships | Coordinate proximity via aperture | Hard-LLM commits, proximity exchange |
| Purpose Tree | Motivations at 11 pscale levels | Aperture (center ± width) | Action completion, significant events |
| Narrative Aperture | Nothing — IS the query | N/A | Skills define it; context determines skill |

Three functions. Coordinates in, context out. Skills interpret. LLMs execute.
