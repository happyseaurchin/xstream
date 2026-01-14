# Claude Code Instructions

## START HERE

**Branch:** `reverse-sequence`
**GitHub:** https://github.com/happyseaurchin/xstream/tree/reverse-sequence

---

### Development Path: Reverse Sequence

This branch follows the **Reversed Development Sequence** — building F (real world) before E (fantasy world).

**Read `docs/xstream-build-phases.md` first** — it explains why this order matters and what each phase entails.

**Current target: Phase 3 (F)** — Real world user identity, single-player, pscale coordinate assignment.

---

### ⚠️ DATABASE ISOLATION — READ THIS FIRST ⚠️

**CRITICAL:** This branch uses a SEPARATE Supabase branch database. DO NOT touch the main database.

| Environment | Project ID | URL | Purpose |
|-------------|------------|-----|---------|
| **MAIN (PRODUCTION)** | `piqxyfmzzywxzqkzmpmm` | `https://piqxyfmzzywxzqkzmpmm.supabase.co` | **DO NOT USE FOR EXPERIMENTS** |
| **EXPERIMENTS** | `imdxkjagahfgssedfuaq` | `https://imdxkjagahfgssedfuaq.supabase.co` | reverse-sequence and attempt-N branches use THIS |

**Experiment Anon Key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZHhramFnYWhmZ3NzZWRmdWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDYwNTYsImV4cCI6MjA4MzkyMjA1Nn0.rsli7WAbWUgefFxNDSwK_vnianJetl2mjTs5D_J14xo
```

**Before running ANY migration or DB operation:**
1. Verify you're linked to the experiment branch: `supabase link --project-ref imdxkjagahfgssedfuaq`
2. NEVER run `supabase db push` or migrations against `piqxyfmzzywxzqkzmpmm`
3. The experiment DB starts empty — create your schema fresh

---

### Branching Context

```
main (stable v1)
    │
fresh-build (documentation base)
    │
    ├── reverse-sequence ← YOU ARE HERE (phased build: F before E)
    │
    ├── attempt-1  ← Integrated build attempt
    ├── attempt-2  ← Future integrated attempts
    └── ...
```

**Two development philosophies coexist:**
- **reverse-sequence**: Incremental phases, F before E, isolated challenges
- **attempt-N branches**: Build complete plex in one integrated effort

Both may inform the final implementation.

---

### First Steps for Any Session

1. **Confirm branch:** `git branch --show-current` (should be `reverse-sequence`)
2. **Read `docs/xstream-build-phases.md`** — the phased approach and current status
3. **Read `docs/index.md`** — organizes all documentation
4. **Check current phase status** — Phase 3 (F) is next target

### Phase 3 Target (Summary)

Single-player, real-world identity. The user provides information, the system:
- Soft-LLM mediates natural language → profile
- Medium-LLM synthesizes → solid (committed profile)
- Hard-LLM assigns T, S, I coordinates

**Why F first:** LLM has training data for real world. Can validate coordinate coherence before attempting fantasy (E) where no training data exists.

### Key Constraint

No frames table. No users table beyond auth. No cosmologies table. No categories.
Everything is content at coordinates `{t, s, i}` in shelf states (vapor/liquid/solid).

---

## Project: xstream (reverse-sequence)

Phased implementation of the unified loop for collaborative narrative.

## Documentation

- **Read `docs/xstream-build-phases.md` first** — the phased development approach
- **Read `docs/index.md`** — organizes all documentation
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

**If this branch succeeds and should go to production:**
1. Test thoroughly on experiment branch
2. Merge Supabase branch via dashboard (applies migrations to main)
3. Or manually recreate schema on main

## Vercel

- **Team ID:** `team_iTERHQuAAemSTP39REAvULJr`
- Preview deployments auto-create for each git branch push
- Set environment variables per branch in Vercel dashboard if needed
