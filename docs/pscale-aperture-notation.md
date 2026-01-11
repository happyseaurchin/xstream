# Pscale Aperture Notation

## The Coordinate

A semantic number. Place value = semantic scale.

320 means: region 3, area 2, location 0.

Pscale = power of 10 of the rightmost significant digit.
- 300 → pscale 2
- 320 → pscale 1
- 321 → pscale 0
- 321.4 → pscale -1

---

## Four Modes of Attention

From any position X, four directions of attention:

| Notation | Pscale | Pattern | Meaning |
|----------|--------|---------|---------|
| X | ps(X) | 320 | Stance — this itself |
| X- | ps(X-1) | 32* | Within — children, one level more precise |
| X+ | ps(X+1) | 300 | Context — parent, one level less precise |
| X~ | ps(X~) | 3*0 | Lateral — siblings, same level, same parent |

Asterisk (*) = any non-zero digit in that position.

---

## Combinations

Combine modes for different narrative qualities:

| Combination | Effect |
|-------------|--------|
| X | Definition — what is this thing? |
| X, X- | Exploration — this and what's inside |
| X, X+ | Situation — this and what contains it |
| X, X~ | Comparison — this alongside what's nearby |
| X, X+, X~ | Full context — this within broader landscape |
| X, X-, X+, X~ | Complete aperture — all directions |

---

## How It Works

Given stance X at pscale P:

**X**: Content where coord = X exactly.

**X-**: Content where pscale = P-1 AND coord falls within X's range.

**X+**: Content where pscale = P+1 AND X falls within coord's range.

**X~**: Content where pscale = P AND shares X's parent AND coord ≠ X.

---

## Example: X = 320

Position 320, pscale 1.

| Mode | Query | Results |
|------|-------|---------|
| X | coord = 320 | Thornkeep |
| X- | pscale 0, within 320-329 | kitchen, great hall, armoury, chapel |
| X+ | pscale 2, contains 320 | The Thornwood (300) |
| X~ | pscale 1, parent 300, ≠ 320 | village, ford, grove (330, 340, 350) |

---

## Emergent Narrative Quality

The LLM produces different narrative modes based on which content it receives:

- **X alone**: Definitional. "This is..."
- **X + X-**: Exploratory. "Within, you find..."
- **X + X+**: Situating. "This stands within..."
- **X + X~**: Comparative. "Nearby, there is also..."

These qualities emerge from the coordinate relationships. The LLM isn't instructed to narrate differently — the topology carries the perspective.

---

## Summary

Stance (X) plus three relative directions (X-, X+, X~).

Pscale arithmetic determines what's visible.

Narrative quality emerges from coordinate topology.

No categories. Just numbers and attention.
