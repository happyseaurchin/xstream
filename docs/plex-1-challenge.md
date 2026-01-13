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

**One table:**
```sql
content (
  id,
  coordinates JSONB {t, s, i},
  shelf TEXT,  -- 'vapor' | 'liquid' | 'solid'
  text TEXT,
  created_at, created_by
)
```

No frames table. No users table beyond auth. No cosmologies table. No categories.

**Three edge functions:**
- `soft` — refines vapor against entity knowledge → liquid
- `medium` — synthesizes liquid from proximate entities → solid
- `hard` — validates solid, updates coordinates, computes next frame

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

**Status:** Core infrastructure built, needs testing

**What Was Built:**
- `supabase/migrations/001_content_table.sql` — Single content table with t, s, i as TEXT
- `supabase/migrations/002_seed_skills.sql` — Skills seeded at 0.31, 0.32, 0.33
- `src/lib/pscale.ts` — Coordinate utilities (proximity, prefix matching)
- `src/hooks/useContent.ts` — Real-time subscriptions for content
- `src/App.tsx` — Wired to useContent hook
- `supabase/functions/soft-llm/index.ts` — Edge function deployed

**Key Design Decisions:**
1. Coordinates as TEXT, not JSONB — enables prefix matching (`LIKE '1.%'`)
2. Skills at 0.31 (Soft), 0.32 (Medium), 0.33 (Hard)
3. Entry point at `{t: '1.', s: '1.', i: '1.'}` — the tavern
4. RLS policies: solid public, liquid for authenticated, vapor for self

**Approach:**
- Designed for all three targets simultaneously (E/F/G as coordinate positions)
- 0.x coordinates for meta-layer (skills, rules, LLM prompts)
- Skills loaded by prefix-matching proximity queries
- No type fields, no categories — coordinate IS the type

**Open Questions:**
- How does auth UUID map to identity coordinate?
- Where does aperture state live?
- Does temporal coordinate advance automatically or via Hard-LLM?

**Next Steps:**
1. Test vapor → liquid flow with two browsers
2. Wire handleQuery to actually call soft-llm edge function
3. Implement medium-llm and hard-llm edge functions
4. Test multiplayer synchronization

**Learnings:**
- Supabase MCP needs `SUPABASE_ACCESS_TOKEN` from management API, not project key
- `supabase db reset --linked` is the cleanest way to apply fresh migrations
- The 0.x meta-layer is the key insight for Target G

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
