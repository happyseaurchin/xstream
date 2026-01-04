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
| **0.10** | ✅ COMPLETE | **Consolidation (through 0.10.3.3)** |
| 1.0 | ⏳ PENDING | Kernel Complete (awaiting 3-player test) |

---

## Phase 0.10: Consolidation ✅

**Specification:** `docs/phase-0.10-specification.md`

Multi-user coordination fixes and consolidation for three-player test.

| Sub-phase | Status | Description |
|-----------|--------|-------------|
| 0.10.1 | ✅ COMPLETE | Stale liquid detection (consumed_by_solid_id) |
| 0.10.2 | ✅ COMPLETE | Concurrent commit coordination (synthesis lock) |
| 0.10.3.1 | ✅ COMPLETE | Initial multi-user synthesis flow |
| 0.10.3.2 | ✅ COMPLETE | Race condition diagnosis |
| 0.10.3.3 | ✅ COMPLETE | Early liquid deletion fix |

### 0.10.1: Stale Liquid Detection ✅

**Problem:** When user A commits, their liquid is synthesized. If they don't change it and user B commits, Medium-LLM sees user A's old liquid and re-narrates it.

**Solution:** Mark liquid as "consumed" when synthesized.

```sql
ALTER TABLE liquid ADD COLUMN consumed_by_solid_id UUID REFERENCES solid(id);
```

### 0.10.2: Concurrent Commit Coordination ✅

**Problem:** If two users hit commit within seconds, two separate Medium-LLM calls fire, creating duplicate narratives.

**Solution:** Leader election via synthesis lock on frames table.

```sql
ALTER TABLE frames ADD COLUMN synthesis_in_progress BOOLEAN DEFAULT FALSE;
ALTER TABLE frames ADD COLUMN last_synthesis_at TIMESTAMPTZ;
```

### 0.10.3: Multi-User Synchronization ✅

Original scope expanded when testing revealed race conditions in liquid handling.

#### 0.10.3.1: Initial Multi-User Flow
- Both users' liquid combined into single solid
- Contributor tracking working

#### 0.10.3.2: Race Condition Diagnosis  
**Problem discovered:** New liquid submitted during synthesis gets deleted.

**Root cause:** Database constraint `UNIQUE (frame_id, user_id)` means upsert UPDATES existing row. When synthesis completes and deletes the "old" liquid, it actually deletes the NEW content.

#### 0.10.3.3: Early Liquid Deletion Fix (January 4, 2026)

**Solution:** Move DB deletion EARLY - right after gathering context, before creating placeholder solid.

**Flow:**
```
1. Commit → gatherContext() stores content in memory
2. DELETE DB liquid immediately (content safe in context.allLiquid)
3. Create placeholder solid (narrative=null)
4. Placeholder INSERT → realtime → onSynthesisStart → local liquid clears
5. Users can submit NEW liquid → creates NEW DB row
6. Synthesis uses gathered context (memory)
7. Solid updated with narrative → complete
```

**Files modified:**
- `supabase/functions/generate-v2/synthesis/handler.ts`
- `src/hooks/useSolidSubscription.ts` (added onSynthesisStart callback)
- `src/App.tsx` (wired callback)

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
| 13 | **Mos Eisley Test passes** | ⚠️ | Two players ✅, three players pending |

---

## Test Frames Available

| Frame | Cosmology | Characters | Use Case |
|-------|-----------|------------|----------|
| **test-frame** | test-inn-world | Zara, Marcus, etc. | Primary testing |
| **test-frame-B** | test-inn-world | Shared with test-frame | Multi-frame same-world |
| **test-frame-2** | test-world-2 | Empty | Isolated clean testing |

---

## Remaining for Plex 1.0

### Ready to Test
1. ✅ **Stale liquid detection** — consumed_by_solid_id tracking
2. ✅ **Concurrent commit coordination** — synthesis lock
3. ✅ **Multi-user sync** — early deletion fix (0.10.3.3)
4. ❌ **Three-player test** — Full Mos Eisley Test

### Known Issues
- **Vapor flakiness** — Others' vapor sometimes disappears (channel reconnect, presence issues)
- **Author scenario output** — Medium-LLM produces verbose narrative instead of structured scenarios

### Deferred to Plex 1.1+
- Cosmology creation UI
- Frame creation UI  
- XYZ configuration UI
- Hard-LLM coordinate extraction
- Designer skill editing (load/modify/save)

---

## Plex 1.0: Kernel Complete ⏳

**Target:** Three-player coordination test passes.

**Test (Mos Eisley Test — Full):**
1. Three players create/select characters
2. Enter same frame
3. 30+ minutes of coordinated narrative
4. All feel synchronized imagination
5. All want to play again

**Status:** ~95% complete. All technical infrastructure in place. Awaiting three-player test.

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
│                      EDGE FUNCTIONS                         │
│  generate-v2: Soft-LLM + Medium-LLM + Hard-LLM              │
│  Synthesis with early liquid deletion                       │
│  Leader election for concurrent commits                     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                        DATABASE                             │
│  Supabase: users, characters, frames, liquid, solid,        │
│  skills, packages, content, cosmologies                     │
│  Real-time subscriptions for all text states                │
└─────────────────────────────────────────────────────────────┘
```

---

*Last updated: 2026-01-04*
*Phase 0.10.3.3 complete - early liquid deletion fix*
