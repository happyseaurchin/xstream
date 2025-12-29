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

## The Core Insight

> What we're building isn't a text system. It's a **temporal coordination system for shared imagination** that happens to use text as its signaling layer.
>
> The text is like musical notation during a jazz improvisation—necessary for coordination, meaningless after.

**The proof criterion**: If 3 players can spend 1 hour in the Mos Eisley cantina and feel synchronized imagination, it works. Everything else is elaboration.

---

## Pscale as Universal Organizing Principle

Everything is located by **pscale** rather than explicit relational hierarchies. Operational range: **-10 to +16**.

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
| -10 | Operational floor |

### Cosmology: The +16 Extraction

Different fictional worlds (URB, Lord of the Rings, Star Wars) exist at different addresses within the cosmos (+16). Rather than 16-digit coordinates everywhere, we extract **cosmology** as a separate entity:

```
cosmology_id + pscale_aperture(-10 to +15)
```

**Implications:**
- Within a cosmology, just use pscale (-10 to +15)
- Cross-cosmology operations are rare, explicit, high-level
- Cosmology = the +16 "digit" extracted for practical use
- Different physics/magic rules = different cosmologies
- Frames scope to a single cosmology
- Content and characters belong to a cosmology

---

## XYZ: Frame Temporal Configuration

Frames configure three dimensions of temporal experience:

| Dimension | Pole 0 | Pole 1 |
|-----------|--------|--------|
| **X** (experience record) | Deleted after session | Persisted |
| **Y** (world temporality) | Bleeding edge only | Block universe (past/future accessible) |
| **Z** (narrative substrate) | Inert/fixed | Mutable by players/authors |

### Key Configurations

| Config | Experience |
|--------|------------|
| **X0Y0Z0** | Pure ephemeral play. Nothing remains. No world state. Just synchronized imagination. |
| X0Y1Z0 | Explore fixed universe, no record. Tourism. |
| X1Y0Z0 | Keep transcript, but no world access beyond now. |
| X1Y1Z0 | Explore fixed universe, keep diary. Personal history in static world. |
| X0Y0Z1 | World changes, but no one remembers. Myth-time. |
| **X1Y1Z1** | Full persistence. Mutable world. Hardest. Worldbuilding MMO. |

**X0Y0Z0 is the proof case.** If ephemeral play works, everything else is elaboration.

### XYZ Implications for System Behavior

**X (Persistence):**
- X0: Shelf entries deleted after session ends. Character state not saved.
- X1: Everything persists to database.

**Y (Temporality):**
- Y0: Gathering skills only access current scene. No world history or future events.
- Y1: Full content access within pscale aperture. Block universe available.

**Z (Mutability):**
- Z0: Content is read-only. Players act *within* the world, not *on* it.
- Z1: Player/Author actions can modify content table. World state changes.

---

## Text States: Vapor, Liquid, Solid

Text exists in three states based on visibility and commitment:

| State | Shelf State | What Others See | Description |
|-------|-------------|-----------------|-------------|
| **Vapor** | (not stored) | Presence indicator | "User is typing..." — signal only, not content |
| **Liquid** | `submitted` | Compressed intent | Visible intention, pre-commit, can be revised |
| **Solid** | `committed` | Full text | Locked, triggers generation, becomes record |

**The inversion**: Traditional view sees solid (record) as achievement. But:
- Solid = consolidation = the fun is already over
- Liquid = exploration = where imagination lives
- Vapor = projection = the actual game

The record kills the game. A TT RPG transcript is unreadable because the text was never the thing—it was scaffolding for synchronized imagination.

### Pscale Input Constraints

Player input volume must match game pscale for *imaginative synchronization*:

| Pscale | Suggested Max Input |
|--------|---------------------|
| -2 | ~20 words |
| -1 | ~50 words |
| 0 | ~150 words |
| +1 | ~500 words |

This is skill-defined (constraint category), not hard-coded—but the principle that pscale constrains input is a design constraint for imaginative coherence.

---

## Typography Intent System (Phase 0.4.5+)

Input syntax signals routing intent:

| Syntax | Route | Behavior |
|--------|-------|----------|
| `plain text` | Soft-LLM | Default, LLM refines → vapor response |
| `"quoted text"` | Soft-LLM (dialogue) | Player speech, character-voiced |
| `{braces}` | Direct to liquid | Bypass Soft-LLM, submit raw |
| `(parens)` | Direct to solid | Bypass Soft-LLM, commit to Medium-LLM |
| `[brackets]` | Hard-LLM query | World/system state queries (future) |

This is currently hard-coded; Phase 0.5 makes it designer-editable via skills.

---

## The Core Entities

| Entity | Created By | What It Is |
|--------|------------|------------|
| **Users** | System | The humans |
| **Cosmologies** | Authors/Designers | Fictional worlds with distinct rules (URB, LoTR, etc.) |
| **Characters** | Players | Vessels through which Players act in content |
| **Content** | Authors | Locations, events, lore, narrative material |
| **Skills** | Designers | Processing rules, compilation protocols |
| **Packages** | Designers | Bundles of skills with signatures |
| **Frames** | Designers | Bindings: cosmology + skills + users + pscale aperture + XYZ config |

**Cosmologies are fictional worlds.** Each has its own physics/magic rules, history, and content. URB is one cosmology; Middle-earth is another; a sci-fi setting is another. All exist within the Onen cosmos at +16.

**Frames are Designer constructs.** A Frame says: "These users, in this cosmology, within this pscale aperture, governed by these skills, with this XYZ configuration." Players and Authors enter Frames; Designers create them.

**Characters are Player creations.** A Character is the vessel a Player inhabits to act within content. Characters can also be:
- NPCs (Author-created, Character-LLM operated)
- Auto-PCs (Player-created but currently unplayed, Character-LLM can operate)
- Shared (delivered as content for other Players to inhabit)

---

## Skill Categories

Skills are organized by category, mapping to the processing pipeline:

| Category | Stage | Purpose | Overridable? |
|----------|-------|---------|--------------|
| `gathering` | Input | What context to fetch (shelf, content, character state) | Yes |
| `aperture` | Filter | What pscale range to include | Yes |
| `weighting` | Order | Priority when context conflicts or exceeds budget | Yes |
| `format` | Output | How to structure the prompt for LLM | Yes |
| `routing` | Delivery | Who receives output, how displayed, mutations (Z1) | Yes |
| `constraint` | Validation | Tunable rules (input limits, pacing, etc.) | Yes |
| `guard` | Throughout | Immutable platform rules | **No** |
| `parsing` | Input | Typography interpretation rules (Phase 0.5+) | Yes |
| `display` | UI hints | Default visibility, face filters (Phase 0.5+) | Yes |

**Key distinction:** `constraint` skills can be overridden by packages (e.g., a combat package might tighten input limits). `guard` skills cannot be overridden by anyone—they're platform-level safety rails.

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
- Broadcast presence (vapor) via WebSocket
- Apply constraint skills (input validation)

**NOT hard-coded (skill-defined):**
- What the text means
- How to validate it (constraint skills)
- What happens next

```typescript
interface ShelfEntry {
  id: string;
  user_id: string;
  text: string;
  face: 'player' | 'author' | 'designer';
  state: 'draft' | 'submitted' | 'committed';
  timestamp: string;
  // Overall pscale aperture — may be useful for search/filtering
  // Detailed pscale coordinates are face-specific in lamina
  pscale_aperture?: number;
  lamina?: Record<string, any>;  // face-specific coordinates including pscale
}

// Vapor (not stored, WebSocket only)
interface PresenceSignal {
  user_id: string;
  frame_id: string;
  status: 'typing' | 'idle' | 'away';
}
```

### Lamina Structure by Face

Lamina contains face-specific coordinates. Pscale is multi-dimensional and relative to the face's domain.

**Player lamina:**
```typescript
{
  character_id: string,
  location_id: string,
  proximity_group: string,      // human coordination group
  // Pscale coordinates for this action
  temporal_pscale: number,      // -3 to +1 typical (action moment to scene)
  spatial_pscale: number,       // 0 to +3 typical (room to city)
  purpose_pscale?: number       // +3 to +6 if referencing long-term goals
}
```

**Author lamina:**
```typescript
{
  content_region: string,
  determinancy: number,         // 0-1, how fixed this content is
  temporal_placement: string,   // when in world history
  // Pscale coordinates for this content
  pscale_range: {
    floor: number,              // smallest scale affected
    ceiling: number             // largest scale affected
  }
}
```

**Designer lamina:**
```typescript
{
  skill_target: string,         // which skill being modified
  affected_faces: string[],     // ['player', 'author', 'designer']
  frame_id?: string,            // if frame-scoped
  stack_depth: number           // meta-level (skills about skills)
  // Designer operates meta to content pscale
  // May not have meaningful pscale coordinates
}
```

**Note:** The top-level `pscale_aperture` field provides an overall scale hint for search/filtering. The detailed, multi-dimensional pscale coordinates live in lamina where they can be interpreted per-face.

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
  category: 'gathering' | 'aperture' | 'weighting' | 'format' | 'routing' | 'constraint' | 'guard' | 'parsing' | 'display';
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

**XYZ-aware gathering:**
- If Y0: gathering limited to current scene only
- If Y1: full content access within pscale aperture

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
  frame_config: {
    x_persistence: boolean;
    y_temporality: boolean;
    z_mutability: boolean;
  };
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
   → Y0 frames: limit to current scene
   → Y1 frames: full pscale access

2. Apply aperture skill
   → Filters fragments by pscale (uses lamina coordinates, not just overall)

3. Apply weighting skill
   → Orders fragments by priority + resolves conflicts

4. Apply format skill
   → Assembles into prompt structure

5. Return compiled prompt
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
- Apply routing skills to determine delivery
- Store response with pscale_aperture and lamina
- Deliver to appropriate displays
- If Z1: apply world mutations from response

**XYZ-aware storage:**
- If X0: store to ephemeral session state only
- If X1: persist to database

**NOT hard-coded (skill-defined via routing category):**
- What pscale_aperture to assign
- What lamina coordinates to set
- Who should receive (proximity rules)
- How to format for display
- What world mutations to extract (if Z1)

```typescript
interface RouterInput {
  response: LLMCallerOutput;
  original_entry: ShelfEntry;
  skills: SkillSet;
  frame_config: {
    x_persistence: boolean;
    y_temporality: boolean;
    z_mutability: boolean;
  };
}

interface RouterOutput {
  stored: {
    id: string;
    text: string;
    pscale_aperture: number;  // overall aperture for search
    lamina: Record<string, any>;  // detailed coordinates
    ephemeral: boolean;  // true if X0
  };
  deliveries: {
    user_id: string;
    display_type: 'synthesis' | 'echo' | 'raw';
    content: string;
  }[];
  mutations?: {  // only if Z1
    content_id: string;
    changes: Record<string, any>;
  }[];
}
```

---

## The Platform Package (onen)

The only hard-coded package. Contains:

### Guard Skills (cannot be overridden)

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
- category: gathering/aperture/weighting/format/routing/constraint/guard/parsing/display
- content: markdown content
```

### Default Constraint Skills (can be overridden)

```markdown
# constraint-input-pscale

Pscale-appropriate input limits.

| Pscale | Max Words |
|--------|-----------|
| -2 | 20 |
| -1 | 50 |
| 0 | 150 |
| +1 | 500 |

Truncate with warning if exceeded.
```

### Default Gathering/Aperture/Weighting Skills (can be overridden)

```markdown
# default-aperture-standard

Pscale aperture for standard gameplay.

Filter context using lamina pscale coordinates:
- Player face: temporal_pscale -2 to +2, spatial_pscale -1 to +3
- Author face: pscale_range overlapping +1 to +5
- Designer face: all meta-level content relevant to affected_faces

Note: Uses lamina coordinates, not just overall pscale_aperture.
```

```markdown
# default-gathering-shelf

Gather recent shelf entries.

Query: Last 10 committed entries from users in proximity.
Return: Array of {user_id, text, timestamp, lamina}

Note: Respects Y dimension—if Y0, only current round.
```

```markdown
# default-weighting-recency

Weight context by recency and relevance.

Priority order:
1. Current round entries (highest)
2. Same proximity group
3. Same location
4. Same pscale band
5. Background context (lowest)

Conflict resolution: Later entry wins at same priority.
```

### Default Format Skills (can be overridden)

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

### Default Routing Skills (can be overridden)

```markdown
# default-routing-proximity

Route output based on proximity.

Delivery rules:
- Synthesis: All users in same proximity group (from lamina)
- Echo: Users in adjacent proximity (compressed)
- Raw: Not delivered outside proximity

Display type determined by relationship to speaker.
```

```markdown
# default-routing-mutations

Extract world mutations from LLM response (Z1 only).

Parse response for:
- Location state changes
- Character state changes
- Event occurrences

Apply mutations to content table.
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

1. Select or create cosmology
2. Create frame record with pscale_floor and pscale_ceiling
3. Configure XYZ dimensions (persistence, temporality, mutability)
4. Attach selected packages via frame_packages
5. Set package priorities for resolution order
6. Return confirmation with frame id
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

-- Cosmologies: fictional worlds with distinct rules
CREATE TABLE cosmologies (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,              -- 'urb', 'middle-earth', 'star-wars'
  description TEXT,
  physics_rules TEXT,              -- 'magical', 'realistic', 'sci-fi', 'mixed'
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Characters: vessels for Players to act through
CREATE TABLE characters (
  id UUID PRIMARY KEY,
  cosmology_id UUID REFERENCES cosmologies(id),  -- which fictional world
  created_by UUID REFERENCES users(id),          -- the Player who created
  inhabited_by UUID REFERENCES users(id),        -- who's currently playing (null = auto-PC/NPC)
  name TEXT,
  data JSONB,                                    -- state, capabilities, relationships
  pscale_ceiling INTEGER DEFAULT 10,             -- scale limit of existence (10 = planetary)
  is_npc BOOLEAN DEFAULT FALSE,                  -- Author-created vs Player-created
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shelf: where all text lives
CREATE TABLE shelf (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  frame_id UUID REFERENCES frames(id),
  text TEXT NOT NULL,
  face TEXT CHECK (face IN ('player', 'author', 'designer')),
  state TEXT CHECK (state IN ('draft', 'submitted', 'committed')),
  -- Overall pscale aperture for search/filtering; detailed coordinates in lamina
  pscale_aperture INTEGER,
  -- Face-specific coordinates including detailed pscale
  lamina JSONB,
  ephemeral BOOLEAN DEFAULT FALSE,  -- true for X0 frames (cleanup on session end)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content: what Authors create (locations, events, lore)
CREATE TABLE content (
  id UUID PRIMARY KEY,
  cosmology_id UUID REFERENCES cosmologies(id),  -- which fictional world
  author_id UUID REFERENCES users(id),
  content_type TEXT,        -- e.g., 'location', 'event', 'lore'
  data JSONB NOT NULL,      -- the actual content (includes pscale_range)
  -- Overall pscale aperture for search/filtering
  pscale_aperture INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skills: all skill definitions
CREATE TABLE skills (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  package_id UUID REFERENCES packages(id),
  level TEXT CHECK (level IN ('platform', 'frame', 'user')),
  category TEXT CHECK (category IN ('gathering', 'aperture', 'weighting', 'format', 'routing', 'constraint', 'guard', 'parsing', 'display')),
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

-- Frames: Designer constructs that define cosmology + pscale aperture + skills + XYZ
CREATE TABLE frames (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cosmology_id UUID REFERENCES cosmologies(id),  -- which fictional world
  pscale_floor INTEGER DEFAULT -3,               -- how deep (cognitive/action level)
  pscale_ceiling INTEGER DEFAULT 10,             -- how broad (planetary default)
  -- XYZ Configuration
  x_persistence BOOLEAN DEFAULT TRUE,   -- false = ephemeral (nothing saved after session)
  y_temporality BOOLEAN DEFAULT TRUE,   -- false = bleeding edge only (no accessible past/future)
  z_mutability BOOLEAN DEFAULT FALSE,   -- true = players/authors can mutate world state
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

**Note on pscale:**
- `pscale_aperture` on shelf/content is overall scale for search/filtering
- Detailed multi-dimensional pscale lives in `lamina` (shelf) or `data` (content)
- Frame `pscale_floor`/`pscale_ceiling` define the operational window

**Note on scoping:** Content is accessible within a frame based on:
1. Same `cosmology_id` as frame
2. `pscale_aperture` within frame's floor/ceiling range
3. Y dimension: if Y0, only current scene accessible

---

## Plex 1 Interface (Minimal UI)

```
┌────────────────────────────────────────────────┐
│  [Player ▼]  Frame: URB-Alpha  [X1Y1Z0]        │  ← face, frame, XYZ config
├────────────────────────────────────────────────┤
│                                                │
│  [Synthesis area - LLM output appears here]    │  ← Solid (committed)
│                                                │
├────────────────────────────────────────────────┤
│  Marcus: "reaches for the door..."             │  ← Liquid (submitted)
│  Sarah: ● typing...                            │  ← Vapor (presence)
├────────────────────────────────────────────────┤
│  [Your text input]                    [Submit] │
│                                       [Commit] │
└────────────────────────────────────────────────┘
```

**Interface states:**

- **Vapor**: Others see "● typing..." when you're writing, plus Soft-LLM responses
- **Liquid**: Others see your submitted intention (can still revise)
- **Solid**: Committed text triggers generation, becomes record (if X1)

**That's the entire interface.**

- Face selector: player/author/designer
- Frame indicator: which frame + XYZ configuration
- Synthesis: Medium-LLM output (solid)
- Peer area: others' liquid + vapor states
- Input: your text + typography syntax
- Query [?]: triggers Soft-LLM refinement (Phase 0.4.5+)
- Submit: saves to shelf as submitted (liquid)
- Commit: triggers compilation → LLM → synthesis (solid)

---

## Implementation Order: Plex 0.x Phases

Plex 0.x phases are the **bootstrap sequence** — David + Claude building the kernel before others can enter. Each phase must be **complete and testable** before proceeding.

**Critical Design Constraint:** Multi-user is foundational, not an add-on. Text states (vapor/liquid/solid) exist to show OTHER PEOPLE's states. All phases must be designed with multi-user in mind, even when tested single-user.

### Phase 0.1: Core Loop ✅ COMPLETE

Single user, X0Y0Z0 configuration.

**What it delivers:**
- Text input → shelf (in-memory)
- Hard-coded prompt compilation
- Claude API call
- Response displayed

**Test criterion:** User enters text, system responds. Nothing persists after refresh.

---

### Phase 0.2: Skill Loading ✅ COMPLETE

Skills loaded from database, face-aware.

**What it delivers:**
- `packages` table with platform package (onen)
- `skills` table with format skills per face
- `frame_packages` table for composition
- `generate-v2` edge function loads skills by face + frame
- Platform guard skills enforced

**Test criterion:** Switching faces loads different format skills. (Requires 0.3 to verify.)

---

### Phase 0.3: Frame Selection ✅ COMPLETE

UI to select frame, verify skill overrides work.

**What it delivers:**
- Frame selector dropdown in UI
- Test frame with custom package attached
- Visual confirmation of which skills loaded

**Test criterion:** Select test-frame → response includes "[TEST FRAME ACTIVE]" marker. Select no-frame → default response.

---

### Phase 0.4: Text States (Visual) ✅ COMPLETE

Make vapor/liquid/solid visible in single-user mode.

**What it delivers:**
- Vapor area (typing indicators, Soft-LLM responses)
- Liquid area (submitted intentions, editable)
- Solid area (committed results)
- State badges visible in UI (submitted/editing/committed)
- Visibility panel with state toggles

**Test criterion:** User sees their own text transition through states. Prepares for multi-user visibility.

---

### Phase 0.4.5: Soft-LLM Query Flow ✅ COMPLETE

Private refinement before public intention.

**What it delivers:**
- `[?]` Query button triggers Soft-LLM
- Soft-LLM response appears in vapor with [Use]/[Edit] buttons
- Typography parsing: `{braces}` → direct liquid, `(parens)` → direct solid
- Face filters in visibility panel (Player/Author/Designer)
- Fixed: Cmd+Enter with empty input no longer errors

**Test criterion:** Type "open door" → tap `[?]` → vapor shows refined intention → tap [Use] → moves to liquid. Or use `{open door}` to bypass Soft-LLM.

---

### Phase 0.5: Designer Creates Skills

Designer mode stores skills to database.

**What it delivers:**
- Designer face prompts include skill-creation capability
- New skills stored in user's personal package
- Created skills load on subsequent requests
- Validation against guard rails
- Typography rules become designer-editable (parsing skills)
- Display defaults become designer-editable (display skills)

**Test criterion:** As designer, create a custom format skill. Switch to player, see custom skill in effect. This is where "the system builds itself" begins.

---

### Phase 0.6: Multi-User (WebSocket)

The social coordination layer.

**What it delivers:**
- WebSocket connection for real-time presence
- Vapor: "● typing..." visible to others in same frame
- Liquid: submitted intentions visible to others
- Solid: committed text triggers shared synthesis
- Proximity-based delivery (who sees whose output)

**Test criterion:** Two browser tabs in same frame. User A types → User B sees "● typing...". User A submits → User B sees liquid text. Both commit → shared synthesis generated.

---

### Plex 1: Kernel Complete

All faces work, skills compose, multiple users coordinate.

**Test criterion (Mos Eisley Test):** 3 players who've seen Star Wars. One is Han, one is Greedo, one is the bartender. X0Y0Z0 frame. 30 minutes. They feel synchronized imagination. They want to play again.

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
2. Text states (vapor/liquid/solid) work correctly
3. Text is compiled using loaded skills
4. LLM generates response
5. Response is stored and displayed
6. XYZ configuration controls behavior correctly
7. User can create new skills in designer mode
8. Created skills affect subsequent compilations
9. Designer can create cosmology
10. Designer can create frames with cosmology + pscale aperture + XYZ + packages
11. Player can create character within cosmology with pscale_ceiling
12. Multiple users in same frame share frame skills and see each other's states
13. **The Mos Eisley Test passes**

Everything else is package content, not kernel.

---

## The Plex Sequence

| Plex | State | Characteristics |
|------|-------|-----------------|
| **0** | Bootstrap | David + Claude, no system yet, creating conditions for system |
| **1** | Kernel | Minimal systemic system, faces distinct, others can enter |
| **2+** | Growth | Additional features, all soft-coded as skills/packages |

Plex 0 is where we are now. Plex 1 is what we're building. Everything after Plex 1 is just more skills.
