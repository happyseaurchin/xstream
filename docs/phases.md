# Plex 0.x Implementation Phases

**Bootstrap sequence — David + Claude building the kernel**

Each phase must be **complete and testable** before proceeding.

---

## Phase Status

| Phase | Status | Description |
|-------|--------|-------------|
| 0.1 | ✅ COMPLETE | Core Loop |
| 0.2 | ✅ COMPLETE | Skill Loading |
| 0.3 | ✅ COMPLETE | Frame Selection |
| 0.4 | ✅ COMPLETE | Text States (Visual) |
| 0.4.5 | ✅ COMPLETE | Soft-LLM Query Flow |
| 0.5 | ✅ COMPLETE | Designer Creates Skills |
| 0.6 | ✅ COMPLETE | Multi-User Presence |
| 0.6.5 | ✅ COMPLETE | Live Multi-User Text States |
| 0.7 | ✅ COMPLETE | Core Gameplay: Cross-Player Synthesis |
| 0.8 | 📋 DESIGNED | Hard-LLM & World Context |
| 0.9.0 | ✅ COMPLETE | UI Redesign |
| 0.9.1 | ✅ COMPLETE | User Registration |
| 0.9.2 | ✅ COMPLETE | LLM-Mediated Character Creation |
| 0.9.3 | ✅ COMPLETE | Character Selection & Two-Player Test |
| **0.10** | 🔄 IN PROGRESS | **Consolidation** |
| 1.0 | ⏳ PENDING | Kernel Complete |

---

## Phase 0.10: Consolidation 🔄

**Specification:** `docs/phase-0.10-specification.md`

Consolidating functions needed for three-player test.

| Sub-phase | Status | Description |
|-----------|--------|-------------|
| 0.10.1 | ✅ COMPLETE | Stale liquid detection (LLM-based) |
| 0.10.2 | ❌ TODO | Concurrent commit coordination |
| 0.10.3 | ⚠️ VERIFY | Author creates NPCs (feature exists, verify wiring) |
| 0.10.4 | ⚠️ VERIFY | Author creates locations (feature exists, verify wiring) |
| 0.10.5 | ❌ TODO | Designer edits skills |
| 0.10.6 | ❌ TODO | Three-player test |

### 0.10.1: Stale Liquid Detection ✅

**Problem:** When user A commits, their liquid is synthesized. If they don't change it and user B commits, Medium-LLM sees user A's old liquid and re-narrates it.

**Solution (LLM-based, no schema change):**
- Added "HANDLING REPETITION" section to Medium-LLM system prompt
- Distinguishes standing intentions, discrete actions, continuous actions
- Renamed "RECENT NARRATIVE" to "ALREADY NARRATED (don't repeat)"
- LLM understands context and avoids repetition naturally

**Commit:** `32ebe6a` - 0.10.1: Add stale liquid detection via LLM guidance

**Requires deployment:** `generate-v2` edge function

---

## Plex 1 Success Criteria Status

From `plex-1-specification.md`:

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | User can enter text as player/author/designer | ✅ | All faces work |
| 2 | Text states (vapor/liquid/solid) work correctly | ✅ | Full pipeline |
| 3 | Text compiled using loaded skills | ✅ | Skills load per face/frame |
| 4 | LLM generates response | ✅ | Claude API working |
| 5 | Response stored and displayed | ✅ | Solid zone shows entries |
| 6 | XYZ configuration controls behavior | ⚠️ | Only X1Y1Z0 tested |
| 7 | User can create new skills in designer mode | ✅ | Works |
| 8 | Created skills affect subsequent compilations | ✅ | Works |
| 9 | Designer can create cosmology | ❌ | Not UI-accessible yet |
| 10 | Designer can create frames | ❌ | Hard-coded only |
| 11 | Player can create character | ✅ | LLM-mediated works |
| 12 | Multiple users share frame skills + states | ✅ | **Tested 2026-01-03** |
| 13 | **Mos Eisley Test passes** | ✅ | Two players coordinated! |

**Key milestone:** On 2026-01-03, two players (Marcus & Elara) successfully coordinated narrative in real-time. The LLM synthesized both inputs coherently.

---

## Phase 0.7: Core Gameplay — Cross-Player Synthesis ✅

**COMPLETE as of 2026-01-03**

**Delivered:**
- Medium-LLM receives ALL committed liquid in frame
- Synthesizes multiple player actions into coherent narrative
- Outputs to solid (shared reality)
- Real-time presence and vapor sharing
- Two-player coordination tested successfully

**Test Result:** Two browser sessions, two characters (Marcus, Elara), both commit actions → Medium-LLM synthesizes → both see coherent combined narrative.

---

## Phase 0.8: Hard-LLM & World Context 📋

**DESIGNED but NOT IMPLEMENTED**

Full architecture in `docs/phase-0.8-architecture.md` and `docs/hard-llm-coordinate-extraction-skills.md`.

**Will deliver:**
- Hard-LLM extracts coordinates from narrative
- Proximity auto-updates based on movement
- Aperture calculation (who sees what)
- Background coherence processing
- Six database skills for coordinate operations

**Deferred because:** Two-player narrative works without automatic coordinate extraction. Coordinates can be manually seeded for testing.

---

## Phase 0.9: Management, Auth & Polish ✅

**Sub-phases complete:**

### 0.9.0: UI Redesign ✅
- Three-zone layout (solid/liquid/vapour)
- Draggable separators
- Terminology: player → character
- Zone proportions persist in localStorage

### 0.9.1: User Registration ✅
- Email verification (6-digit code)
- Supabase Auth integration
- User profiles with display names
- Protected routes

### 0.9.2: LLM-Mediated Character Creation ✅
- Natural language: "Create a character named Marcus..."
- Soft-LLM detects intent, generates character
- Coordinates auto-assigned to frame
- No forms needed

### 0.9.3: Character Selection ✅
- Character selector in header (when in frame)
- Inhabit/release flow
- Two-player coordination tested
- **Mos Eisley Test baseline passed**

---

## Remaining for Plex 1.0

### Must Have (Phase 0.10)
1. ✅ **Stale liquid detection** — LLM-based guidance prevents re-narration
2. ❌ **Concurrent commit coordination** — Handle simultaneous commits gracefully
3. ⚠️ **Verify NPC/location creation** — Features exist, ensure proper wiring
4. ❌ **Designer edits skills** — Load/modify/save existing skills
5. ❌ **Three-player test** — Full Mos Eisley Test

### Deferred to Plex 1.1+
- Cosmology creation UI
- Frame creation UI  
- XYZ configuration UI
- Hard-LLM coordinate extraction

### Rationale
The Mos Eisley Test asks: "Can 3 players spend 30 minutes in synchronized imagination?" We've proven 2 players can coordinate narrative. Phase 0.10 consolidates for 3-player test.

---

## Plex 1.0: Kernel Complete ⏳

**Target:** All Plex 1 success criteria pass.

**Test (Mos Eisley Test — Full):**
1. Three players create characters
2. Enter same frame
3. 30+ minutes of coordinated narrative
4. All feel synchronized imagination
5. All want to play again

**Status:** ~85% complete. Core loop works. Consolidation (0.10) in progress.

---

## What Comes After Plex 1

### Plex 1.1: Hard-LLM Integration
- Implement coordinate extraction skills
- Automatic proximity updates
- Aperture-driven context selection

### Plex 1.2: Purpose Trees
- Character drive at multiple pscales
- Phase 0.9.4 specification

### Plex 1.3: Condensed Reflexive Triad  
- Full character-llm processing
- Phase 0.9.5 specification

### Plex 2+
- Everything else is skills/packages
- World content (URB, etc.)
- Rule systems (NOMAD, etc.)
- Character-LLM autonomy

---

## What Plex 1 Does NOT Include

- Character sheets (skill-defined display)
- World maps (skill-defined display)
- Dice rolling UI (skill-defined)
- Any specific game mechanics (package-defined)
- Hard-LLM coordinate extraction (defer to 1.1)
- Purpose trees (defer to 1.2)

All of these emerge from skills and packages. Plex 1 is the substrate.

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│  React + TypeScript + Vite                                  │
│  Three-zone UI (solid/liquid/vapour)                        │
│  Real-time presence via Supabase Realtime                   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      ORCHESTRATION                          │
│  n8n workflow: xstream-orchestration                        │
│  Routes to appropriate LLM tier                             │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      EDGE FUNCTIONS                         │
│  generate-v2: Soft-LLM + Medium-LLM processing              │
│  (Hard-LLM: designed, not deployed)                         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                        DATABASE                             │
│  Supabase: users, characters, frames, liquid, solid,        │
│  skills, packages, character_coordinates, etc.              │
└─────────────────────────────────────────────────────────────┘
```

---

*Last updated: 2026-01-03*
*Phase 0.10.1 complete - stale liquid detection via LLM guidance*
