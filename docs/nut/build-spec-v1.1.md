# NUT Build Specification v1.1

**Branch:** `fresh-build` (GitHub) + `fresh-build-db` (Supabase)
**Date:** 2026-02-13
**Status:** AGREED — ready for implementation

---

## Changelog from v1.0
- Added Section 4.4: Aperture as Skill (face-based perception/action)
- Added `verification_codes` to schema (email verification before registration)
- Updated S-coordinate convention: +N = real world, -N = fantasy worlds
- Added docs → skills pipeline (Section 9)
- Expanded Step 0 to include AuthPage verification flow wiring
- Added skill authoring guidelines aligned with Anthropic's skill format

---

## 1. What We're Building

NUT is the registered-user path through xstream. A user signs in via email-verified registration, gets a UI (the viewport), and interacts with the system through pscale-addressed content mediated by LLMs.

The UI is traditional React code — a screen, not the system. The system is pscale-addressed content flowing through three text states (vapor → liquid → solid) via three LLM tiers (soft → medium → hard). What each user can see and do is determined by the **aperture skill** reading their coordinate position, not by hard-coded database constraints.

### What Exists on `fresh-build`

- **Clean UI** — 192-line App.tsx, separated components (SolidZone, LiquidZone, VapourZone, ConstructionButton, AuthPage), theme system, auth hook
- **Supabase client** — configured in `src/lib/supabase.ts`
- **Docs** — 21 documents including pscale-spine, architecture references, transition notes
- **TODO stubs** — App.tsx has placeholder functions for soft-LLM query, liquid submission, solid commitment

### What Exists on Main (reusable)

- **Email verification edge functions** — `send-verification-code`, `verify-code`, `create-verified-account` (deployed at project level, work against any branch DB)
- **Resend integration** — emails sent from `noreply@onen.ai`

### What We Build

- **Lean pscale-native schema** (4 core tables + 3 supporting)
- **Three edge functions** (soft-nut, medium-nut, hard-nut)
- **Multi-step registration UI** — wire AuthPage to verification flow
- **UI wiring** — replace TODO stubs with real Supabase subscriptions and edge function calls
- **Initial skills** — aperture, gathering, format, onboarding (as markdown docs that ARE skills)
- **Phase 3 conversational flow** — user tells LLM about themselves, gets pscale coordinates

### What We Don't Touch

- `bot_*` and `machus_*` tables (11 tables, zero cross-references, verified isolated)
- `machus-agent` edge function (v20, operates independently)
- Main branch production deployment
- Existing verification edge functions (already deployed, just wire UI to them)

---

## 2. Design Principles

**P1: Pscale addresses everything.** Content, skills, coordinates, and metadata are all located by T/S/I position. No categorical columns. The LLM determines classification from coordinate position.

**P2: The UI is a viewport.** React components subscribe to content by state and frame. They don't know about pscale. The LLM stack handles all intelligence.

**P3: Minimal tables, maximum JSONB.** Four core tables. Flexible `lamina` JSONB carries metadata. LLM reads and writes lamina.

**P4: Unattached items have a home.** Pre-coordinate content (memory, reflexive summaries, change-logs, purpose-tree nodes) lives in `nut_unattached` until promoted.

**P5: Skills are content at coordinates.** Markdown documents at S-coordinates. Loaded by proximity. Docs → skills pipeline: design documents transpose directly into operational skills.

**P6: Aperture is a skill, not schema.** What each face can see/do is defined by the aperture skill (S:0.11), not by check constraints or RLS policies. The designer face can modify the aperture skill itself.

**P7: Conformality with SEED.** Same passport format, observation structure, and compaction mechanics. NUT provides a viewport; SEED instances generate their own.

**P8: +N real, -N imagined.** In S-coordinates, positive prefixes = reflection (real world). Negative prefixes = refraction (fantasy). The mechanics are identical; the sign is convention.

---

## 3. Lean Schema

### 3.1 `nut_shelf` — Where all addressed content lives

```sql
CREATE TABLE nut_shelf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pscale coordinates (semantic numbers as text)
  t TEXT NOT NULL,
  s TEXT NOT NULL,
  i TEXT NOT NULL,
  
  -- Content
  text TEXT NOT NULL,
  lamina JSONB DEFAULT '{}',
  
  -- Efficient query fields (derived, maintained by system)
  state TEXT NOT NULL DEFAULT 'vapor',  -- 'vapor', 'liquid', 'solid'
  frame_id UUID,
  cosmology_id UUID,
  
  -- Ownership
  created_by UUID,
  character_id UUID,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shelf_state_frame ON nut_shelf(state, frame_id);
CREATE INDEX idx_shelf_created_by ON nut_shelf(created_by);
CREATE INDEX idx_shelf_cosmology ON nut_shelf(cosmology_id);
CREATE INDEX idx_shelf_t ON nut_shelf(t);
CREATE INDEX idx_shelf_s ON nut_shelf(s);
CREATE INDEX idx_shelf_i ON nut_shelf(i);

ALTER PUBLICATION supabase_realtime ADD TABLE nut_shelf;
```

**How the UI reads it:**
- SolidZone: `state = 'solid' AND frame_id = current_frame`
- LiquidZone: `state = 'liquid' AND frame_id = current_frame`
- VapourZone: `state = 'vapor' AND created_by = current_user`

**How the LLMs read it:**
- Soft-LLM: nearby content by S-coordinate proximity
- Medium-LLM: all liquid in frame for synthesis
- Hard-LLM: across frames for coherence

**What goes in `lamina`:**
```json
{
  "face": "character",
  "soft_type": "action",
  "provenance": ["uuid1", "uuid2"],
  "skill_refs": ["0.11", "0.12"],
  "confidence": 0.8
}
```

### 3.2 `nut_coordinates` — Entity pscale positions

```sql
CREATE TABLE nut_coordinates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,    -- 'user', 'character', 'npc'
  entity_id UUID NOT NULL,
  entity_name TEXT,
  
  t TEXT NOT NULL DEFAULT '0',
  s TEXT NOT NULL DEFAULT '0',
  i TEXT NOT NULL DEFAULT '0',
  
  proximity JSONB DEFAULT '{}',
  cosmology_id UUID,
  frame_id UUID,
  lamina JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(entity_id, cosmology_id)
);

CREATE INDEX idx_coords_entity ON nut_coordinates(entity_id);
CREATE INDEX idx_coords_frame ON nut_coordinates(frame_id);
ALTER PUBLICATION supabase_realtime ADD TABLE nut_coordinates;
```

### 3.3 `nut_unattached` — Pre-coordinate content

```sql
CREATE TABLE nut_unattached (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,           -- 'memory', 'reflexive', 'changelog', 'purpose', 'draft_skill'
  text TEXT NOT NULL,
  lamina JSONB DEFAULT '{}',
  about UUID,
  created_by TEXT,
  pscale INTEGER DEFAULT 0,
  source TEXT,
  promoted_to UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_unattached_about ON nut_unattached(about);
CREATE INDEX idx_unattached_kind ON nut_unattached(kind);
CREATE INDEX idx_unattached_pscale ON nut_unattached(pscale);
```

### 3.4 `nut_skills` — Skill documents at S-coordinates

```sql
CREATE TABLE nut_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  s_coordinate TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,        -- markdown (SKILL.md format body)
  level TEXT NOT NULL DEFAULT 'platform',
  cosmology_id UUID,
  frame_id UUID,
  lamina JSONB DEFAULT '{}',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_skills_s ON nut_skills(s_coordinate);
CREATE INDEX idx_skills_level ON nut_skills(level);
```

### 3.5 Supporting Tables

```sql
-- Cosmologies (worlds)
CREATE TABLE nut_cosmologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  s_prefix TEXT,               -- '+1' for real world, '-1' for URB
  lamina JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Frames (sessions within cosmologies)
CREATE TABLE nut_frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cosmology_id UUID REFERENCES nut_cosmologies(id),
  name TEXT NOT NULL,
  config JSONB DEFAULT '{}',   -- XYZ config, pscale floor/ceiling
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification codes (email verification before registration)
CREATE TABLE nut_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Aperture: Perception and Action as Skill

### 4.1 The Two Layers

**Layer 1: Database RLS (hard guard)**
Prevents unauthorized access. Simple rules: authenticated users read shelf content in their frame, insert their own content. Edge functions use service role key (bypasses RLS). This is security, not narrative.

```sql
ALTER TABLE nut_shelf ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_shelf" ON nut_shelf FOR SELECT USING (true);
CREATE POLICY "insert_own" ON nut_shelf FOR INSERT WITH CHECK (auth.uid() = created_by);

ALTER TABLE nut_coordinates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_coords" ON nut_coordinates FOR SELECT USING (true);

ALTER TABLE nut_unattached ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_own_unattached" ON nut_unattached FOR SELECT
  USING (auth.uid()::text = about::text OR about IS NULL);

ALTER TABLE nut_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_skills" ON nut_skills FOR SELECT USING (auth.role() = 'authenticated');
```

**Layer 2: Aperture Skill (soft guard)**
Defines what each face can perceive and do. This is the aperture skill at S:0.11, loaded by the soft-LLM on every interaction.

### 4.2 The Aperture Skill Content

This skill will be stored in `nut_skills` at `s_coordinate = '0.11'`:

```markdown
# Aperture: Perception and Action

## Face: Character (I-coordinate at pscale 0)
### Perceives:
- Solid content within proximity radius (as computed by hard-nut)
- Liquid content from characters in same frame
- Own vapor only
### Actions:
- Submit character intentions (vapor → liquid)
- React to narrative events
- Cannot see or modify world-building content or skills

## Face: Author (I-coordinate at pscale +1 to +3)
### Perceives:
- All content in the cosmology at their temporal scope
- Character actions as liquid/solid (but not vapor)
- World content across frames
### Actions:
- Create/edit world content
- Set scene context and frame parameters
- Cannot modify skills or platform rules

## Face: Designer (I-coordinate at negative pscale)
### Perceives:
- Skills, compilation rules, system configuration
- All content across all frames (meta-view)
- Aperture definitions (including this one)
### Actions:
- Create/modify skills at any S-coordinate
- Adjust frame configuration
- Modify aperture rules (self-referential editing)
- Cannot submit character actions or author content directly
```

### 4.3 How Aperture Is Applied

The soft-LLM reads the aperture skill on every request. Before processing user input, it:

1. Checks the user's current I-coordinate to determine face
2. Applies the perception rules: what content to include in context
3. Applies the action rules: what operations are available
4. If the user tries something outside their face's permissions, the soft-LLM explains why and suggests the appropriate face

This is entirely soft-coded. A designer can change what "character face" can see by editing the aperture skill. No code deployment needed.

---

## 5. Edge Functions

### 5.1 `soft-nut` — User-facing LLM

**Called by:** VapourZone
**Endpoint:** `POST /soft-nut`

```json
{
  "text": "user input",
  "frame_id": "uuid",
  "action": "query" | "submit" | "onboard"
}
```

**Flow:**
1. Load user's coordinates from `nut_coordinates`
2. Load skills by S-coordinate proximity from `nut_skills`
3. **Apply aperture**: filter available context by face
4. Call Claude (Haiku) with compiled prompt
5. If query: return response. If submit: write to `nut_shelf` (liquid)
6. Side effect: write observation to `nut_unattached` (kind = 'memory')

### 5.2 `medium-nut` — Synthesis LLM

**Called by:** System (on commit trigger)
**Endpoint:** `POST /medium-nut`

**Flow:**
1. Gather all liquid in frame
2. Load synthesis + format skills
3. Call Claude with liquid content + context
4. Write solid to `nut_shelf` (T-sign flips negative → positive)
5. Signal hard-nut for coordination

### 5.3 `hard-nut` — Background coordination

**Called by:** System (post-commit, timer, events)
**Endpoint:** `POST /hard-nut`

**Tasks:** proximity, coordinate_update, compact, promote

Compaction follows SEED pattern: 9 raw observations → 1 pscale-1 summary → lookback at pscale 2 → reflexive self-observation.

---

## 6. S-Coordinate Convention

| S-prefix | Domain | Phase |
|---|---|---|
| +1 | Real world (reflection) | Phase 3 |
| -1 | URB (fantasy world 1) | Phase 4 |
| -2 | Future fantasy world 2 | Phase 4+ |

Within each domain, the S-coordinate structure follows pscale-spine:
- Pscale 6: region
- Pscale 4-5: city/town
- Pscale 2-3: building/room
- Pscale 0: immediate vicinity

Positive and negative mechanics are identical. The sign is convention — it tells the LLM whether to treat coordinates as grounded reality or imagined space.

### The 0.x Meta-Layer

S-coordinates in the 0.x range are the interface between LLM self-location and system configuration:

| S-coordinate | Skill domain |
|---|---|
| 0.01 | Pscale reference (spine) |
| 0.02 | Coordinate mechanics |
| 0.10 | Core loop (vapor/liquid/solid) |
| 0.11 | Aperture (perception/action per face) |
| 0.12 | Gathering (context collection) |
| 0.13 | Weighting (priority/confidence) |
| 0.14 | Format (output structure for viewport) |
| 0.15 | Routing (content direction between LLM tiers) |
| 0.16 | Guard (safety, coherence constraints) |
| 0.17 | Parsing (user input interpretation) |
| 0.18 | Display (UI rendering guidance) |
| 0.19 | Onboarding (Phase 3 identity conversation) |

---

## 7. Registration and Onboarding

### 7.1 Email Verification (Phase 2)

Multi-step registration using existing edge functions:

1. User enters email + display name
2. `send-verification-code` → 6-digit code → email via Resend
3. User enters code → `verify-code` → verification_id returned
4. User enters password → `create-verified-account` → auth account created (pre-verified) → auto sign-in

The AuthPage on fresh-build needs updating from basic sign-in/sign-up to this multi-step flow.

### 7.2 Conversational Onboarding (Phase 3)

After first login, if no `nut_coordinates` row exists:

1. UI shows conversational interface (reuses VapourZone)
2. soft-nut receives `action: 'onboard'`
3. 3-5 conversational turns extract S/T/I identity information
4. LLM uses onboarding skill (S:0.19) + coordinate generation skill
5. Initial coordinates written to `nut_coordinates`
6. User enters normal frame selection

---

## 8. Docs → Skills Pipeline

### 8.1 The Principle

Design documents transpose directly into operational skills. We don't write docs AND skills separately — the doc IS the skill. As each doc matures, it gets seeded into `nut_skills` at its S-coordinate.

### 8.2 Doc Organization on `fresh-build`

```
docs/
├── index.md                          # Master index (updated)
├── nut/                              # NUT build docs (NEW)
│   ├── nut-build-spec.md             # This document
│   ├── aperture-skill.md             # → S:0.11
│   ├── onboarding-skill.md           # → S:0.19
│   └── compilation-guide.md          # How skills compile into prompts
├── pscale-spine.md                   # → S:0.01 (reference)
├── pscale-functions.md               # → S:0.11-0.13 (reference)
├── pscale-implementation.md          # → S:0.02 (reference)
├── unified-loop.md                   # → S:0.10 (reference)
├── data-governance.md                # → S:0.16 (reference)
├── agent-architecture.md             # → S:0.15 (reference)
├── usecases.md                       # → S:0.14 (reference)
├── [other existing docs]
└── experiments/
```

### 8.3 Skill Format (aligned with Anthropic best practices)

Each skill stored in `nut_skills` follows this structure:

```markdown
# [Skill Name]

## When to Use
[Clear trigger conditions]

## Instructions

### Step 1: [First action]
[Specific, actionable instruction]

### Step 2: [Next action]
[...]

## Examples
[Worked examples with input/output]

## Troubleshooting
[Common issues and solutions]
```

The `name` field in `nut_skills` maps to the skill title. The `s_coordinate` field maps to the 0.x address. The `content` field contains the full markdown body. The `level` field determines scope (platform/cosmology/frame/user).

### 8.4 Initial Skills to Draft

| Priority | Skill | S-coordinate | For |
|---|---|---|---|
| 1 | Aperture | 0.11 | Soft-LLM: what each face sees/does |
| 2 | Onboarding | 0.19 | Soft-LLM: Phase 3 identity conversation |
| 3 | Format | 0.14 | Soft-LLM: how to structure output for viewport |
| 4 | Gathering | 0.12 | All: how to collect relevant context |
| 5 | Core Loop | 0.10 | All: vapor → liquid → solid rules |
| 6 | Coordinate Reference | 0.01 | Hard-LLM: pscale spine (extract from existing doc) |

---

## 9. Implementation Steps

### Step 0: Environment Setup
- Reset `fresh-build-db` Supabase branch
- Apply lean schema (all tables from Sections 3 + 4)
- Update AuthPage.tsx with multi-step verification flow
- Update `CLAUDE.md` with NUT build instructions
- Update `docs/index.md` with NUT section
- Commit spec and initial docs to `docs/nut/`
- **Commit:** `[setup] Reset branch DB, apply NUT schema, wire verification auth`

### Step 1: Seed Data + Initial Skills
- Create real-world cosmology (name: 'Reflection', s_prefix: '+1')
- Create default frame (X0Y0Z0 config)
- Draft and seed aperture skill (S:0.11)
- Draft and seed onboarding skill (S:0.19)
- Draft and seed format skill (S:0.14)
- **Commit:** `[data] Seed cosmology, frame, and platform skills`

### Step 2: soft-nut Edge Function
- Implement query, submit, and onboard actions
- Load skills by S-coordinate
- Apply aperture filtering
- Write to nut_shelf and nut_unattached
- **Commit:** `[soft-nut] User-facing LLM with aperture and skills`

### Step 3: UI Wiring — Vapor/Liquid
- Replace handleQuery and handleSubmit stubs
- Add realtime subscription for nut_shelf
- Add frame selection (load default)
- **Commit:** `[ui] Wire VapourZone and LiquidZone to soft-nut`

### Step 4: medium-nut Edge Function
- Synthesis: liquid → solid with T-sign flip
- **Commit:** `[medium-nut] Synthesis LLM`

### Step 5: UI Wiring — Solid
- Replace handleCommit stub
- Add solid realtime subscription
- **Commit:** `[ui] Wire SolidZone to medium-nut`

### Step 6: hard-nut Edge Function
- Coordinate update, proximity, compaction, promotion
- **Commit:** `[hard-nut] Background coordination`

### Step 7: Phase 3 Onboarding
- Onboarding detection (no coordinates → show onboarding)
- Wire onboarding skill
- Generate and store initial user coordinates
- **Commit:** `[phase3] Conversational onboarding flow`

### Step 8: Polish
- Error handling, loading states, full pipeline test
- **Commit:** `[polish] Pipeline verification`

---

## 10. What This Doesn't Include (Future Phases)

Character-LLM, NOMAD dice, multi-column, purpose trees, determinancy clouds, economic model, reflection mode, MAGI — all build on this schema. The 0.x meta-layer (skills at S-coordinates) is where future complexity lives as soft-coded text.

---

*NUT Build Specification v1.1 — Agreed 2026-02-13*
