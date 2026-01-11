# Claude Code Instructions

## Project: xstream (fresh-build)

Minimal implementation of the unified loop for collaborative narrative.

## Documentation

- Read `docs/index.md` first - it organizes all documentation
- Core concept: `docs/unified-loop.md` (when created)
- Coordinate system: `docs/pscale.md` (when created)

## Architecture

```
vapor → [soft-LLM] → liquid → [medium-LLM] → solid
```

Three zones, one loop. Everything flows through this path.

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
