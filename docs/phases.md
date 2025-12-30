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
| 0.7 | 🔄 NEXT | Management & Tidy |
| 0.8 | ⏳ PLANNED | User Registration |
| 0.9 | ⏳ PLANNED | Integration Testing |
| 1.0 | ⏳ PLANNED | Kernel Complete |

---

## Phase 0.1: Core Loop ✅

Single user, X0Y0Z0 configuration.

**Delivered:**
- Text input → shelf (in-memory)
- Hard-coded prompt compilation
- Claude API call
- Response displayed

**Test:** User enters text, system responds. Nothing persists after refresh.

---

## Phase 0.2: Skill Loading ✅

Skills loaded from database, face-aware.

**Delivered:**
- `packages` table with platform package (onen)
- `skills` table with format skills per face
- `frame_packages` table for composition
- `generate-v2` edge function loads skills by face + frame

**Test:** Switching faces loads different format skills.

---

## Phase 0.3: Frame Selection ✅

UI to select frame, verify skill overrides work.

**Delivered:**
- Frame selector dropdown in UI
- Test frame with custom package attached
- Visual confirmation of which skills loaded

**Test:** Select test-frame → response includes "[TEST FRAME ACTIVE]" marker.

---

## Phase 0.4: Text States (Visual) ✅

Make vapor/liquid/solid visible in single-user mode.

**Delivered:**
- Vapor area (typing indicators, Soft-LLM responses)
- Liquid area (submitted intentions, editable)
- Solid area (committed results)
- State badges (submitted/editing/committed)
- Visibility panel with state toggles

**Test:** User sees their own text transition through states.

---

## Phase 0.4.5: Soft-LLM Query Flow ✅

Private refinement before public intention.

**Delivered:**
- `[?]` Query button triggers Soft-LLM
- Soft-LLM response in vapor with [Use]/[Edit] buttons
- Typography parsing: `{braces}` → liquid, `(parens)` → solid
- Face filters in visibility panel (Player/Author/Designer)
- Fixed: Cmd+Enter with empty input no longer errors

**Test:** Type "open door" → `[?]` → vapor shows refined text → [Use] → moves to liquid.

---

## Phase 0.5: Designer Creates Skills ✅

Designer mode stores skills to database.

**Delivered:**
- Designer face prompts include skill-creation capability
- New skills stored in user's personal package
- Created skills load on subsequent requests
- Validation against guard rails
- Soft-LLM three response types: artifact, clarify, refine
- Vapor/liquid persistence (no auto-dismiss)
- Face selector filters all views
- Directory shows skills (designer) or artifacts (player/author)
- Meta toggle shows skill usage on entries

**Test:** As designer, create a custom format skill. Switch to player, see custom skill in effect.

**Summary:** See `docs/phase-0.5-summary.md`

---

## Phase 0.6: Multi-User Presence ✅

The social coordination layer foundation.

**Delivered:**
- Supabase Realtime channel per frame (useFrameChannel hook)
- Connection status indicator in header
- Presence tracking (who's in frame, their face, typing state)
- Presence bar showing other users
- Display name editing in visibility panel
- Typing indicators visible to others

**Test:** Two browser tabs in same frame. User A types → User B sees typing indicator.

---

## Phase 0.6.5: Live Multi-User Text States ✅

Full text state sharing between users.

**Delivered:**
- Live vapor broadcast (character-by-character, 50ms throttle)
- Liquid table in Supabase for persistent shared submissions
- useLiquidSubscription hook for real-time database sync
- Others' vapor displays live with blinking cursor
- Others' liquid entries from database subscription
- Face-colored indicators for vapor and liquid
- Visibility controls (shareVapor, shareLiquid, showVapor, showLiquid, showSolid)
- Codebase refactored: App.tsx 38KB → 15KB with extracted components

**Architecture (post-refactor):**
```
src/
├── types/index.ts           # All shared interfaces
├── utils/parsing.ts         # Input/artifact parsing
├── components/
│   ├── VaporPanel.tsx       # Vapor area + soft responses
│   ├── LiquidPanel.tsx      # Liquid entries + editing
│   ├── SolidPanel.tsx       # Log/dir views
│   ├── PresenceBar.tsx      # Other users display
│   ├── VisibilityPanel.tsx  # Share/show toggles
│   ├── InputArea.tsx        # Footer textarea + buttons
│   └── ConstructionButton.tsx
├── hooks/
│   ├── useFrameChannel.ts   # Realtime presence + vapor
│   └── useLiquidSubscription.ts  # Database liquid sync
└── App.tsx                  # ~300 lines orchestration
```

**Test:** Two browser tabs in same frame. User A types → User B sees live text appear character-by-character. User A submits → User B sees liquid entry. User A commits → entry disappears from liquid.

**Summary:** See `docs/phase-0.6-summary.md`

---

## Phase 0.7: Management & Tidy 🔄

Management UI and polish.

**Will deliver:**
- Skill visibility in player/author modes
- Package browsing/management
- Frame creation/management
- Platform/frame-level content (characters, world elements)
- UX polish from testing

**Scope:** See `docs/phase-0.7-scope.md`

---

## Phase 0.8: User Registration ⏳

Proper authentication.

**Will deliver:**
- Supabase Auth integration
- User profiles
- Session management
- Permission model for frames/packages

---

## Phase 0.9: Integration Testing ⏳

Skills-based content generation and kernel validation.

**Will deliver:**
- Character sheet generation (skills-based)
- Chat history display (skills-based)
- World content templates
- End-to-end testing of kernel capabilities

---

## Plex 1: Kernel Complete ⏳

All faces work, skills compose, multiple users coordinate.

**Test (Mos Eisley Test):** 3 players in Star Wars cantina. X0Y0Z0 frame. 30 minutes. They feel synchronized imagination. They want to play again.

---

## What Plex 1 Does NOT Include

- Character sheets (skill-defined display)
- World maps (skill-defined display)
- Dice rolling UI (skill-defined)
- Any specific game mechanics (package-defined)

All of these emerge from skills and packages. Plex 1 is the substrate.
