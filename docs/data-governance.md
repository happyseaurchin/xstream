# Xstream Data & Governance Specification

**Hard-Edge Architecture for Platform Implementation**

---

## Core Principle

**Everything is text at coordinates.** No categories. No types. Just pscale position determines what content is and how it's processed.

| Pscale Range | What Lives There | Who Creates It |
|--------------|------------------|----------------|
| Negative (-1 to -∞) | Rules, skills, physics, governance | Designer face |
| Zero (0) | Present-moment action, current state | Player face |
| Positive (+1 to +∞) | World content, history, canon | Author face |

**The orc and the physics rule are both content.** The orc is at S:321 (room-scale). The "no guns" rule is at S:-2 (cosmology physics). Hard-LLM queries both when validating.

---

## Database Schema

### Single Content Table

```sql
content (
  id UUID PRIMARY KEY,
  cosmology_id UUID,           -- which coordinate space
  coordinates JSONB,           -- {t: X, s: Y, i: Z}
  shelf TEXT,                  -- 'vapor' | 'liquid' | 'solid'
  text TEXT,                   -- the actual content
  lamina JSONB,                -- resolution metadata
  created_at TIMESTAMP,
  created_by UUID              -- user who created (for provenance)
)
```

**That's it.** One table. Everything else is computed.

### Indexes for Coordinate Queries

```sql
-- Proximity queries (the core operation)
CREATE INDEX idx_content_coordinates ON content USING GIN (coordinates);
CREATE INDEX idx_content_cosmology ON content (cosmology_id);
CREATE INDEX idx_content_shelf ON content (shelf);

-- Temporal ordering within coordinate space
CREATE INDEX idx_content_temporal ON content ((coordinates->>'t'));
```

### Coordinate Structure

```json
{
  "t": 1005,      // temporal position
  "s": 321,       // spatial position
  "i": 400        // identity position
}
```

**Place value = pscale level.** 321 means pscale 2 (300s) → pscale 1 (320s) → pscale 0 (321).

### What Coordinates Mean

| Dimension | Positive Values | Zero | Negative Values |
|-----------|-----------------|------|-----------------|
| **Temporal (t)** | Future/settled | Now | Meta-temporal (rules about time) |
| **Spatial (s)** | World content (places, things) | Here | Physics rules, world constraints |
| **Identity (i)** | Others, institutions | Self | Governance rules, permissions |

---

## Processing Layer: Triad LLM

### Frame Assembly (Hard-LLM Territory)

**Frame is not stored. Frame is computed.**

```
Frame = query(
  center: entity.coordinates,
  aperture: skill.aperture_range,
  cosmology: entity.cosmology_id
)
```

Hard-LLM assembles frame by querying coordinate-proximate content across ALL pscale levels:

```sql
-- Pseudocode for frame assembly
SELECT * FROM content
WHERE cosmology_id = :cosmology
  AND coordinate_distance(coordinates, :entity_coords) < :aperture_threshold
ORDER BY
  coordinate_distance(coordinates, :entity_coords),
  (coordinates->>'t')::numeric DESC  -- most recent first within proximity
```

**This single query returns:**
- Negative pscale: Rules that apply here (physics, governance, skills)
- Zero pscale: Current state (what's happening now)
- Positive pscale: World content (what exists here)

### The Validation Question

> "Is this orc allowed? Is this gun allowed?"

**Same check. Different coordinates.**

| Content | Coordinates | Validation Query |
|---------|-------------|------------------|
| "An orc guards the door" | t:1000 s:321 i:0 | What rules exist at s:-2 (cosmology physics)? |
| "I draw my pistol" | t:1005 s:321 i:player | What rules exist at s:-2? Does "firearms" appear in prohibited list? |
| "A mountain range rises" | t:high s:500 i:author | What governance exists at i:-2? Does author have permission at s:500? |

**Hard-LLM performs this check by including negative-pscale content in frame assembly.** The rules are just content. The LLM interprets whether the action/content fits.

---

## Governance as Coordinate-Positioned Content

### Designer Content (Negative Pscale)

```
Cosmology physics:     t:-∞  s:-2  i:0   "URB operates without firearms. Magic requires..."
Governance threshold:  t:-∞  s:-1  i:-2  "Content at s:500+ requires creator approval."
Skill definition:      t:-∞  s:-1  i:-1  "## Aperture\nInclude content within 2 pscale..."
```

### How Governance Executes

1. **Player submits action** → vapor at player's coordinates
2. **Soft-LLM refines** → liquid (intention clarified)
3. **Medium-LLM synthesizes** → proposed solid
4. **Hard-LLM validates:**
   - Query negative-pscale content proximate to action coordinates
   - LLM interprets: does proposed solid fit rules?
   - If yes → solid commits, coordinates update
   - If no → rejection returned, solid doesn't commit

### Permission Levels (All Skill-Defined)

| Scope | Negative Pscale | Example Rule |
|-------|-----------------|--------------|
| Cosmology-wide | s:-2, i:0 | "No technology beyond medieval" |
| Region | s:-1, i:0 | "Magic weakened in the Deadlands" |
| Personal | s:0, i:-1 | "Only creator can modify their character" |
| Governance | s:-1, i:-2 | "Changes at s:500+ need threshold approval" |

**The rules are content.** Designers create/modify rules through the same loop. Current rules govern whether rule-changes commit.

---

## The Three Checks

When Hard-LLM validates, it performs three coordinate-based checks:

### 1. Physics Check (Author Domain)

> "Does this content fit world constraints?"

Query: `s:-2` (cosmology physics) + `s:-1` (regional rules)

Example: Player says "I fire my gun." Hard-LLM finds at s:-2: "No firearms exist in URB." → Rejection or reinterpretation.

### 2. Existence Check (Author Domain)

> "Does referenced content exist at these coordinates?"

Query: Positive spatial pscale at action location

Example: Player says "I attack the orc." Hard-LLM finds at s:321: "An orc guards the doorway." → Orc exists, action valid.

### 3. Permission Check (Designer Domain)

> "Does this entity have authority to create/modify at these coordinates?"

Query: `i:-2` (governance rules) + identity-proximity

Example: Author submits mountain range at s:500. Hard-LLM finds at i:-2: "s:500+ requires cosmology owner approval." → Routes to approval flow.

**All three checks are the same operation:** query coordinate-proximate content, LLM interprets fit.

---

## Content Lifecycle

### Creation Flow

```
Human input (vapor)
    ↓
Soft-LLM: Refine intention, assign provisional coordinates
    ↓
Liquid (visible to proximate entities)
    ↓
Medium-LLM: Synthesize, generate solid candidate
    ↓
Hard-LLM: Validate against coordinate-proximate rules
    ↓
[Pass] → Solid commits at coordinates
[Fail] → Rejection returned, no commit
```

### Coordinate Assignment

| Face | Soft-LLM Assigns | Hard-LLM Adjusts |
|------|------------------|------------------|
| Player | t:now, s:character_location, i:character | t:incremented based on action duration |
| Author | t:specified, s:content_scope, i:0 (canonical) | i:author if not yet approved for canonical |
| Designer | t:-∞, s:rule_scope, i:rule_scope | Commits only if governance passes |

### The i:0 vs i:author Distinction

- **i:0** = Canonical content, visible to all queries at that s/t
- **i:author** = Personal content, visible only when identity-proximate to author

Author submits content → initially at i:author
Governance approves → recoordinated to i:0 (canonical)

This is "merging" — just coordinate reassignment.

---

## XYZ Settings as Coordinate Filters

The X0Y0Z0 settings modify how frame assembly queries:

| Setting | Frame Assembly Modifier |
|---------|------------------------|
| **X0** (no persistence) | Exclude content where created_at < session_start |
| **X1** (persistence) | Include all temporal coordinates |
| **Y0** (bleeding edge) | Only t:now ± small threshold |
| **Y1** (block universe) | Include all t values within spatial proximity |
| **Z0** (inert substrate) | Exclude i:player solid from frame; only author content |
| **Z1** (mutable) | Include i:player solid; player changes persist |

**These are aperture skill parameters, not database flags.**

---

## Practical Queries

### "What can I see?" (Player Frame)

```sql
SELECT * FROM content
WHERE cosmology_id = :cosmology
  AND shelf = 'solid'
  AND (
    -- Spatially proximate (positive pscale)
    ABS((coordinates->>'s')::numeric - :player_s) < :spatial_aperture
    OR
    -- Rules that apply here (negative pscale)
    (coordinates->>'s')::numeric < 0
  )
  AND (
    -- Temporally proximate
    ABS((coordinates->>'t')::numeric - :player_t) < :temporal_aperture
    OR
    -- Timeless rules
    (coordinates->>'t')::numeric < 0
  )
  AND (
    -- Canonical content (i:0)
    (coordinates->>'i')::numeric = 0
    OR
    -- My content
    (coordinates->>'i')::numeric = :player_i
    OR
    -- Identity-proximate others
    ABS((coordinates->>'i')::numeric - :player_i) < :identity_aperture
  )
```

### "Is this action valid?" (Hard-LLM Check)

```sql
-- Get rules that apply to this action's coordinates
SELECT * FROM content
WHERE cosmology_id = :cosmology
  AND shelf = 'solid'
  AND (coordinates->>'s')::numeric < 0  -- negative pscale = rules
  AND (
    -- Cosmology-wide rules
    (coordinates->>'s')::numeric <= -2
    OR
    -- Rules at action's spatial scope
    ABS((coordinates->>'s')::numeric) <= :action_spatial_pscale
  )
```

Hard-LLM receives these rules as context, interprets whether action fits.

### "Who needs to approve this?" (Governance Check)

```sql
-- Get governance rules for this content scope
SELECT * FROM content
WHERE cosmology_id = :cosmology
  AND shelf = 'solid'
  AND (coordinates->>'i')::numeric < 0  -- negative identity pscale = governance
  AND (coordinates->>'s')::numeric >= :content_spatial_pscale  -- rules at or above content scope
```

---

## Implementation Checkpoints

### Checkpoint 1: Single Table Working

- [ ] Content table with coordinates JSONB
- [ ] Basic INSERT/SELECT with coordinate filtering
- [ ] Shelf state transitions (vapor → liquid → solid)

### Checkpoint 2: Coordinate Proximity Queries

- [ ] Distance function for coordinate comparison
- [ ] Frame assembly query returns mixed pscale content
- [ ] Aperture parameters modify query range

### Checkpoint 3: Triad LLM Integration

- [ ] Hard-LLM receives frame as context
- [ ] Hard-LLM interprets rules against proposed content
- [ ] Validation pass/fail determines commit

### Checkpoint 4: Governance Operational

- [ ] Negative-pscale content (rules) queryable
- [ ] Permission checks route to approval flows
- [ ] Designer face can create/modify rules

---

## Summary

| Component | Implementation |
|-----------|----------------|
| **Database** | Single `content` table with coordinates JSONB |
| **Categories** | None — pscale position determines type |
| **Frame** | Computed from coordinate proximity query |
| **Rules** | Content at negative pscale |
| **Permissions** | LLM interpretation of governance content |
| **Validation** | Hard-LLM queries rules, interprets fit |
| **Faces** | Same loop, different skill proximity |

**The rubber hits the road:** Hard-LLM queries coordinates, receives content + rules, interprets validity, commits or rejects. No special permission tables. No category logic. Just coordinates and LLM interpretation.
