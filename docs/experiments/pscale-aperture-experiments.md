# Pscale Aperture Experiments: Summary

## What We Built

Four artifacts exploring pscale coordinates as semantic positioning:

| Artifact | Dimension | Purpose |
|----------|-----------|---------|
| `pscale-aperture-template.jsx` | Spatial | Place containment hierarchy |
| `pscale-identity-aperture.jsx` | Identity | Psycho-social positioning |
| `pscale-temporal-aperture.jsx` | Temporal | Time scales (two modes) |
| `pscale-triple-aperture-v2.jsx` | Combined | S × T × I synthesis |

---

## Core Mechanism

**Coordinate = semantic position.** Place value corresponds to scale.

```
321.4 → pscale -1 (object/instant/aspect)
321   → pscale 0  (room/moment/individual)
320   → pscale 1  (structure/hour/group)
300   → pscale 2  (region/day/community)
```

**Four attention modes** from any position X:

| Mode | Meaning | Query |
|------|---------|-------|
| X | This itself | Exact match |
| X- | Within (children) | One pscale finer, within X's range |
| X+ | Context (parent) | One pscale coarser, containing X |
| X~ | Lateral (siblings) | Same pscale, same parent, not X |

**Key discovery:** X as anchor creates relational framing. Without X, you get plain description. With X, other modes relate *to* it.

---

## Spatial Dimension

**Works cleanly.** Containment hierarchy is intuitive:
- Region contains structures
- Structures contain rooms
- Rooms contain objects

Content is now **anonymous** (no names) to prevent it dominating identity.

Example: `"A massive stone fireplace, embers glowing, a cat curled in warm ashes."`

---

## Identity Dimension

**Relational engagement emerged.** The only dimension with names.

| Pscale | Scale | Example |
|--------|-------|---------|
| 2 | Community (~100) | The Thornwood Folk |
| 1 | Group (~10) | The kitchen staff |
| 0 | Individual | Martha the Cook |
| -1 | Aspect | Martha's authority, grief, secret |

**Finding:** X~ (peers) needs X present to show *relationships*. Without X, it's just a list. The coordinate is always the reference point, even if X content isn't selected.

**Non-human test:** Blackthorn (horse) works at pscale 0 with human peers in the stable group. Aspects (temper, memory, bond) work at pscale -1.

---

## Temporal Dimension

**Two interpretations tested:**

### Individual-Anchored
One person's timeline at different zoom levels:
- 300 = Martha's day
- 320 = Martha's hour
- 321 = Martha's 5-10 minute activity
- 321.1 = Martha's instant

Useful for: character-centric narrative, personal rhythm.

### Scale-Matched
Time coupled to identity scale:
- 300 = Community's day (the Thornwood's rhythm)
- 320 = Group's hour (the kitchen's hour)
- 321 = Individual's moment (Martha tastes the stew)
- 321.1 = Gesture (hand pauses)

Useful for: collective rhythm, parallel activities, social time.

**Critical learning:** LLM needs explicit temporal constraint. Without "Time scale: an hour", it drifts to larger scales. The prompt now includes scale labels.

**Content is anonymous:** Actions without attribution.
- `"A tasting: ladle lifted, steam blown aside, liquid meeting tongue."`
- `"A hand hovering over a salt cellar. A half-second of uncertainty."`

---

## Triple Aperture Synthesis

**Hypothesis:** Identity binds anonymous spatial and temporal fragments into situated experience.

**Prompt structure:**
```
Position: S:321.4 T:321.1 I:321
Time scale: 5-10 minutes

PLACE:
[S:321.4] A massive stone fireplace, embers glowing...

HAPPENING (5-10 minutes):
[T:321.1] A hand hovering over a salt cellar...

WHO:
[I:321] Martha the Cook: broad-shouldered, iron-voiced...

The WHO inhabits the PLACE during the HAPPENING. Synthesize. 2-4 sentences. No headers.
```

**Findings:**
- When coordinates align (S:321.4, T:321.1, I:321), synthesis is coherent
- When coordinates mismatch, LLM invents bridging narrative (Martha in the stable doorway)
- Named content dominates — if temporal says "Martha's hand", identity coordinate is ignored
- Spatial should anchor as the scene; identity inhabits; temporal unfolds

---

## Prompt Engineering Learnings

| Problem | Solution |
|---------|----------|
| LLM produces headers, categories | "No headers" |
| Over-analysis ("Self:", "Within:") | Remove all categorical instruction |
| Verbose output | "2-3 sentences" + max_tokens: 150-200 |
| Temporal drift to larger scales | Explicit "Time scale: an hour" |
| Named content overrides coordinates | Anonymous S/T content, names only in I |

**Minimal effective instruction:**
```
Position: X

[content]

Relate these in 2-3 sentences. No headers.
```

---

## Open Questions

### Temporal
1. **Is temporal "actions" or "duration-feel"?** Current content describes happenings. Should it instead describe *what kind of time this is*? (Rushed hour vs languid afternoon?)

2. **Individual-anchored vs scale-matched:** Which is primary? Can they coexist? Perhaps individual-anchored is a *view* onto scale-matched collective time?

3. **Cycles vs linear:** Pscale 1 (hour) implies daily repetition. How does unique event time differ from cyclical rhythm time?

### Identity
4. **Identity change through experience:** Martha in the forest camp would accumulate new relational fragments. What mechanism updates identity content based on spatial/temporal experience?

5. **Absent identity:** When I:300 (community) meets T:321.1 (instant), who experiences? The LLM finds the most concrete actor. Should this be constrained or allowed?

### Synthesis
6. **Coordinate proximity as binding:** S:321.4 and I:321 share prefix "321" — does this *actually* help the LLM bind them, or is it just numeric noise?

7. **What pulls, what pushes?** Current model: spatial contains, identity inhabits, temporal unfolds. But could temporal *contain* (a year contains seasons)? Could identity *anchor* space (Martha's kitchen)?

8. **Determinancy cloud integration:** How do committed events (with pscale coordinates) become content fragments? Does the Hard-LLM analyse incoming text and emit coordinate-tagged fragments?

9. **Interference:** When two characters' temporal coordinates overlap in the same spatial coordinate, what happens? Whose instant is it? Both? Does X~ become relevant across identity?

10. **Scale mismatch as feature:** Martha (I:321) experiencing the community's day (T:300) in the kitchen (S:321) — is this useful? A person aware of collective rhythm while acting locally?

---

## Summary

Pscale coordinates work across all three dimensions. Key findings:

- **Spatial**: Containment hierarchy works cleanly
- **Identity**: Relational engagement emerges; names belong here only
- **Temporal**: Needs explicit scale constraint; two modes (individual-anchored vs scale-matched)
- **Synthesis**: Identity binds anonymous S/T fragments into coherent experience

The X/X-/X+/X~ notation provides four attention modes from any coordinate position. Prefix matching determines proximity. Significant figure comparison determines containment direction.

No categories. No types. Just numbers and the arithmetic of attention.
