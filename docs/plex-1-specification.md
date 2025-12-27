# Plex 1: Minimal Systemic Kernel

**The irreducible core that enables everything else to be soft-coded**

---

## Relationship to Plex 0

Plex 0 is the bootstrap: David + Claude creating the system before the system exists. Using Claude.ai as interface, Supabase as database, n8n as orchestration, GitHub as code storage. The documents created in Plex 0 become the first skills.

Plex 1 is what Plex 0 creates: the minimal systemic system that allows others to participate. When Plex 1 is operational:
- The three faces (Player, Author, Designer) become distinct
- Multiple users can enter
- Skills can be modified through the system itself (not just via Claude.ai conversations)
- The LLM specializes into Character-LLM, Author-LLM, Designer-LLM

**Plex 0 → Plex 1** is the transition from bootstrap to kernel.

---

## Design Principle

Plex 1 is NOT a minimal viable product. It is a **minimal systemic system**—the smallest set of components that must exist simultaneously for the system to function at all. Remove any component and nothing works. Add components and you're hard-coding what should be skills.

---

## Pscale as Universal Organizing Principle

Everything is located by **pscale** rather than explicit relational hierarchies. No `world_id` or `content_scope`—just pscale coordinates.

**Spatial pscale mapping:**

| Pscale | Spatial Scale |
|--------|---------------|
| +16 | Cosmos (multiverse / all fictional worlds) |
| +15 | Universe |
| +14 | Supercluster |
| +13 | Cluster |
| +12 | Galaxy |
| +11 | Solar system |
| +10 | Planetary |
| +6 | Nation/continent |
| +3 | City/region |
| +2 | Neighbourhood |
| +1 | Building |
| 0 | Room (magnitude point) |
| -1 | Furniture / emotional state |
| -2 | Object / cognitive pattern |
| -3 | Q4: Action, representation (~1 sec) |
| -4 | Q3: Thought, intention (~0.1 sec) |
| -5 | Q2: Perception, belief (~0.01 sec) |
| -6 | Q1: Sensation (~0.001 sec) |

**Implications:**
- Content doesn't need parent hierarchies—it has `pscale_aperture`
- Characters don't need content_scope—they have `pscale_ceiling`
- Frames define an aperture window (floor to ceiling)
- At pscale +16, all fictional worlds are part of the same Onen cosmos
- Different physics/magic = content with different rules, resolved by skills

---

## The Core Entities

| Entity | Created By | What It Is |
|--------|------------|------------|
| **Users** | System | The humans |
| **Characters** | Players | Vessels through which Players act in content |
| **Content** | Authors | Locations, events, lore, narrative material |
| **Skills** | Designers | Processing rules, compilation protocols |
| **Packages** | Designers | Bundles of skills with signatures |
| **Frames** | Designers | Bindings that tie skills + users + pscale aperture |

**Frames are Designer constructs.** A Frame says: "These users, within this pscale aperture, governed by these skills." Players and Authors enter Frames; Designers create them.

**Characters are Player creations.** A Character is the vessel a Player inhabits to act within content. Characters can also be:
- NPCs (Author-created, Character-LLM operated)
- Auto-PCs (Player-created but currently unplayed, Character-LLM can operate)
- Shared (delivered as content for other Players to inhabit)

---

## The Five Components

```
┌──────────────────────────────────────────────────────────┐
│  1. TEXT INPUT                                           │
│     User writes → stored on shelf with lamina            │
├──────────────────────────────────────────────────────────┤
│  2. SKILL LOADER                                         │
│     Determines which packages apply → loads skill-set    │
├──────────────────────────────────────────────────────────┤
│  3. PROMPT COMPILER                                      │
│     Skills + context + input → assembled prompt          │
├──────────────────────────────────────────────────────────┤
│  4. LLM CALLER                                           │
│     Sends compiled prompt → receives response            │
├──────────────────────────────────────────────────────────┤
│  5. OUTPUT ROUTER                                        │
│     Response → stored with pscale_aperture + lamina      │
│     Response → displayed to user                         │
└──────────────────────────────────────────────────────────┘
```

That's it. Five components. Everything else (what skills exist, what rules apply, what the content contains) is soft-coded in packages.

---

## Component 1: Text Input

**Hard-coded behavior:**
- Accept text from user
- Store on shelf with metadata:
  - `user_id`
  - `timestamp`
  - `face` (player/author/designer)
  - `state` (draft/submitted/committed)

**NOT hard-coded (skill-defined):**
- What the text means
- How to validate it
- What happens next

```typescript
interface ShelfEntry {
  id: string;
  user_id: string;
  text: string;
  face: 'player' | 'author' | 'designer';
  state: 'draft' | 'submitted' | 'committed';
  timestamp: string;
  // Added by skills after processing:
  pscale_aperture?: number;  // narrative aperture (-6 to +16)
  lamina?: Record<string, any>;  // face-specific coordinates
}
```

**Lamina contents by face:**
- **Player:** `{character_id, location_id, proximity_group}`
- **Author:** `{content_region, determinancy, temporal_placement}`
- **Designer:** `{skill_target, stack_depth, affected_faces, frame_id}`

---

## Component 2: Skill Loader

**Hard-coded behavior:**
- Given a context (user + face + frame), determine which packages apply
- Load skills from those packages in resolution order
- Return assembled skill-set

**NOT hard-coded (skill-defined):**
- What the skills contain
- How they modify behavior
- What packages exist

```typescript
interface SkillLoaderInput {
  user_id: string;
  face: 'player' | 'author' | 'designer';
  frame_id?: string;  // the binding that determines which packages apply
}

interface SkillSet {
  platform: Skill[];      // always loaded, cannot be overridden
  frame: Skill[];         // frame-specific (packages attached to this frame)
  user: Skill[];          // personal preferences
}

// Resolution: later overrides earlier, except platform guard rails
```

**Skill Structure (Platform-defined):**

```typescript
interface Skill {
  id: string;
  name: string;
  package: string;        // which package this belongs to
  level: 'platform' | 'frame' | 'user';
  category: 'aperture' | 'weighting' | 'gathering' | 'format' | 'guard';
  content: string;        // markdown content (the actual skill)
  overrides?: string;     // skill id this replaces (if any)
  extends?: string;       // skill id this extends (if any)
}
```

**Note on levels:** The old hierarchy (platform/ruleset/world/campaign/user) collapsed into three levels. Ruleset, world, and campaign distinctions are now just different *packages* attached to a frame. The frame's `frame_packages` table with priority handles resolution order.

---

## Component 3: Prompt Compiler

**Hard-coded behavior:**
- Take skill-set + context + user input
- Execute gathering skills (parallel)
- Apply aperture skills (what pscale range)
- Apply weighting skills (priority)
- Apply format skills (structure for LLM)
- Return assembled prompt

**NOT hard-coded (skill-defined):**
- What to gather
- What aperture to use
- How to weight conflicts
- What format to produce

```typescript
interface CompilerInput {
  skills: SkillSet;
  shelf_entry: ShelfEntry;
  context: ContextBundle;   // gathered by gatherer skills
}

interface CompilerOutput {
  system_prompt: string;
  user_prompt: string;
  model?: string;           // skill can specify model
  temperature?: number;     // skill can specify temperature
}
```

**The Compiler Loop:**

```
1. Run all gathering skills in parallel
   → Each returns a context fragment

2. Apply aperture skill
   → Filters fragments by pscale_aperture range

3. Apply weighting skill
   → Orders fragments by priority

4. Apply conflict resolution skill (if conflicts exist)
   → Resolves contradictions

5. Apply format skill
   → Assembles into prompt structure

6. Return compiled prompt
```

---

## Component 4: LLM Caller

**Hard-coded behavior:**
- Take compiled prompt
- Send to LLM (Claude API)
- Return response

**NOT hard-coded (skill-defined):**
- Model selection (via format skill)
- Temperature (via format skill)
- Max tokens (via format skill)

```typescript
interface LLMCallerInput {
  compiled: CompilerOutput;
}

interface LLMCallerOutput {
  response: string;
  model_used: string;
  tokens_used: number;
}
```

---

## Component 5: Output Router

**Hard-coded behavior:**
- Store response with pscale_aperture and lamina
- Determine who receives the output
- Deliver to appropriate displays

**NOT hard-coded (skill-defined):**
- What pscale_aperture to assign
- What lamina coordinates to set
- Who should receive (proximity rules)
- How to format for display

```typescript
interface RouterInput {
  response: LLMCallerOutput;
  original_entry: ShelfEntry;
  skills: SkillSet;
}

interface RouterOutput {
  stored: {
    id: string;
    text: string;
    pscale_aperture: number;
    lamina: Record<string, any>;
  };
  deliveries: {
    user_id: string;
    display_type: 'synthesis' | 'echo' | 'raw';
    content: string;
  }[];
}
```

---

## The Platform Package (onen)

The only hard-coded package. Contains:

### Guard Rail Skills (cannot be overridden)

```markdown
# guard-no-private-access

This skill CANNOT be overridden.

Gathering skills may NOT:
- Access other users' private shelf entries
- Access other users' private character state
- Bypass logging of any operation
```

```markdown
# guard-skill-structure

This skill CANNOT be overridden.

All skills must conform to the Skill interface:
- id: unique identifier
- name: human-readable name
- package: package provenance
- level: platform/frame/user
- category: aperture/weighting/gathering/format/guard
- content: markdown content
```

### Default Skills (can be overridden)

```markdown
# default-aperture-standard

Pscale aperture for standard gameplay.

Include context from:
- pscale_aperture -2 to +2 for player face
- pscale_aperture +1 to +5 for author face
- pscale_aperture -5 to -3 for designer face
```

```markdown
# default-gathering-shelf

Gather recent shelf entries.

Query: Last 10 committed entries from users in proximity.
Return: Array of {user_id, text, timestamp, pscale_aperture}
```

```markdown
# default-format-claude

Format for Claude API.

System prompt structure:
1. Face identification (player/author/designer)
2. Current context summary
3. Available actions (if player)
4. Constraints (from guard rails)

User prompt: The user's submitted text.
```

### Default Designer Skills (bootstrap)

```markdown
# designer-skill-creation

When user is in designer face and wants to create a skill:

1. Validate skill structure against guard-skill-structure
2. Validate skill doesn't violate guard rails
3. Store skill in user's skill package
4. Return confirmation with skill id
```

```markdown
# designer-frame-creation

When user is in designer face and wants to create a frame:

1. Create frame record with pscale_floor and pscale_ceiling
2. Attach selected packages via frame_packages
3. Set package priorities for resolution order
4. Return confirmation with frame id
```

---

## Data Model (Supabase)

### Tables

```sql
-- Users: minimal user record
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Characters: vessels for Players to act through
CREATE TABLE characters (
  id UUID PRIMARY KEY,
  created_by UUID REFERENCES users(id),     -- the Player who created
  inhabited_by UUID REFERENCES users(id),   -- who's currently playing (null = auto-PC/NPC)
  name TEXT,
  data JSONB,                               -- state, capabilities, relationships
  pscale_ceiling INTEGER DEFAULT 10,        -- scale limit of existence (10 = planetary)
  is_npc BOOLEAN DEFAULT FALSE,             -- Author-created vs Player-created
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shelf: where all text lives
CREATE TABLE shelf (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  text TEXT NOT NULL,
  face TEXT CHECK (face IN ('player', 'author', 'designer')),
  state TEXT CHECK (state IN ('draft', 'submitted', 'committed')),
  pscale_aperture INTEGER,  -- narrative aperture (-6 to +16)
  lamina JSONB,             -- face-specific coordinates
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content: what Authors create (locations, events, lore)
CREATE TABLE content (
  id UUID PRIMARY KEY,
  author_id UUID REFERENCES users(id),
  content_type TEXT,        -- e.g., 'location', 'event', 'lore'
  data JSONB NOT NULL,      -- the actual content
  pscale_aperture INTEGER,  -- where this sits (+16 cosmos, +10 planet, +3 city...)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skills: all skill definitions
CREATE TABLE skills (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  package_id UUID REFERENCES packages(id),
  level TEXT CHECK (level IN ('platform', 'frame', 'user')),
  category TEXT CHECK (category IN ('aperture', 'weighting', 'gathering', 'format', 'guard')),
  content TEXT NOT NULL,
  overrides UUID REFERENCES skills(id),
  extends UUID REFERENCES skills(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Packages: skill bundles with signatures
CREATE TABLE packages (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  signature TEXT,           -- e.g., 'onen-official', 'david', 'urb-official'
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Frames: Designer constructs that define pscale aperture + skills
CREATE TABLE frames (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  pscale_floor INTEGER DEFAULT -3,    -- how deep (cognitive/action level)
  pscale_ceiling INTEGER DEFAULT 10,  -- how broad (planetary default)
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Frame-package composition: which packages a frame uses
CREATE TABLE frame_packages (
  frame_id UUID REFERENCES frames(id),
  package_id UUID REFERENCES packages(id),
  priority INTEGER,         -- resolution order (lower = loaded first, higher can override)
  PRIMARY KEY (frame_id, package_id)
);

-- Frame-users: who is participating in a frame
CREATE TABLE frame_users (
  frame_id UUID REFERENCES frames(id),
  user_id UUID REFERENCES users(id),
  character_id UUID REFERENCES characters(id),  -- which character they're playing (if player)
  face TEXT CHECK (face IN ('player', 'author', 'designer')),
  PRIMARY KEY (frame_id, user_id)
);
```

**Note:** No `frame_content` table needed—content is accessible based on pscale. If a frame has `pscale_ceiling = 10` (planetary), it can access all content at pscale ≤ 10 within the Onen cosmos.

---

## Plex 1 Interface (Minimal UI)

```
┌────────────────────────────────────────────────┐
│  [Player ▼]  Frame: URB-Alpha                  │  ← face selector, frame
├────────────────────────────────────────────────┤
│                                                │
│  [Synthesis area - LLM output appears here]    │
│                                                │
├────────────────────────────────────────────────┤
│  [Raw peek - others' last committed line]      │  ← click to expand
├────────────────────────────────────────────────┤
│  [Your text input]                    [Submit] │
│                                       [Commit] │
└────────────────────────────────────────────────┘
```

**That's the entire interface.**

- Face selector: player/author/designer
- Frame indicator: which frame (Designer's binding of pscale aperture + skills)
- Synthesis: Medium-LLM output
- Raw peek: what others just said
- Input: your text
- Submit: saves to shelf as submitted
- Commit: triggers compilation → LLM → synthesis

---

## Implementation Order

### Phase 1: Core Loop (Single User)

1. Shelf table + basic input UI
2. Platform skills (hard-coded initially, then migrated to database)
3. Prompt compiler (simple: concatenate skills + input)
4. LLM caller (Claude API)
5. Output router (display response)

**Test:** User can enter text, system compiles with default skills, LLM responds, response displays.

### Phase 2: Face Switching

1. Face selector UI
2. Face-aware skill loading
3. Face-specific default skills

**Test:** Switching faces changes how prompts compile.

### Phase 3: Custom Skills

1. Skill creation in designer mode
2. Skill storage in user package
3. Skill loading from user package

**Test:** User in designer mode creates skill, switches to player mode, skill affects compilation.

### Phase 4: Packages + Frames

1. Package table + creation
2. Frame table + creation (with pscale_floor/ceiling)
3. Frame-package composition with priorities
4. Package resolution order

**Test:** Designer creates frame with pscale aperture and packages, users enter frame, skills resolve correctly.

### Phase 5: Characters + Multi-User

1. Character table + creation
2. Character-user binding in frames
3. Proximity (who sees whose output)
4. Echo delivery
5. Synthesis across multiple inputs

**Test:** Two users with characters in same frame, each sees other's committed text.

---

## What Plex 1 Does NOT Include

- Character sheets (skill-defined display)
- World maps (skill-defined display)
- Chat history display (skill-defined)
- Dice rolling UI (skill-defined)
- NPC display (skill-defined)
- Any specific game mechanics (package-defined)

All of these emerge from skills and packages. Plex 1 is the substrate they run on.

---

## Success Criteria

Plex 1 is complete when:

1. A user can enter text as player/author/designer
2. Text is compiled using loaded skills
3. LLM generates response
4. Response is stored and displayed
5. User can create new skills in designer mode
6. Created skills affect subsequent compilations
7. Designer can create frames with pscale aperture + packages
8. Player can create character with pscale_ceiling
9. Multiple users in same frame share frame skills

Everything else is package content, not kernel.

---

## The Plex Sequence

| Plex | State | Characteristics |
|------|-------|-----------------|
| **0** | Bootstrap | David + Claude, no system yet, creating conditions for system |
| **1** | Kernel | Minimal systemic system, faces distinct, others can enter |
| **2+** | Growth | Additional features, all soft-coded as skills/packages |

Plex 0 is where we are now. Plex 1 is what we're building. Everything after Plex 1 is just more skills.
