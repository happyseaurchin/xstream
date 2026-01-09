# CLAUDE.md

## SCOPE CONSTRAINTS (READ FIRST)

### ALLOWED TO MODIFY:
- This repository: `happyseaurchin/xstream` ONLY
- Supabase project ID: `piqxyfmzzywxzqkzmpmm` ONLY
- Vercel team ID: `team_iTERHQuAAemSTP39REAvULJr`

### ACTIVE BRANCH:
- Check current branch before commits: `git branch --show-current`
- Never commit directly to main without explicit instruction
- Feature branches: `feature/phase-X.XX`

### FORBIDDEN:
- Pushing to any other repository
- Modifying any other Supabase project
- If uncertain, ASK FIRST

---

## Tech Stack
- React 19 + TypeScript + Vite 6
- Supabase (real-time database & auth)
- Deployed on Vercel

## Commands
```bash
npm run dev      # Start development server
npm run build    # TypeScript compile + Vite build
npm run lint     # ESLint (strict, --max-warnings 0)
npm run preview  # Preview production build
vercel           # Deploy preview
supabase functions serve  # Local edge functions
```

---

## CODE DISCIPLINE

### File Size Limits
| File Type | Max Lines | If Exceeded |
|-----------|-----------|-------------|
| React components | 200 | Split into smaller components |
| Utility modules | 150 | Split by responsibility |
| Edge functions | 300 | Extract shared logic |

### Commit Discipline
- Commit after EVERY successful change
- One change per commit
- Format: `[component] Brief description`
- Examples:
  - `[App] Extract CommitPanel to separate component`
  - `[hard-llm] Fix coordinate parsing for negative pscale`

### When Things Go Wrong
1. STOP immediately
2. Identify what broke
3. `git stash` or `git checkout .` to revert
4. Retry with smaller change

---

## ARCHITECTURE

### Three Zones (Shelf States)
- **Vapor**: Live typing (real-time, ephemeral)
- **Liquid**: Submitted input (awaiting synthesis)
- **Solid**: Committed narrative

### Three Faces
- **Player**: Character intentions → narrative
- **Author**: World content → context
- **Designer**: Skills/rules → compilation

### Triple-LLM Stack
- **Soft-LLM**: User-facing refinement
- **Medium-LLM**: Cross-player synthesis
- **Hard-LLM**: Background coherence

### Key Concept: Pscale
Coordinate system for temporal/spatial/identity scales:
- Negative = meta/designer level
- Zero = present moment/player
- Positive = settled/author content

---

## Directory Structure
```
src/
├── components/    # React components
├── hooks/         # Custom hooks
├── types/         # TypeScript interfaces
├── utils/         # Helper functions
└── lib/           # Supabase client
supabase/
└── functions/
    ├── hard-llm/      # Coordination LLM
    └── generate-v2/   # Soft/Medium LLM
specs/             # Technical Design Specs (temporary)
docs/              # Architecture documentation
docs/INDEX.md      # READ THIS FIRST - documentation status
```

### Documentation
**Always read `docs/INDEX.md` first** before diving into other docs. It tracks which documents are current, reference, or archived.

---

## Environment Variables
```
VITE_SUPABASE_URL=https://piqxyfmzzywxzqkzmpmm.supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
```

---

## DESIGN PRINCIPLES

1. **Minimal systemic system** — All components must exist simultaneously
2. **Soft-code everything possible** — Only platform guardrails are hard-coded
3. **Temporal primacy** — Proximity = temporal relevance, not spatial
4. **Constraint as enablement** — Limitations generate emergence
5. **Experience over words** — Generate experience in the reader's moment, not documents
