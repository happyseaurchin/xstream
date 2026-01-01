# Hard-LLM Coordinate Extraction Skills

**Purpose**: Skills for Hard-LLM to analyze narrative and extract/update pscale coordinates  
**Companion to**: `pscale-coordinates-implementation.md`

---

## Overview

Hard-LLM needs to perform two coordinate extraction tasks:

| Task | Input | Output |
|------|-------|--------|
| **Spatial Extraction** | Narrative + current coordinate + tabulation | Updated spatial coordinate |
| **Temporal Extraction** | Narrative + current coordinate + tabulation + context | Updated temporal coordinate |

These are **semantic parsing** tasks: map natural language to coordinate digits via the cosmology's tabulation.

---

## Skill: `hard-llm-spatial-extraction`

**Category**: `aperture` (determines what's in scope)  
**Applies to**: `['player']`

### Prompt Template

```markdown
# Spatial Coordinate Extraction

You are analyzing narrative to determine a character's spatial location.

## Current State
- Character: {{character_name}}
- Current spatial coordinate: {{current_spatial}}
- Decoded location: {{decoded_current}} (e.g., "keep → kitchen → fireplace")

## Cosmology Spatial Tabulation
{{spatial_tabulation_formatted}}

## Recent Narrative
{{narrative}}

## Task

1. **Detect Movement**: Did the character change location in this narrative?
   - Look for: movement verbs (walks, enters, leaves, goes, climbs, descends)
   - Look for: location references (rooms, buildings, areas, furniture)
   - Look for: implicit movement (finds themselves, arrives, reaches)

2. **If Movement Detected**: Map the new location to coordinate digits
   - Match location words to tabulation entries
   - Build coordinate from most general (left) to most specific (right)
   - Use decimal point to separate room-level (0) from furniture-level (-1)

3. **If No Movement**: Return current coordinate unchanged

## Output Format (JSON)

```json
{
  "movement_detected": boolean,
  "new_spatial": "coordinate string or null",
  "location_chain": ["building", "room", "furniture"] or null,
  "confidence": "high" | "medium" | "low",
  "reasoning": "brief explanation"
}
```

## Examples

**Example 1: Explicit movement**
- Current: "13.4" (keep, kitchen, fireplace)
- Narrative: "Marcus leaves the warmth of the fire and walks through to the great hall."
- Output: {"movement_detected": true, "new_spatial": "11.", "location_chain": ["keep", "great-hall"], "confidence": "high", "reasoning": "Explicit movement from kitchen to great hall"}

**Example 2: Furniture-level movement**
- Current: "13.4" (keep, kitchen, fireplace)
- Narrative: "He turns from the fire and sits at the long table."
- Output: {"movement_detected": true, "new_spatial": "13.3", "location_chain": ["keep", "kitchen", "table"], "confidence": "high", "reasoning": "Moved from fireplace to table within same room"}

**Example 3: No movement**
- Current: "13.4" (keep, kitchen, fireplace)
- Narrative: "The flames dance as Marcus considers his options."
- Output: {"movement_detected": false, "new_spatial": null, "location_chain": null, "confidence": "high", "reasoning": "No movement, character remains at fireplace"}

**Example 4: Ambiguous movement**
- Current: "13.4" (keep, kitchen, fireplace)
- Narrative: "Marcus needed to think. The cellar was quiet."
- Output: {"movement_detected": true, "new_spatial": "14.", "location_chain": ["keep", "cellar"], "confidence": "medium", "reasoning": "Implied movement to cellar, not explicit"}
```

### Tabulation Formatting Helper

```typescript
function formatTabulation(tabulation: SemanticTabulation): string {
  const lines: string[] = [];
  
  // Sort by pscale level descending (+2, +1, 0, -1, -2...)
  const levels = Object.keys(tabulation).sort((a, b) => {
    const numA = parseInt(a.replace('+', ''));
    const numB = parseInt(b.replace('+', ''));
    return numB - numA;
  });
  
  for (const level of levels) {
    const entries = tabulation[level];
    const entryStrs = Object.entries(entries)
      .map(([digit, name]) => `${digit}="${name}"`)
      .join(', ');
    lines.push(`Pscale ${level}: ${entryStrs}`);
  }
  
  return lines.join('\n');
}

// Example output:
// Pscale +2: 1="kingdom"
// Pscale +1: 1="keep", 2="tower", 3="village"
// Pscale 0: 1="great-hall", 2="armory", 3="kitchen"
// Pscale -1: 1="throne", 2="fireplace", 3="table"
```

---

## Skill: `hard-llm-temporal-extraction`

**Category**: `aperture`  
**Applies to**: `['player']`

### Prompt Template

```markdown
# Temporal Coordinate Extraction

You are analyzing narrative to determine temporal progression.

## Current State
- Character: {{character_name}}
- Current temporal coordinate: {{current_temporal}}
- Decoded time: {{decoded_current}} (e.g., "day-3 → afternoon → block-4")

## Cosmology Temporal Tabulation
{{temporal_tabulation_formatted}}

## Frame Temporal Context
- Session start time: {{session_start_temporal}}
- Last synthesis time: {{last_synthesis_temporal}}
- Elapsed real-time since last synthesis: {{real_elapsed}}

## Recent Narrative
{{narrative}}

## Task

1. **Detect Time Passage**: Did time pass in this narrative?
   - Explicit markers: "three hours later", "the next morning", "after sunset"
   - Implicit markers: "after finishing", "eventually", "when done"
   - Action duration: complex actions imply time (cooking a meal, traveling)

2. **Estimate Time Scale**: How much time passed?
   - Pscale -1: minutes (quick actions)
   - Pscale 0: 5-10 minute blocks (a scene)
   - Pscale +1: hours (extended activity)
   - Pscale +2: days (major transitions)

3. **Update Coordinate**: Increment appropriate digit(s)
   - Small time passage: increment rightmost digit
   - Larger passage: increment higher digit, possibly reset lower digits

## Output Format (JSON)

```json
{
  "time_passed": boolean,
  "new_temporal": "coordinate string or null",
  "time_description": "human readable" or null,
  "pscale_of_passage": number or null,
  "confidence": "high" | "medium" | "low",
  "reasoning": "brief explanation"
}
```

## Examples

**Example 1: Explicit time passage**
- Current: "34." (day-3, afternoon)
- Narrative: "Hours passed as Marcus trained with the blade. By evening, his arms ached."
- Output: {"time_passed": true, "new_temporal": "35.", "time_description": "afternoon to evening", "pscale_of_passage": 1, "confidence": "high", "reasoning": "Explicit passage from afternoon to evening"}

**Example 2: Action-implied time**
- Current: "341." (day-3, afternoon, block-1)
- Narrative: "Marcus prepared the stew, letting it simmer while he gathered herbs from the garden."
- Output: {"time_passed": true, "new_temporal": "343.", "time_description": "two blocks (~15-20 minutes)", "pscale_of_passage": 0, "confidence": "medium", "reasoning": "Cooking and gathering implies moderate time passage"}

**Example 3: Day transition**
- Current: "37." (day-3, night)
- Narrative: "Sleep came fitfully. When dawn broke, Marcus rose with purpose."
- Output: {"time_passed": true, "new_temporal": "41.", "time_description": "night to next dawn", "pscale_of_passage": 2, "confidence": "high", "reasoning": "Explicit transition to next day's dawn"}

**Example 4: No significant time**
- Current: "341." (day-3, afternoon, block-1)
- Narrative: "'What do you want?' Marcus growled at the stranger."
- Output: {"time_passed": false, "new_temporal": null, "time_description": null, "pscale_of_passage": null, "confidence": "high", "reasoning": "Single line of dialogue, negligible time"}

## Time Passage Heuristics

| Narrative Pattern | Typical Pscale | Digit Change |
|-------------------|----------------|--------------|
| Single action/dialogue | -1 or none | +1 to rightmost or none |
| Scene (conversation, task) | 0 | +1 to block digit |
| Extended activity (training, travel within area) | +1 | +1 to hour digit |
| "Later that day", "hours passed" | +1 | +1-3 to hour digit |
| "The next morning", sleep | +2 | +1 to day digit, reset lower |
| "Days passed", "a week later" | +2 or +3 | larger increment |
```

---

## Skill: `hard-llm-coordinate-synthesis`

**Category**: `aperture`  
**Applies to**: `['player']`

This skill combines spatial and temporal extraction into a single operation.

### Prompt Template

```markdown
# Character Coordinate Update

You are updating a character's position in narrative space after new events.

## Character State
- Name: {{character_name}}
- Current spatial: {{current_spatial}} → {{decoded_spatial}}
- Current temporal: {{current_temporal}} → {{decoded_temporal}}

## Cosmology Tabulations

### Spatial (Where)
{{spatial_tabulation_formatted}}

### Temporal (When)
{{temporal_tabulation_formatted}}

## Narrative to Analyze
{{narrative}}

## Task

Analyze the narrative and determine:
1. Did the character's LOCATION change?
2. Did TIME pass?

Update coordinates accordingly.

## Output Format (JSON)

```json
{
  "spatial": {
    "changed": boolean,
    "new_value": "string or null",
    "decoded": ["location", "chain"] or null,
    "reasoning": "string"
  },
  "temporal": {
    "changed": boolean,
    "new_value": "string or null", 
    "decoded": ["time", "chain"] or null,
    "reasoning": "string"
  },
  "overall_confidence": "high" | "medium" | "low"
}
```
```

---

## Edge Function Implementation Pattern

```typescript
// supabase/functions/hard-llm-coordinate-update/index.ts

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

interface CoordinateUpdateRequest {
  character_id: string;
  narrative: string;
  frame_id: string;
}

Deno.serve(async (req) => {
  const { character_id, narrative, frame_id } = await req.json() as CoordinateUpdateRequest;
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // 1. Get current coordinates
  const { data: coords } = await supabase
    .from('character_coordinates')
    .select('spatial, temporal')
    .eq('character_id', character_id)
    .single();
  
  // 2. Get character's cosmology and tabulation
  const { data: character } = await supabase
    .from('characters')
    .select('name, cosmology_id, cosmologies(spatial_tabulation, temporal_tabulation)')
    .eq('id', character_id)
    .single();
  
  const cosmology = character.cosmologies;
  
  // 3. Format tabulations for prompt
  const spatialTab = formatTabulation(cosmology.spatial_tabulation);
  const temporalTab = formatTabulation(cosmology.temporal_tabulation);
  
  // 4. Decode current coordinates for context
  const decodedSpatial = decodeCoordinate(coords.spatial, cosmology.spatial_tabulation);
  const decodedTemporal = decodeCoordinate(coords.temporal, cosmology.temporal_tabulation);
  
  // 5. Call Hard-LLM
  const anthropic = new Anthropic();
  
  const prompt = buildCoordinateSynthesisPrompt({
    character_name: character.name,
    current_spatial: coords.spatial,
    current_temporal: coords.temporal,
    decoded_spatial: decodedSpatial.join(' → '),
    decoded_temporal: decodedTemporal.join(' → '),
    spatial_tabulation_formatted: spatialTab,
    temporal_tabulation_formatted: temporalTab,
    narrative
  });
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });
  
  // 6. Parse response
  const result = JSON.parse(response.content[0].text);
  
  // 7. Update coordinates if changed
  const updates: Record<string, string> = {};
  if (result.spatial.changed && result.spatial.new_value) {
    updates.spatial = result.spatial.new_value;
  }
  if (result.temporal.changed && result.temporal.new_value) {
    updates.temporal = result.temporal.new_value;
  }
  
  if (Object.keys(updates).length > 0) {
    await supabase
      .from('character_coordinates')
      .update({ ...updates, updated_at: new Date().toISOString(), updated_by: 'hard-llm' })
      .eq('character_id', character_id);
  }
  
  return new Response(JSON.stringify({
    character_id,
    spatial_changed: result.spatial.changed,
    temporal_changed: result.temporal.changed,
    new_spatial: result.spatial.new_value,
    new_temporal: result.temporal.new_value,
    reasoning: {
      spatial: result.spatial.reasoning,
      temporal: result.temporal.reasoning
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

## Tabulation Bootstrap Problem

There's a chicken-and-egg issue:

1. Coordinates require tabulation (digit → name mapping)
2. Tabulation requires Author to define the world
3. But players might explore beyond what Author has defined

### Solution: Dynamic Tabulation Expansion

When Hard-LLM encounters a location NOT in tabulation:

```typescript
interface TabExpansionResult {
  expanded: boolean;
  new_digit: string;
  new_name: string;
  pscale_level: string;
}

// If narrative mentions "the stables" but tabulation has no stables:
// 1. Find available digit at appropriate pscale level
// 2. Add to tabulation
// 3. Return new coordinate using that digit
```

This makes the tabulation grow organically as the world is explored. The Author can later review/edit tabulation entries.

### Skill: `hard-llm-tabulation-expansion`

```markdown
# Tabulation Expansion

A location was mentioned that doesn't exist in the current tabulation.

## Current Tabulation (Spatial)
{{spatial_tabulation_formatted}}

## Mentioned Location
"{{new_location_name}}"

## Context
{{narrative_context}}

## Task

1. Determine the appropriate pscale level for this location
   - Is it a building (+1), room (0), or furniture (-1)?
   
2. Find an unused digit at that level
   - Check which digits 1-9 are already assigned
   
3. Propose the addition

## Output Format (JSON)

```json
{
  "pscale_level": "+1" | "0" | "-1",
  "suggested_digit": "1-9",
  "normalized_name": "lowercase-hyphenated",
  "parent_coordinate": "what this is inside of",
  "confidence": "high" | "medium" | "low"
}
```
```

---

## Relationship to Determinancy Cloud (Future)

The coordinate extraction skills here are about **locating** a character (WHERE and WHEN).

The determinancy cloud (which you mentioned working on for onen/alpha) is about **how fixed** the content at those coordinates is:

| Concept | Question | Output |
|---------|----------|--------|
| **Coordinate** | Where/when IS this? | `"13.4"` |
| **Determinancy** | How fixed is reality here? | `0.0 - 1.0` |

Determinancy affects whether:
- Player claims become canon easily (low determinancy)
- Existing canon resists change (high determinancy)
- Author content overrides player invention

This is for 0.8.5+ once coordinates are working.

---

## Testing the Extraction Skills

### Test Cases for Spatial

```typescript
const spatialTestCases = [
  {
    name: "explicit_entry",
    current: "11.",
    narrative: "Marcus pushed open the heavy door and stepped into the kitchen.",
    tabulation: { "0": { "1": "great-hall", "3": "kitchen" } },
    expected: { changed: true, new_spatial: "13." }
  },
  {
    name: "exit_then_enter",
    current: "13.4",
    narrative: "Leaving the warmth of the hearth, Marcus climbed the tower stairs to the armory.",
    tabulation: { "+1": { "1": "keep", "2": "tower" }, "0": { "2": "armory" } },
    expected: { changed: true, new_spatial: "22." }
  },
  {
    name: "furniture_movement",
    current: "13.4",
    narrative: "He stepped away from the fire and leaned against the door frame.",
    tabulation: { "-1": { "4": "fireplace", "5": "door" } },
    expected: { changed: true, new_spatial: "13.5" }
  },
  {
    name: "no_movement",
    current: "13.4",
    narrative: "The flames crackled as Marcus stared into them, lost in thought.",
    expected: { changed: false, new_spatial: null }
  }
];
```

### Test Cases for Temporal

```typescript
const temporalTestCases = [
  {
    name: "explicit_hours",
    current: "34.",
    narrative: "Hours passed in training. By evening, Marcus could barely lift his sword.",
    tabulation: { "+1": { "4": "afternoon", "5": "dusk", "6": "evening" } },
    expected: { changed: true, new_temporal: "36." }
  },
  {
    name: "day_transition",
    current: "37.",
    narrative: "Sleep came eventually. Dawn found Marcus already awake, watching the sunrise.",
    tabulation: { "+2": { "3": "day-3", "4": "day-4" }, "+1": { "1": "dawn" } },
    expected: { changed: true, new_temporal: "41." }
  },
  {
    name: "minor_action",
    current: "341.",
    narrative: "'I don't trust him,' Marcus said.",
    expected: { changed: false, new_temporal: null }
  }
];
```

---

## Summary

The missing piece was **how** Hard-LLM extracts coordinates from narrative. This document provides:

1. **`hard-llm-spatial-extraction`** — Detects movement, maps locations to coordinate digits
2. **`hard-llm-temporal-extraction`** — Detects time passage, updates temporal coordinate
3. **`hard-llm-coordinate-synthesis`** — Combined skill for both dimensions
4. **`hard-llm-tabulation-expansion`** — Handles locations not yet in tabulation

The key insight: this is **semantic parsing** using the cosmology's tabulation as the vocabulary. The LLM matches natural language location/time references to the digit→name mappings defined by Authors.