# Phase 0.6: Multi-User Foundation

**For Claude.ai Project: Xstream**

---

## Objective

Enable multiple users to share the same narrative space in real-time. This is the "minimal systemic" requirement - the foundation that makes Xstream a coordination system rather than a single-player tool.

---

## Test Scenario (Success Criteria)

> **Two users open the app in separate browsers. Both select test-frame. Each sees:**
> - The other's vapor (typing indicator)
> - The other's liquid entries (submitted intentions)
> - The other's solid entries (committed results)
> - Face badges showing who created what

This is the Mos Eisley Test at its simplest: can two people spend time in synchronized imagination?

---

## What "Same Location" Means

For Phase 0.6, location = frame. Users in the same frame are "close" in proximity terms:

| Proximity | Phase 0.6 Meaning | What You See |
|-----------|-------------------|---------------|
| **Close** | Same frame selected | All their vapor/liquid/solid |
| **Nearby** | (Not implemented) | - |
| **Far** | Different frame | Nothing |

Finer-grained proximity (XYZ coordinates, pscale-based filtering) comes later.

---

## Technical Approach

### Supabase Realtime Channels

Each frame gets a channel. Users subscribe when they select a frame:

```typescript
// Join frame channel
const channel = supabase.channel(`frame:${frameId}`)
  .on('presence', { event: 'sync' }, () => {
    // Update presence state (who's here, what face)
  })
  .on('broadcast', { event: 'vapor' }, (payload) => {
    // Show others' typing
  })
  .on('broadcast', { event: 'liquid' }, (payload) => {
    // Show others' submitted entries
  })
  .on('broadcast', { event: 'solid' }, (payload) => {
    // Show others' committed entries
  })
  .subscribe()
```

### Message Types

**Presence** (automatic via Supabase)
- User ID, display name, current face
- Online/offline status

**Vapor Broadcast**
- Typing indicator (not full text initially)
- User ID and face
- Throttled to avoid spam

**Liquid Broadcast**
- Full entry when submitted
- User ID, face, entry ID, text, artifact metadata

**Solid Broadcast**
- Entry + response when committed
- User ID, face, entry ID, text, response, skills used

### Shelf Persistence

Entries need to persist to database so users joining later see history:

```sql
-- shelf table (already exists, needs connection)
shelf (
  id uuid,
  user_id uuid,
  frame_id uuid,
  face text,
  text text,
  state text,  -- 'submitted' | 'committed'
  response text,
  metadata jsonb,
  created_at timestamp,
  updated_at timestamp
)
```

### User Identity

Minimal auth for Phase 0.6:
- Keep localStorage UUID for now
- Add display name (prompt on first visit or use "User-XXXX")
- Real auth (Supabase Auth) can come in Phase 0.7

---

## UI Changes

### Presence Indicator

Show who's in the frame:
```
[Player] David  [Author] Alice  [Designer] Bob
```

### Other Users' Entries

Distinguish self vs others:
- Self entries: current styling
- Others' entries: slightly faded, user badge, non-editable

### Vapor from Others

```
~ Vapor
  * David is typing...
  * Alice is typing...
  [your vapor here]
```

---

## Implementation Steps

### Step 1: Supabase Channel Setup
- Create channel subscription when frame selected
- Handle presence sync
- Clean up on frame change or unmount

### Step 2: Vapor Broadcasting
- Broadcast typing state (throttled)
- Display others' typing indicators
- Respect shareVapor visibility setting

### Step 3: Liquid Broadcasting
- Broadcast on submit
- Display others' liquid entries (read-only)
- Respect shareLiquid visibility setting

### Step 4: Solid Broadcasting
- Broadcast on commit complete
- Display others' solid entries
- Include response and metadata

### Step 5: Shelf Persistence
- Write entries to shelf table on submit/commit
- Load existing entries when joining frame
- Handle offline/reconnection gracefully

### Step 6: User Display Names
- Prompt for name or generate default
- Store in localStorage
- Include in presence and entries

---

## Scope Boundaries

**In Scope:**
- Real-time presence in same frame
- Vapor/liquid/solid visibility between users
- Basic shelf persistence
- User display names

**Out of Scope (Phase 0.7+):**
- User authentication
- XYZ coordinate filtering
- Pscale-based visibility
- Proximity transitions (close → nearby)
- Frame/package management UI
- Hard-LLM coordination between users

---

## Key Questions to Resolve

1. **Entry ownership**: Can users edit each other's liquid entries, or read-only?
   - Recommendation: Read-only for others

2. **Solid visibility**: See others' full response or just that they committed?
   - Recommendation: Full response (we're "close")

3. **History depth**: How much history to load on join?
   - Recommendation: Last N entries per face, configurable

4. **Conflict handling**: What if two users commit simultaneously?
   - Recommendation: Both succeed, ordering by timestamp

---

## Success Metrics

1. Open app in two browsers with same frame
2. Type in one → typing indicator appears in other
3. Submit in one → entry appears in other's liquid
4. Commit in one → entry + response appears in other's solid
5. Refresh page → entries persist from database
6. Change frame → stop seeing other user's content

---

## Reference Documents

- `onen_v4_design_document.md` Part VII (Opening Coordination)
- `onen_v4_design_document.md` Part VIII (Xstream Interface)
- `onen_v4_design_document.md` Appendix C (Technical Stack)
- `phase-0.5-summary.md` (current state)
