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

## The Five Components

```
┌──────────────────────────────────────────────────────────┐
│  1. TEXT INPUT                                           │
│     User writes → stored on shelf with coordinates       │
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
│     Response → stored with pscale coords                 │
│     Response → displayed to user                         │
└──────────────────────────────────────────────────────────┘
```

That's it. Five components. Everything else (what skills exist, what rules apply, what the world contains) is soft-coded in packages.

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
  // pscale coords added by skills after processing
  pscale?: number;
  coordinates?: Record<string, any>;
}
```

---

## Component 2: Skill Loader

**Hard-coded behavior:**
- Given a context (user + face + campaign/world/ruleset), determine which packages apply
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
  campaign_id?: string;
  world_id?: string;
  ruleset_id?: string;
}

interface SkillSet {
  platform: Skill[];      // always loaded, cannot be overridden
  ruleset: Skill[];       // resolution mechanics
  world: Skill[];         // world-specific
  campaign: Skill[];      // session tuning
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
  level: 'platform' | 'ruleset' | 'world' | 'campaign' | 'user';
  category: 'aperture' | 'weighting' | 'gathering' | 'format' | 'guard';
  content: string;        // markdown content (the actual skill)
  overrides?: string;     // skill id this replaces (if any)
  extends?: string;       // skill id this extends (if any)
}
```

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
   → Filters fragments by pscale range

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
- Store response with pscale coordinates
- Determine who receives the output
- Deliver to appropriate displays

**NOT hard-coded (skill-defined):**
- What pscale coordinates to assign
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
    pscale: number;
    coordinates: Record<string, any>;
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
- level: platform/ruleset/world/campaign/user
- category: aperture/weighting/gathering/format/guard
- content: markdown content
```

### Default Skills (can be overridden)

```markdown
# default-aperture-standard

Pscale aperture for standard gameplay.

Include context from:
- pscale -2 to +2 for player face
- pscale +1 to +5 for author face
- pscale -5 to -3 for designer face
```

```markdown
# default-gathering-shelf

Gather recent shelf entries.

Query: Last 10 committed entries from users in proximity.
Return: Array of {user_id, text, timestamp, pscale}
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

---

## Data Model (Supabase)

### Tables

```sql
-- Shelf: where all text lives
CREATE TABLE shelf (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  text TEXT NOT NULL,
  face TEXT CHECK (face IN ('player', 'author', 'designer')),
  state TEXT CHECK (state IN ('draft', 'submitted', 'committed')),
  pscale INTEGER,
  coordinates JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skills: all skill definitions
CREATE TABLE skills (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  package TEXT NOT NULL,
  level TEXT CHECK (level IN ('platform', 'ruleset', 'world', 'campaign', 'user')),
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
  level TEXT CHECK (level IN ('platform', 'ruleset', 'world', 'campaign', 'user')),
  signature TEXT,  -- e.g., 'onen-official', 'david', 'urb-official'
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Package composition: which packages a campaign uses
CREATE TABLE campaign_packages (
  campaign_id UUID REFERENCES campaigns(id),
  package_id UUID REFERENCES packages(id),
  priority INTEGER,  -- resolution order
  PRIMARY KEY (campaign_id, package_id)
);

-- Campaigns: the context users enter
CREATE TABLE campaigns (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  world_id UUID,
  ruleset_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users: minimal user record
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Plex 1 Interface (Minimal UI)

```
┌────────────────────────────────────────────────┐
│  [Player ▼]  Campaign: URB-Alpha               │  ← face selector, context
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
- Context indicator: which campaign/world
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

### Phase 4: Packages

1. Package table + creation
2. Campaign-package composition
3. Package resolution order

**Test:** Multiple users in same campaign share campaign skills.

### Phase 5: Multi-User

1. Proximity (who sees whose output)
2. Echo delivery
3. Synthesis across multiple inputs

**Test:** Two users in same proximity, each sees other's committed text.

---

## What Plex 1 Does NOT Include

- Character sheets
- World maps
- Chat history display
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
7. Multiple users in same campaign share campaign skills

Everything else is package content, not kernel.

---

## The Plex Sequence

| Plex | State | Characteristics |
|------|-------|------------------|
| **0** | Bootstrap | David + Claude, no system yet, creating conditions for system |
| **1** | Kernel | Minimal systemic system, faces distinct, others can enter |
| **2+** | Growth | Additional features, all soft-coded as skills/packages |

Plex 0 is where we are now. Plex 1 is what we're building. Everything after Plex 1 is just more skills.