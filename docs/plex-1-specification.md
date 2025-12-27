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

This is skill-defined, not hard-coded—but the principle that pscale constrains input is a design constraint for imaginative coherence.

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
  pscale_aperture?: number;  // narrative aperture (-10 to +15)
  lamina?: Record<string, any>;  // face-specific coordinates
}

// Vapor (not stored, WebSocket only)
interface PresenceSignal {
  user_id: string;
  frame_id: string;
  status: 'typing' | 'idle' | 'away';
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
- If Z1: apply world mutations from response

**XYZ-aware storage:**
- If X0: store to ephemeral session state only
- If X1: persist to database

**NOT hard-coded (skill-defined):**
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
    pscale_aperture: number;
    lamina: Record<string, any>;
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

Note: Respects Y dimension—if Y0, only current round.
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

```markdown
# default-input-constraint

Pscale-appropriate input limits.

| Pscale | Max Words |
|--------|-----------|
| -2 | 20 |
| -1 | 50 |
| 0 | 150 |
| +1 | 500 |

Truncate with warning if exceeded.
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
  pscale_aperture INTEGER,  -- narrative aperture (-10 to +15)
  lamina JSONB,             -- face-specific coordinates
  ephemeral BOOLEAN DEFAULT FALSE,  -- true for X0 frames (cleanup on session end)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content: what Authors create (locations, events, lore)
CREATE TABLE content (
  id UUID PRIMARY KEY,
  cosmology_id UUID REFERENCES cosmologies(id),  -- which fictional world
  author_id UUID REFERENCES users(id),
  content_type TEXT,        -- e.g., 'location', 'event', 'lore'
  data JSONB NOT NULL,      -- the actual content
  pscale_aperture INTEGER,  -- where this sits (+15 universe, +10 planet, +3 city...)
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

- **Vapor**: Others see "● typing..." when you're writing
- **Liquid**: Others see your submitted intention (can still revise)
- **Solid**: Committed text triggers generation, becomes record (if X1)

**That's the entire interface.**

- Face selector: player/author/designer
- Frame indicator: which frame + XYZ configuration
- Synthesis: Medium-LLM output (solid)
- Peer area: others' liquid + vapor states
- Input: your text
- Submit: saves to shelf as submitted (liquid)
- Commit: triggers compilation → LLM → synthesis (solid)

---

## Implementation Order

### Phase 1: Core Loop (Single User) — X0Y0Z0

Start with the proof case: ephemeral, bleeding edge, fixed world.

1. Shelf table + basic input UI (in-memory for X0)
2. Platform skills (hard-coded initially)
3. Prompt compiler (simple: concatenate skills + input)
4. LLM caller (Claude API)
5. Output router (display response, don't persist)

**Test:** User can enter text, system compiles, LLM responds, response displays. Nothing persists after refresh.

### Phase 2: Text States + Multi-User

1. WebSocket presence (vapor)
2. Submit/Commit distinction (liquid/solid)
3. Two users see each other's states
4. Coordinated commit → generation

**Test:** Two users in same session see each other's vapor/liquid, coordinated commit produces synthesis.

### Phase 3: Face Switching

1. Face selector UI
2. Face-aware skill loading
3. Face-specific default skills

**Test:** Switching faces changes how prompts compile.

### Phase 4: Persistence (X1)

1. Enable X1 mode
2. Shelf entries persist to database
3. Session continuity across page loads

**Test:** Close browser, reopen, previous session available.

### Phase 5: Packages + Frames + Cosmologies

1. Cosmology table + creation
2. Package table + creation
3. Frame table + creation (with cosmology + pscale + XYZ)
4. Frame-package composition with priorities
5. Package resolution order

**Test:** Designer creates frame with XYZ config, users enter, behavior matches config.

### Phase 6: Characters + Full Multi-User

1. Character table + creation (bound to cosmology)
2. Character-user binding in frames
3. Proximity (who sees whose output)
4. Echo delivery
5. Synthesis across multiple inputs

**Test (The Mos Eisley Test):** 3 players who've seen Star Wars. One is Han, one is Greedo, one is the bartender. X0Y0Z0 frame. 30 minutes. They feel synchronized imagination. They want to play again.

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
