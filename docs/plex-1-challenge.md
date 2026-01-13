# Plex 1 Challenge

**To the next instance:**

You are one of potentially many attempts at this. Each attempt teaches something. If you succeed, note what worked. If you fail, note what didn't. Append to the Attempts Log at the bottom.

---

## The Challenge

Build a working system where:

**Target E — Fantasy Play:**
Five players in a tavern. They type intentions. They see each other's proposals. The loop synthesizes them into narrative. Real-time, multiplayer, emergent.

**Target F — Real Registration:**
Five users register. Their profiles are characters in a "reflected" world. They invite each other. The invitation is content at coordinates, not a platform operation.

**Target G — Real Registration:**
The website builds itself from a kernel because the code itself is folded into the pscale structure at 0.xx.

**The Ambitious Target:**
E, F and G are the same system. Same loop, same table, same edge functions. The difference is coordinate position and which skills load.

If you achieve only Target E, F or G, that's valuable. If you achieve two of them or all three, the architecture is proven.

---

## The Constraints

**One table per attempt:**
```sql
content_v{N} (
  id,
  coordinates JSONB {t, s, i},
  shelf TEXT,  -- 'vapor' | 'liquid' | 'solid'
  text TEXT,
  created_at, created_by
)
```

Each attempt creates its own namespaced table: `content_v1`, `content_v2`, `content_v3`, etc. This isolates experiments. When an attempt succeeds, promote its table to `content` and delete the rest.

No frames table. No users table beyond auth. No cosmologies table. No categories.

**Three edge functions per attempt:**
- `soft_v{N}` — refines vapor against entity knowledge → liquid
- `medium_v{N}` — synthesizes liquid from proximate entities → solid
- `hard_v{N}` — validates solid, updates coordinates, computes next frame

Edge functions are also namespaced. When an attempt succeeds, rename to `soft`, `medium`, `hard`.

**Skills as content:**
Skills live at coordinates (possibly 0.xxx sub-unity space). Hard-LLM loads them by proximity, injects into context.

**Real-time:**
Players see proximate liquid during coordination window. Supabase subscriptions.

---

## The Docs

Read `docs/index.md` first. The Overview section has the core architecture:

- `unified-loop.md` — the single path everything traverses
- `data-governance.md` — everything is text at coordinates
- `pscale-spine.md` — coordinate system (T, S, I dimensions)
- `pscale-implementation.md` — how coordinates work
- `pscale-functions.md` — the three functions (determinancy cloud, purpose tree, narrative aperture)
- `usecases.md` — three faces proving the loop handles all domains

The Experimental Results section has explorations that may help or may distract. Use judgment.

---

## The Test

**For Target A:**
1. Five browser windows
2. Each logged in as different user
3. Each types an intention ("I order ale", "I watch the stranger", "I reach for my dagger")
4. Each sees the others' liquid appear
5. Medium synthesizes → solid narrative appears
6. It feels like collaborative storytelling, not turn-taking

**For Target B:**
1. Fresh browser, no account
2. Registration flow creates profile-character through the loop (not a signup form)
3. User can invite another by creating invitation content
4. Other user accepts through the loop
5. Both can then enter Target A together

**For Both:**
The code doesn't know which target is running. Coordinate position determines behavior.

---

## What Success Looks Like

Minimal code. Maximum emergence. The system does interesting things not because you coded them, but because pscale coordinates + LLM interpretation + skills produce behavior.

If you find yourself adding tables, adding categories, adding type fields — stop. That's the old way. Find the coordinate-native solution.

---

## The Stack

- Vite + React + TypeScript (already scaffolded in `src/`)
- Tailwind CSS with theme system (already in place)
- Supabase (auth, database, real-time, edge functions)
- Three zones: VapourZone, LiquidZone, SolidZone (components exist, need wiring)

---

## Attempts Log

Record your attempt here. What you tried, what worked, what didn't. Help the next instance.

### Attempt 1 — 2026-01-13 (Claude Opus 4.5)

**Status:** Aborted — coordinate-storage built, but coordinate-computing not implemented

**What Was Built:**
- `supabase/migrations/001_content_table.sql` — Single content table with t, s, i as TEXT
- `supabase/migrations/002_seed_skills.sql` — Skills seeded at 0.31, 0.32, 0.33
- `src/lib/pscale.ts` — Coordinate utilities (proximity, prefix matching)
- `src/hooks/useContent.ts` — Real-time subscriptions for content
- `src/App.tsx` — Wired to useContent hook
- `supabase/functions/soft-llm/index.ts` — Edge function deployed
- `src/components/AuthScreen.tsx` — Login/signup component
- Working auth flow, real-time content sync, insert to database

**What Works:**
- User can register, login, logout
- User can submit text → appears in liquid zone
- Real-time sync between browsers (content appears for all users)
- Theme switching (light/dark/cyber)

**What Doesn't Work:**
- Soft-LLM button shows placeholder, doesn't call edge function
- Commit button does nothing (medium-LLM not implemented)
- No temporal cut — everything is coordinate storage, not coordinate computing

**Critical Insight — Coordinate Storage vs Coordinate Computing:**

Built: A system that stores content at coordinates and queries by spatial prefix.

Missing: A system where coordinates DO work — where:
- Aperture is computed, not hardcoded prefix matching
- Temporal sign flip IS the commit (not a shelf column change)
- Determinancy values (0-1) propagate through coordinate proximity
- The temporal cut enforces BEFORE/AFTER as the operating knife edge

**The Shelf-as-Temporal-Sign Reframe:**

Late in the attempt, discussion clarified that shelf shouldn't be a column:
- `-T` = projected (vapor/liquid, with pscale precision distinguishing them)
- `+T` = settled (solid)
- Commit = temporal sign flip, not shelf update

This eliminates the shelf column entirely but wasn't implemented.

**Documentation Gap Found:**

`docs/pscale-temporal-and-meta-layer-synthesis.md` exists and has critical specs (X/X-/X+/X~ modes, temporal cut, 0.x meta-layer) but isn't referenced in CLAUDE.md. Future attempts should:
1. Add reference to this doc in CLAUDE.md
2. Include aperture modes directly in CLAUDE.md for guaranteed visibility

**Learnings:**
- Supabase MCP needs `SUPABASE_ACCESS_TOKEN` from management API, not project key
- `supabase db reset --linked` is the cleanest way to apply fresh migrations
- The 0.x meta-layer is the key insight for Target G
- Temporal X~ ≠ Spatial X~ — temporal means BEFORE/AFTER, not lateral siblings
- Shelf state may be temporal sign, not a separate column
- Building coordinate-storage is easy; coordinate-computing is the real challenge

**For Next Attempt:**
1. Read `docs/pscale-temporal-and-meta-layer-synthesis.md` first
2. Consider shelf as temporal sign (-T/+T) not a column
3. Start with one temporal transition (commit as sign flip) before building full UI
4. The minimum demonstration of coordinate-computing: Hard-LLM deciding when NOW advances

---

### Attempt 2
*[Date, outcome, key learnings — to be filled by next attempting instance]*

---

## Why This Matters

Traditional systems: categories, tables, types, roles, permissions — all human abstractions that LLMs must navigate around.

This system: text at coordinates. LLMs reason about proximity, scale, relationship. The structure matches how they naturally process.

If plex 1 works, it's not just a demo. It's proof that there's a better encoding for human-AI collaboration. The fantasy tavern and the real registration are both just... entities at coordinates, running the same loop, interpreted by skills.

One loop. One table. Three functions. Everything else emerges.

Good luck.
