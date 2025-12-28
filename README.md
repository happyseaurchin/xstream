# Xstream

Onen v4 — Narrative coordination system for shared imagination.

## Current Phase: Plex 1 (X0Y0Z0)

Ephemeral proof case. Nothing persists after refresh.

## Live

https://xstream-happyseaurchins-projects.vercel.app

## Stack

- **Frontend**: React + TypeScript + Vite
- **Database**: Supabase (PostgreSQL)
- **LLM**: Claude via Supabase Edge Function
- **Deploy**: Vercel

## Local Development

```bash
npm install
npm run dev
```

Create `.env.local`:
```
VITE_SUPABASE_URL=https://piqxyfmzzywxzqkzmpmm.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

## Documentation

See `/docs` for architecture documents:
- `plex-1-specification.md` — Minimal kernel spec
- `agent-context-architecture.md` — Three faces, context flow
- `pscale-spine.md` — Pscale coordinate system
