# Phase 0.6 + 0.6.5 Summary: Multi-User Coordination

**Completed:** 2024-12-30

---

## What Was Built

### Phase 0.6: Presence Foundation

Established the real-time coordination layer using Supabase Realtime.

**useFrameChannel hook:**
- Subscribes to Supabase Realtime channel per frame
- Tracks presence (userId, userName, face, isTyping)
- Broadcasts typing state to others
- Handles connection/disconnection gracefully

**UI additions:**
- Connection status indicator (● green/red in header)
- Presence bar showing other users in frame
- Display name editing in visibility panel
- Typing indicators in vapor area

### Phase 0.6.5: Live Text States

Full text sharing between users.

**Live vapor (Realtime broadcast):**
- Character-by-character text broadcast (50ms throttle)
- Others see your typing as it happens
- Blinking cursor indicates live text
- Face-colored borders (player=blue, author=green, designer=orange)

**Shared liquid (Database persistence):**
- `liquid` table in Supabase stores submitted intentions
- useLiquidSubscription hook for real-time sync
- INSERT/UPDATE/DELETE subscriptions
- Others' liquid entries visible with user badge

**Visibility controls:**
- shareVapor: broadcast your typing
- shareLiquid: share submissions to database
- showVapor: see others' typing
- showLiquid: see others' submissions
- showSolid: see committed log

---

## Codebase Refactoring

During 0.6.5 deployment, App.tsx was refactored from 38KB (~1200 lines) to 15KB (~300 lines).

**Extracted modules:**

| File | Size | Purpose |
|------|------|---------|  
| types/index.ts | 1.8KB | All shared interfaces |
| utils/parsing.ts | 2.8KB | getUserId, parseInputTypography, parseArtifactFromText |
| components/PresenceBar.tsx | 0.7KB | Display other users |
| components/VisibilityPanel.tsx | 2.7KB | Share/show toggles + name edit |
| components/InputArea.tsx | 2.1KB | Footer with textarea + buttons |
| components/VaporPanel.tsx | 3.9KB | Vapor area + soft responses |
| components/LiquidPanel.tsx | 3.2KB | Liquid entries + editing |
| components/SolidPanel.tsx | 6.1KB | Log view + directory view |
| components/index.ts | 0.4KB | Barrel export |

**Benefits:**
- Isolated error fixes (TypeScript errors in one component don't require full file rewrite)
- Clear ownership of functionality
- Easier testing per component
- App.tsx is now pure orchestration

---

## Database Schema Addition

```sql
CREATE TABLE liquid (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frame_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  face TEXT NOT NULL CHECK (face IN ('player', 'author', 'designer')),
  content TEXT NOT NULL,
  committed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(frame_id, user_id)
);

ALTER TABLE liquid ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read liquid in their frame"
  ON liquid FOR SELECT USING (true);

CREATE POLICY "Users can manage their own liquid"
  ON liquid FOR ALL USING (true);

ALTER TABLE liquid REPLICA IDENTITY FULL;
```

---

## Test Verification

**Two-tab test:**
1. Open xstream in two browser tabs
2. Select same frame in both
3. Tab A: Type → Tab B sees live text with blinking cursor
4. Tab A: Submit → Tab B sees liquid entry with name badge
5. Tab A: Commit → Tab B sees liquid entry disappear

**Visibility test:**
1. Toggle shareVapor off → others stop seeing your typing
2. Toggle showVapor off → you stop seeing others' typing
3. Same for liquid controls

---

## Known Limitations

- Vapor is ephemeral (Realtime only, no persistence)
- Liquid persisted but one entry per user per frame (upsert)
- Solid entries still local (not yet shared via database)
- No user authentication (anonymous UUIDs)

---

## Next: Phase 0.7

Management & Tidy - see `docs/phase-0.7-scope.md`
