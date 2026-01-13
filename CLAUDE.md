# Claude Code Instructions

## START HERE

**Branch:** `fresh-build` (STARTING POINT — do not code here)
**GitHub:** https://github.com/happyseaurchin/xstream/tree/fresh-build

---

### ⚠️ DATABASE ISOLATION — READ THIS FIRST ⚠️

**CRITICAL:** Experiments use a SEPARATE Supabase branch database. DO NOT touch the main database.

| Environment | Project ID | URL | Purpose |
|-------------|------------|-----|---------|
| **MAIN (PRODUCTION)** | `piqxyfmzzywxzqkzmpmm` | `https://piqxyfmzzywxzqkzmpmm.supabase.co` | **DO NOT USE FOR EXPERIMENTS** |
| **EXPERIMENTS** | `imdxkjagahfgssedfuaq` | `https://imdxkjagahfgssedfuaq.supabase.co` | All attempt-N branches use THIS |

**Experiment Anon Key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZHhramFnYWhmZ3NzZWRmdWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDYwNTYsImV4cCI6MjA4MzkyMjA1Nn0.rsli7WAbWUgefFxNDSwK_vnianJetl2mjTs5D_J14xo
```

**Before running ANY migration or DB operation:**
1. Verify you're linked to the experiment branch: `supabase link --project-ref imdxkjagahfgssedfuaq`
2. NEVER run `supabase db push` or migrations against `piqxyfmzzywxzqkzmpmm`
3. The experiment DB starts empty — create your schema fresh

---

### Branching Strategy

```
fresh-build (STARTING POINT)
    │
    ├── attempt-1  ← First coding attempt
    ├── attempt-2  ← Second coding attempt
    ├── attempt-3  ← ...etc
    └── (future attempts branch from fresh-build)
```

**Rules:**
1. `fresh-build` stays clean — only documentation updates
2. Each attempt creates its own branch: `git checkout -b attempt-N`
3. After an attempt, update `docs/plex-1-challenge.md` on `fresh-build` with learnings
4. Future sessions start from `fresh-build`, read the attempts log, then create new branch

### First Steps for Any Session

1. **Confirm branch:** `git branch --show-current`
2. **If on `fresh-build`:** Read docs, then `git checkout -b attempt-N` before coding
3. **Read `docs/plex-1-challenge.md`** — the challenge AND previous attempts
4. **Read `docs/index.md`** — organizes all documentation
5. **Check previous attempt branches** if you want to see their code:
   - `git branch -a | grep attempt`
   - `git log attempt-N --oneline -10`

### The Challenge (Summary)
Build a working system with ONE table, THREE edge functions:
- **Target E**: Five players in a tavern, typing intentions → narrative synthesis
- **Target F**: Registration creates profile-characters through the loop
- **Target G**: Code itself lives at pscale 0.xx coordinates

Same loop, same table. Coordinate position determines behavior.

### Key Constraint
No frames table. No users table beyond auth. No cosmologies table. No categories.
Everything is content at coordinates `{t, s, i}` in shelf states (vapor/liquid/solid).

---

## Project: xstream (fresh-build)

Minimal implementation of the unified loop for collaborative narrative.

## Documentation

- **Read `docs/index.md` first** - it organizes all documentation
- **Read `docs/plex-1-challenge.md`** - the challenge and attempts log
- Core concept: `docs/unified-loop.md`
- Coordinate system: `docs/pscale-spine.md`, `docs/pscale-implementation.md`

## Architecture

```
vapor → [soft-LLM] → liquid → [medium-LLM] → solid → [hard-LLM] → archive
```

Three tiers, one loop. Everything flows through this path.

## Pscale (Critical)

**Pscale = power of 10 of the rightmost significant digit.**

```
300   → pscale 2  (10²)
321   → pscale 0  (10⁰)
0.3   → pscale -1 (10⁻¹)
0.03  → pscale -2 (10⁻²)
```

**Semantic-numbers**: Coordinates where place value = semantic scale.
- `321` means: context 3, area 2, specific 1
- Lower pscale = finer detail, higher pscale = broader scope

**Three dimensions**: T (temporal), S (spatial), I (identity)
- Each uses the same place-value logic
- Content exists at coordinates `{t, s, i}`

**Tabulation**: Semantic-numbers decompress to semantic-vectors (text chunks).
- `321` → retrieves text at that coordinate
- Aperture queries gather proximate content for LLM context

**Direction matters**:
- Positive integers (321): right-to-left, rightmost = finest detail
- Sub-unity (0.123): left-to-right, leftmost = broadest category

Read `docs/pscale-spine.md` and `docs/pscale-implementation.md` for full details.

## Stack

- Vite + React + TypeScript
- Tailwind CSS with CSS variables for theming
- Supabase (auth, database, real-time, edge functions)

## Key Files

```
src/
  App.tsx                 # Main orchestrator
  components/
    VapourZone.tsx        # Input + soft-LLM response
    LiquidZone.tsx        # Submitted content cards
    SolidZone.tsx         # Committed narrative
  types/
    index.ts              # Core types
  index.css               # Theme variables
```

## Theming

- `data-theme="dark|light|cyber"` on root
- `data-face="character|author|designer"` sets accent color
- CSS variables in `src/index.css`

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Next Steps

1. Wire Supabase auth
2. Add real-time subscriptions
3. Connect LLM edge functions
4. Implement coordinate filtering

---

## Attempts Log Reference

See `docs/plex-1-challenge.md` for the attempts log.

**After your attempt:**
1. Switch back to fresh-build: `git checkout fresh-build`
2. Update `docs/plex-1-challenge.md` with your learnings
3. Commit and push to fresh-build
4. Your attempt branch remains accessible for future sessions to inspect

**Previous Attempts:**
| Branch | Status | Key Learning |
|--------|--------|--------------|
| `attempt-1` | Architecture only | 0.x meta-layer, unified E/F/G design |

---

## Supabase — Detailed Reference

See the **DATABASE ISOLATION** section at the top for credentials.

**Linking to experiment database:**
```bash
supabase link --project-ref imdxkjagahfgssedfuaq
```

**Pushing migrations:**
```bash
supabase db push  # Only after linking to experiment project!
```

**Deploying edge functions:**
```bash
supabase functions deploy <function-name> --project-ref imdxkjagahfgssedfuaq
```

**If an attempt succeeds and should go to production:**
1. Test thoroughly on experiment branch
2. Merge Supabase branch via dashboard (applies migrations to main)
3. Or manually recreate schema on main

## Vercel

- **Team ID:** `team_iTERHQuAAemSTP39REAvULJr`
- Preview deployments auto-create for each git branch push
- Set environment variables per branch in Vercel dashboard if needed
