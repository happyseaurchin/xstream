# Phase 0.9: Registration, Character Creation & UI Redesign

**Status**: 📋 SPECIFICATION  
**Date**: January 2026  
**Depends on**: 0.8.1 infrastructure (Hard-LLM, coordinates, proximity)

---

## Overview

Phase 0.9 establishes the user and character foundations that unblock 0.8.1 testing. It introduces:

- **0.9.0**: UI redesign with correct terminology and zone model
- **0.9.1**: User registration with email verification
- **0.9.2**: LLM-mediated character creation (no forms)
- **0.9.3**: Character selection and inhabitation

Phases 0.9.4 (purpose trees) and 0.9.5 (condensed reflexive triad) are deferred but the architecture ensures seamless transition.

---

## Core Principles

### No Fixed Forms

Character creation is LLM-mediated, not form-based. The player-author expresses intent in the vapour zone, and the system structures the generation contextually. This pattern extends to all content creation.

### Automatic Coordinate Assignment

When a character is created within a frame context, coordinates are assigned automatically to fit that frame. "Creation" includes "location" — they are not separate steps.

### Three Worlds Per User

On registration, users gain access to:

| World | Type | Purpose |
|-------|------|---------|
| **Sandbox** | Private cosmology | Blank canvas for experimentation |
| **Real World** | Shared cosmology | User located in physical world, LLM-grounded content |
| **Fantasy** | Shared cosmology (e.g., URB) | Authored worlds to participate in |

---

## Sub-Phase Breakdown

| Phase | Deliverable | Test Criterion |
|-------|-------------|----------------|
| **0.9.0** | UI redesign | Zones resize, terminology consistent |
| **0.9.1** | User registration | User registers, logs in, persists |
| **0.9.2** | Character creation | "Create a character..." → character exists |
| **0.9.3** | Character selection | Tap character → inhabit → in frame |

After 0.9.3: Run 0.8.1 Convergence Test.

---

## 0.9.0: UI Redesign

### Reference

Full specification in `ui-redesign-spec.md` (project knowledge).

### Key Changes

**Zone Layout**:
```
┌─────────────────────────────────────────┐
│              SOLID ZONE                 │
│  [Others' solid scrolls above]          │
│  [User's latest solid anchored]         │
├═════════════════════════════════════════┤ ← Draggable
│              LIQUID ZONE                │
│  [Others' liquid scrolls above]         │
│  [User's liquid entry anchored]         │
├═════════════════════════════════════════┤ ← Draggable
│              VAPOUR ZONE                │
│  [Others' vapour + Soft-LLM above]      │
│  [User's input area anchored]           │
└─────────────────────────────────────────┘
```

**Terminology Rename**: `player` → `character` throughout application

| Old | New |
|-----|-----|
| Player face | Character face |
| player-player | character-character |
| PlayerPanel | CharacterPanel |

**Face Icons**:
- 🎭 Character (was Player)
- 📖 Author
- ⚙️ Designer

**Demure Styling**:
- Reduced visual noise
- Icons over text labels
- Consistent spacing
- State via colour (green = committed, amber = submitted)

### Implementation

1. Add `DraggableSeparator` component
2. Restructure App layout for resizable zones
3. Rename all `player` references to `character`
4. Update face icons and styling
5. Move input area into vapour zone (visible textarea)
6. Implement anchored content model

### Files Changed

| File | Changes |
|------|---------|
| `src/App.tsx` | Zone layout, separator state |
| `src/components/VaporPanel.tsx` | Input area embedded, reordered content |
| `src/components/LiquidPanel.tsx` | Anchored user entry, icons, truncation |
| `src/components/SolidPanel.tsx` | Anchored latest, similar updates |
| `src/components/DraggableSeparator.tsx` | New component |
| `src/components/FaceIcon.tsx` | New component |
| All files | `player` → `character` rename |

---

## 0.9.1: User Registration

### Flow

3-step email verification (ported from onen-play):

```
Step 1: Email
├── User enters name + email
├── Calls send-verification-code edge function
├── 6-digit code sent to email
└── Advances to Step 2

Step 2: Code
├── User enters 6-digit code
├── Calls verify-code edge function
├── Validates code (5-minute expiry)
└── Advances to Step 3

Step 3: Password
├── User creates password (8+ chars, upper/lower/number)
├── Calls create-verified-account edge function
├── Account created with email pre-verified
├── Auto-login
└── Redirect to app
```

### Edge Functions to Create

**send-verification-code**:
- Input: `{ email, name }`
- Generates 6-digit code
- Stores in `verification_codes` table (5-min expiry)
- Sends email via Resend/SendGrid
- Output: `{ success: true }`

**verify-code**:
- Input: `{ email, code }`
- Checks `verification_codes` table
- Output: `{ valid: true }` or `{ valid: false, error: "..." }`

**create-verified-account**:
- Input: `{ email, password, name, code }`
- Re-validates code (security)
- Creates user via Supabase Auth Admin API
- Sets `email_confirmed_at` immediately
- Creates user profile in `users` table
- Creates sandbox cosmology for user
- Output: `{ success: true, user_id: "..." }`

### Database Schema

```sql
-- Verification codes (temporary, auto-cleanup)
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_verification_email ON verification_codes(email, code);

-- Users table (extends auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  default_face TEXT DEFAULT 'character',
  sandbox_cosmology_id UUID REFERENCES cosmologies(id),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_read_own ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update_own ON users FOR UPDATE USING (auth.uid() = id);
```

### Frontend Components

| Component | Purpose |
|-----------|---------|
| `Auth.tsx` | Auth page with login/register tabs |
| `RegisterForm.tsx` | 3-step registration flow |
| `LoginForm.tsx` | Email + password login |
| `AuthProvider.tsx` | Session management context |

### On Registration Creates

1. **User account** (Supabase Auth)
2. **User profile** (`users` table)
3. **Sandbox cosmology** (private canvas)
4. **Sandbox frame** (default frame in sandbox)

---

## 0.9.2: Character Creation (LLM-Mediated)

### Philosophy

No character creation forms. The player-author expresses intent in natural language, and the system generates the character contextually.

### Flow

```
User (character-author) in frame
        │
        ▼
Types: "I want to create a character named Marcus, 
        a travelling merchant with a mysterious past"
        │
        ▼
Soft-LLM recognizes character-creation intent
        │
        ▼
Triggers character-generation skill
        │
        ▼
Medium-LLM generates character within:
├── World context (cosmology)
├── Frame context (location, time)
├── Available content (lore, factions)
└── User preferences
        │
        ▼
Character created in database:
├── name: "Marcus"
├── description: [generated]
├── appearance: [generated]
├── cosmology_id: [current frame's cosmology]
├── created_by: [user_id]
├── inhabited_by: NULL (not yet inhabited)
        │
        ▼
Coordinates auto-assigned:
├── spatial: [fits frame's default location]
├── temporal: [current frame time]
        │
        ▼
Soft-LLM responds: "Marcus has been created. 
He stands in the common room, travel-worn..."
```

### Character-Generation Skill

```markdown
# skill: character-generation
package: onen
category: soft
face: character

## Purpose
Generate a character from natural language intent, fitting the current frame context.

## Triggers
- User mentions "create a character", "make a character", "I want to play as..."
- User describes a character concept without existing character

## Input
- User intent (natural language)
- Frame context (cosmology, location, time)
- World content (available lore, factions, races)

## Process
1. Extract character concept from user intent
2. Generate name if not provided
3. Generate description fitting world context
4. Generate appearance
5. Determine appropriate starting coordinates
6. Create character record
7. Create coordinate record
8. Return confirmation with character summary

## Output
- Confirmation message
- Character visible in user's character directory
- Character placed at coordinates in frame

## Constraints
- Character must fit cosmology (no sci-fi in fantasy world)
- Name must be unique within cosmology
- Starting coordinates must be valid for frame
```

### Database Operations

On character creation:

```sql
-- 1. Insert character
INSERT INTO characters (name, description, appearance, cosmology_id, created_by)
VALUES ($name, $description, $appearance, $cosmology_id, $user_id)
RETURNING id;

-- 2. Insert coordinates
INSERT INTO character_coordinates (character_id, frame_id, spatial, temporal)
VALUES ($character_id, $frame_id, $default_spatial, $default_temporal);

-- 3. Insert initial proximity (empty until others present)
INSERT INTO character_proximity (character_id, frame_id, close, nearby, distant)
VALUES ($character_id, $frame_id, '{}', '{}', '{}');
```

### Future Extensions (Not 0.9.2)

- **Invitation flow A**: Player-author creates character with permission in another's frame
- **Invitation flow B**: Player negotiates with authors/author-llm for character generation
- **Character templates**: World-specific archetypes as starting points

---

## 0.9.3: Character Selection & Inhabitation

### Character Directory

Located in **character-face solid zone** (was player-face).

Displays:
- List of user's characters
- Each entry shows: name, cosmology, current location
- Tap to expand: history, stats, story summary

```
┌─────────────────────────────────────────┐
│ MY CHARACTERS                           │
├─────────────────────────────────────────┤
│ 🎭 Marcus                               │
│    Merchant • Rusty Anchor Inn          │
│    ▸ Last active: 2 hours ago           │
├─────────────────────────────────────────┤
│ 🎭 Elara                                │
│    Scholar • University Library         │
│    ▸ Last active: 3 days ago            │
├─────────────────────────────────────────┤
│ + Create new character                  │
└─────────────────────────────────────────┘
```

### Inhabitation Flow

```
User taps character in directory
        │
        ▼
Character details panel opens
├── Name, description, appearance
├── Current location (frame + coordinates)
├── History summary
├── Stats (if applicable)
└── [Inhabit] button
        │
        ▼
User taps [Inhabit]
        │
        ▼
System updates:
├── characters.inhabited_by = user_id
├── Load frame where character is located
└── Set user's active character context
        │
        ▼
User enters frame as that character
├── Vapour zone ready for input
├── Operational frame loaded (0.8.1)
├── CLOSE/NEARBY characters visible
```

### Uninhabit Flow

User can release a character:
- Tap inhabited character
- [Release] button
- `inhabited_by` set to NULL
- Character becomes NPC (or dormant)

### Database Operations

```sql
-- Inhabit
UPDATE characters 
SET inhabited_by = $user_id, updated_at = now()
WHERE id = $character_id AND created_by = $user_id;

-- Release
UPDATE characters 
SET inhabited_by = NULL, updated_at = now()
WHERE id = $character_id AND inhabited_by = $user_id;
```

### RLS Policy Update

```sql
-- Users can only inhabit their own characters
CREATE POLICY characters_inhabit ON characters
  FOR UPDATE USING (auth.uid() = created_by)
  WITH CHECK (inhabited_by IS NULL OR inhabited_by = auth.uid());
```

---

## 0.9.4 & 0.9.5: Future Continuity

These phases are deferred but the architecture ensures seamless transition.

### Database Schema Prepared

```sql
-- 0.9.4: Purpose vectors (add when implementing)
CREATE TABLE purpose_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  pscale INTEGER NOT NULL,
  vector TEXT NOT NULL,
  determinancy FLOAT DEFAULT 0.5,
  context_modifiers JSONB,
  source_type TEXT DEFAULT 'core',
  source_character_id UUID REFERENCES characters(id),
  decay_rate FLOAT DEFAULT 0,
  last_activated TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 0.9.5: Q-moment and power stance (add columns when implementing)
ALTER TABLE characters ADD COLUMN q_dominant INTEGER CHECK (q_dominant BETWEEN 1 AND 4);
ALTER TABLE characters ADD COLUMN q_pressure_shift INTEGER CHECK (q_pressure_shift BETWEEN 1 AND 4);
ALTER TABLE characters ADD COLUMN power_self INTEGER DEFAULT 0 CHECK (power_self BETWEEN -1 AND 1);
ALTER TABLE characters ADD COLUMN power_other INTEGER DEFAULT 0 CHECK (power_other BETWEEN -1 AND 1);
```

### Character Table Structure (0.9.3)

```sql
-- Current characters table supports future extension
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cosmology_id UUID REFERENCES cosmologies(id),
  created_by UUID REFERENCES users(id),
  inhabited_by UUID REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  appearance TEXT,
  is_npc BOOLEAN DEFAULT false,
  -- Future columns (0.9.4/0.9.5):
  -- q_dominant, q_pressure_shift, power_self, power_other
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Transition Path

| From | To | What Changes |
|------|-----|--------------|
| 0.9.3 | 0.9.4 | Add purpose_vectors table, update character-generation skill to create three anchors |
| 0.9.4 | 0.9.5 | Add Q-moment columns, create character-llm edge function with condensed aperture |

No blocking changes in 0.9.0-0.9.3.

---

## Integration with 0.8.1

### What 0.9 Provides

| 0.8.1 Requirement | 0.9 Solution |
|-------------------|--------------|
| User registration | 0.9.1 |
| Character creation | 0.9.2 |
| `inhabited_by` connection | 0.9.3 |
| Persistent test environment | Registered users + created characters persist |

### Unblock Test

After 0.9.3 complete:

1. User A registers, creates character Marcus in test-frame
2. User A inhabits Marcus (coordinates assigned)
3. User B registers, creates character Elara in test-frame
4. User B inhabits Elara (coordinates assigned)
5. Both in same frame with coordinates
6. User A commits: "I walk over to Elara"
7. Medium-LLM synthesizes
8. Hard-LLM triggers (per 0.8.1 integration)
9. Marcus coordinates updated → now CLOSE to Elara
10. **0.8.1 Convergence Test passes**

---

## Implementation Order

### 0.9.0: UI Redesign (1-2 days)

1. Create `DraggableSeparator` component
2. Restructure zone layout in App
3. Rename `player` → `character` globally
4. Update face icons
5. Implement demure styling
6. Move input into vapour zone
7. Test: Zones resize, terminology consistent

### 0.9.1: Registration (1-2 days)

1. Create `verification_codes` table migration
2. Create `users` table migration
3. Deploy `send-verification-code` edge function
4. Deploy `verify-code` edge function
5. Deploy `create-verified-account` edge function
6. Create `RegisterForm` component (3-step)
7. Create `LoginForm` component
8. Create `AuthProvider` context
9. Add auth routing (protected routes)
10. Test: Full registration flow

### 0.9.2: Character Creation (1-2 days)

1. Create `character-generation` skill in database
2. Add character creation intent detection to Soft-LLM
3. Implement character creation flow in synthesis
4. Auto-assign coordinates on creation
5. Test: "Create a character..." → character exists

### 0.9.3: Character Selection (1 day)

1. Create character directory UI in solid zone
2. Implement character detail panel
3. Add inhabit/release functionality
4. Connect to frame loading
5. Test: Tap character → inhabit → in frame
6. **Run 0.8.1 Convergence Test**

---

## Success Criteria

| Phase | Test | Pass |
|-------|------|------|
| 0.9.0 | Drag separator | Zones resize and persist |
| 0.9.0 | Terminology | No "player" references remain |
| 0.9.1 | Registration | User creates account, verifies email, logs in |
| 0.9.1 | Persistence | Refresh keeps user logged in |
| 0.9.2 | Character creation | Natural language → character in database |
| 0.9.2 | Auto-coordinates | Character has valid coordinates |
| 0.9.3 | Directory | User sees their characters |
| 0.9.3 | Inhabit | Tap → inhabit → enters frame |
| **Final** | 0.8.1 Convergence | Two users, two characters, proximity works |

---

## Files to Create/Modify

### New Files

| Path | Purpose |
|------|---------|
| `src/components/DraggableSeparator.tsx` | Zone resize |
| `src/components/FaceIcon.tsx` | Face indicators |
| `src/components/auth/RegisterForm.tsx` | 3-step registration |
| `src/components/auth/LoginForm.tsx` | Login form |
| `src/components/auth/AuthProvider.tsx` | Session context |
| `src/components/CharacterDirectory.tsx` | Character list |
| `src/components/CharacterDetail.tsx` | Character panel |
| `supabase/functions/send-verification-code/index.ts` | Email code |
| `supabase/functions/verify-code/index.ts` | Validate code |
| `supabase/functions/create-verified-account/index.ts` | Create user |

### Modified Files

| Path | Changes |
|------|---------|
| `src/App.tsx` | Zone layout, auth routing |
| `src/components/VaporPanel.tsx` | Embedded input |
| `src/components/LiquidPanel.tsx` | Anchored model |
| `src/components/SolidPanel.tsx` | Character directory integration |
| All components | `player` → `character` |

### Database Migrations

| Migration | Tables |
|-----------|--------|
| `0.9.1_verification_codes` | verification_codes |
| `0.9.1_users` | users (extends auth.users) |
| `0.9.2_character_generation_skill` | skills (insert) |

---

## Related Documents

- `ui-redesign-spec.md` — Full UI specification
- `phase-0.8.1-stub.md` — What's unblocked by 0.9
- `phase-0.9-architecture.md` (project knowledge) — Original planning document
- `character-generation-system-architecture.md` — Future character depth

---

## Notes

### Terminology Change Rationale

"Player" implies game-external identity. "Character" is what the user embodies in-world. The user has a character-face, not a player-face. This aligns with the three-face model:

- **Character face**: Embody intentions within narrative
- **Author face**: Create world content
- **Designer face**: Define rules and skills

### LLM-Mediated Creation Rationale

Forms are static. The system should understand intent and generate appropriately. This:
- Fits the xstream philosophy (LLM as medium)
- Allows contextual generation (world-appropriate)
- Enables future sophistication (author negotiation, templates)
- Feels more natural than filling boxes

### Sandbox Cosmology Purpose

Every user gets a blank canvas. This is where they can:
- Experiment without affecting shared worlds
- Create private content
- Test before publishing to shared cosmologies
- Always have somewhere to create
