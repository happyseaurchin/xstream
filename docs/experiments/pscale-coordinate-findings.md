# Pscale Coordinates: Findings and Architecture

## The Core Discovery

Pscale coordinates are just numbers. Place value corresponds to semantic scale.

300 is the region. 320 is the keep within it. 321 is the kitchen within that. 321.4 is the fireplace within that.

Each digit you add increases specificity. The number gets longer as you get more precise. This is ordinary place value arithmetic, but here the places correspond to levels of semantic containment.

---

## What This Replaces

Traditional approaches use categories: content_type, entity_type, is_container, parent_id, relationship tables. These require parsing, type-checking, schema enforcement.

Pscale replaces all of this with number comparison. Containment, proximity, scope — all emerge from significant figure relationships between coordinates.

No categories. No types. Just digits.

---

## The Minimal Data Structure

```
content (
  coord_t    numeric,     -- temporal coordinate
  coord_s    numeric,     -- spatial coordinate
  coord_i    numeric,     -- identity coordinate
  text       text,        -- the content itself
  vector     vector,      -- semantic embedding
  created_by uuid,
  created_at timestamp
)
```

That's it. What something "is" emerges from WHERE it is in coordinate space.

---

## The Experiment

Built an artifact with spatial coordinates only. A small world: region 300, castle 320, rooms 321-324, objects 321.1-321.5.

The aperture function returns content based on coordinate relationships. Player enters position, system returns what's visible.

### First Discovery: Prefix Matching

Content shares a prefix at different resolutions. From position 321.4:
- 321.5 shares "321." — adjacent object in same room
- 322 shares "32" — adjacent room in same keep
- 330 shares "3" — adjacent area in same region

Proximity is prefix overlap. The more leading digits match, the closer.

### Second Discovery: Emergent Perspective

When we compared position precision (significant figures) against content precision, three distinct modes of perception emerged without being designed:

**Outwith** (content sf < position sf): Looking outward to what contains you. From 320, you see 300 — the region that holds the keep. The LLM naturally produces situating, contextual description: "From here you can see the broader landscape..."

**This** (content = position): The thing as unity. From 320, you see 320. The LLM produces definitional description: "You stand before Thornkeep, a weathered fortress..."

**Within** (content sf > position sf): Looking inward to contents. From 320, you see 321, 322, 321.4, etc. The LLM produces exploratory, narrative description: "Around you, the fortress reveals its workings..."

These three perspectives emerged from pure arithmetic. The LLM wasn't told "this is a container" or "describe the context." The coordinate relationships carry that information inherently.

---

## The Arithmetic

This isn't distance calculation. 321.4 minus 300 doesn't produce useful information, because they're at different scales.

The operations that work:

**Prefix extraction**: How many leading digits does this coordinate have? That's its precision level.

**Prefix comparison**: Do two coordinates share leading digits? That's proximity at that scale.

**Precision comparison**: Does one coordinate have more significant figures than another? That determines containment direction.

The aperture function is:
1. Given position, determine its significant figures
2. For each content, determine its significant figures
3. Compare: fewer sf = outward, same = this, more sf = inward
4. For outward/inward, verify prefix relationship (position falls within, or content falls within)

---

## Storage Considerations

### Standard Database

Numeric columns for coordinates. Queries use string operations on coordinate-as-text for prefix matching, plus numeric comparisons.

```sql
SELECT * FROM content
WHERE coord_s::text LIKE '32%'    -- prefix match
AND length(replace(coord_s::text, '.', '')) > 2  -- more precise than position
```

### Vector Database

Store coordinates as part of the vector or as metadata. Use hybrid queries: vector similarity for semantic resonance, coordinate filtering for topological containment.

The vector captures "what this content is about." The coordinate captures "where this content belongs." Both matter for aperture.

### Hierarchical Encoding

Coordinates could be stored as arrays: 321.4 becomes [3, 2, 1, 4]. This makes prefix operations native array operations. Trade-off: less human-readable, more query-efficient.

---

## Temporal Dimension

Not yet tested, but the same logic should apply.

Temporal coordinate: 0 is now. Positive is past (settled). Negative is future (projected).

1000 is ancient history. 1 is yesterday. 0.1 is a minute ago. 0.01 is a second ago.

From temporal position 1 (yesterday):
- Outwith: 0 (broader "now"), perhaps larger epoch markers
- This: what happened yesterday as unity
- Within: specific moments within yesterday (1.1, 1.2, etc.)

The same sig fig comparison should produce:
- Temporal context (what era contains this moment)
- This moment as unity
- Moments within (finer temporal grain)

Prediction: the LLM will naturally shift from "in that period..." (outwith) to "that day..." (this) to "first... then... finally..." (within).

---

## Identity Dimension

Already implicit in the spatial experiment. "The Thornwood" isn't just a location — it's a social-political entity. "Seat of the Warden of the Wood" implies identity hierarchy.

Identity coordinate: 0 is self. Positive is real people/institutions. Negative is fictional.

From identity position -3.12 (fictional character 12 in faction 3):
- Outwith: -3 (the faction), perhaps -0 (all fictional entities)
- This: this character as unity
- Within: aspects of this character (memories, relationships, inventory?)

Open question: does identity have the same containment structure as space? A character is "in" a faction the way a room is "in" a castle? Or is identity relational (graph) rather than hierarchical (tree)?

The experiment could test this. Build identity coordinate data, see if the three-way perspective emerges or breaks.

---

## Polarity

Sign indicates ontological status:

| Dimension | Negative | Positive |
|-----------|----------|----------|
| Temporal | Future (projected) | Past (settled) |
| Spatial | Imaginary (fictional places) | Real (actual places) |
| Identity | Fictional (characters) | Real (people, institutions) |

Zero is the present, the here, the self — the origin point of experience.

A coordinate like (t: +100, s: -321.4, i: -3.12) means: a century ago, in a fictional kitchen, involving a fictional character. The signs tell you the ontological layer without a category field.

---

## Implications for Xstream

### Frames as Coordinate Queries

The hard-LLM doesn't build frames by category logic. It queries: what content is coordinate-proximate to this player's position? The three directions (outwith/this/within) become the frame structure.

### Skills as Coordinate-Located Content

Skills are content at negative pscale (meta coordinates). The skill that governs kitchen scenes is at coord_s -321 or similar. When player is at 321.4, that skill is "outward" from them — containing, governing.

### No Entity Types

Characters, rooms, objects, skills — all just content at coordinates. What makes something a "character" is its identity coordinate being at a certain precision level. What makes something a "skill" is its location in meta-coordinate space.

### Movement as Coordinate Change

Player moves from kitchen to great hall: coord_s changes from 321 to 322. The aperture recomputes. New content becomes visible. No pathfinding, no room graph — just number change and re-query.

---

## Next Steps

1. Test temporal dimension with same artifact structure
2. Test identity dimension — does hierarchical containment hold?
3. Implement three-way aperture in actual Xstream frame computation
4. Explore coordinate assignment: how does content get its numbers? LLM inference from context? Author specification?
5. Test cross-dimensional queries: content near in space but far in time, etc.

---

## Summary

Pscale coordinates are numbers with semantic place value. Containment, proximity, and perspective emerge from significant figure comparison. The experiment demonstrated this with spatial coordinates — three modes of perception (outwith/this/within) arose from pure arithmetic without categorical logic.

This is the foundation for aperture: what content is visible from a given position, in which direction, at what scope. The LLM interprets the results naturally because the coordinate relationships carry topological meaning inherently.

No categories. No types. Just numbers and the arithmetic of attention.
