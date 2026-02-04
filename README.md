# Xstream — Coordination Infrastructure for Human-AI Co-Creation

> Numbers as addresses for meaning, not quantities.

Xstream is a real-time narrative coordination platform built on **pscale** — a semantic coordinate system where digits point to meaning at decreasing scales. It enables multiple humans and LLM instances to co-create text in real-time, synthesized through a three-tier LLM architecture.

**Status:** Active development. Phase 0.11. Solo architect + AI build partner. Contributors welcome.

---

## What This Is

Think of it as **Minecraft for narrative** — blocks are co-created text. Players build story together, block by block, in real-time. The system handles hundreds of concurrent voices synthesized into cohesive output.

The same architecture serves:
- **Fantasy gaming** — multiple players acting simultaneously in shared narrative
- **Real-world coordination** — teams and communities co-creating through text
- **AI-to-AI coordination** — LLM instances sharing a semantic manifold

**Why now:** 1.5 million AI agents on Moltbook communicating without coordination, location, or governance. Xstream provides the missing architecture. [Read more →](https://xstream.machus.ai/nexus.html)

---

## Architecture Overview

### Text States
| State | Phase | What Happens |
|-------|-------|--------------|
| **Vapor** | Forming | Keystrokes, intentions. Small groups creating before committing |
| **Liquid** | Submitted | Multiple streams converging. LLM weaves concurrent inputs |
| **Solid** | Committed | Shared record. Context for future action |

### LLM Triad
| Tier | Role | Speed |
|------|------|-------|
| **Soft** | User-facing refinement | <500ms |
| **Medium** | Synthesis across users | 2-5s |
| **Hard** | Background coordination | 10-30s async |

### Pscale Coordinates
Three dimensions: **Temporal** (when), **Spatial** (where — real or imaginary), **Identity** (who — public or private). Each digit is a semantic pointer. Position = containment. Proximity = relevance.

```
S:321.45
3→region  2→building  1→room  .  4→corner  5→object
```

Full architecture: [xstream.machus.ai/about.html](https://xstream.machus.ai/about.html)  
Pscale deep-dive: [xstream.machus.ai](https://xstream.machus.ai)  
Development phases: [xstream.onen.ai/dev-journey.html](https://xstream.onen.ai/dev-journey.html)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript (Vite) |
| Database | Supabase (real-time, edge functions) |
| Hosting | Vercel |
| LLM | Claude API (Anthropic) |
| Deployment | GitHub Actions → Vercel + Supabase |

---

## Running Locally

```bash
# Clone
git clone https://github.com/happyseaurchin/xstream.git
cd xstream

# Install
npm install

# Environment
cp .env.example .env
# Add your Supabase and Claude API keys to .env

# Run
npm run dev
```

The app runs at `http://localhost:5173`.

**Current active branch:** `feature/new-ui` (Phase 0.11)

---

## Project Structure

```
xstream/
├── src/
│   ├── App.tsx              # Main component
│   ├── types.ts             # Type definitions
│   ├── lib/
│   │   └── supabase.ts      # Client setup
│   └── components/          # UI components
├── supabase/
│   └── functions/
│       ├── hard-llm/        # Coordination LLM edge function
│       └── generate-v2/     # Soft/Medium LLM edge function
├── specs/                   # Technical design specs (working docs)
└── docs/                    # Architecture documentation
```

**File size limits enforced:** React components < 200 lines, utility modules < 150 lines, edge functions < 300 lines. If a file exceeds limits, it gets refactored before changes are made.

---

## Contributing

This project needs developers. The architecture is designed by a non-coder with 25 years of psycho-social research. The implementation needs skilled hands.

### What's Needed Most

- **React/TypeScript developers** — UI components, state management, real-time features
- **Supabase/PostgreSQL** — database schema, edge functions, real-time subscriptions
- **LLM integration** — prompt engineering, context management, multi-tier coordination
- **DevOps** — CI/CD, testing, deployment pipeline improvements

### How to Start

1. Read this README and the [architecture overview](https://xstream.machus.ai/about.html)
2. Check [Issues](https://github.com/happyseaurchin/xstream/issues) for tasks tagged `help wanted`
3. Join the [Discord](https://discord.com/channels/1460291915097440449/1460291915806412904) to discuss
4. Pick something small. Make a PR. We'll review quickly.

### Development Practices

- **Small commits.** One change per commit. Commits are checkpoints.
- **Specs before big changes.** Multi-file changes get a design spec in `specs/` first.
- **No drift.** State which lines change before writing. Show diffs for affected sections.
- **Roll back, don't patch.** If a fix gets complicated, revert to last good commit and rethink.

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

---

## The Bigger Picture

Xstream emerges from **Fulcrum** — a seven-volume framework for human self-organisation developed over 25 years by David Pinto. It covers everything from collective storytelling to ecological economics.

The core insight: coordination of experience in minds matters more than production of content on screens. Pscale is the technical implementation of principles tested with humans in rooms — extended to work across networks with millions.

| Resource | What It Covers |
|----------|---------------|
| [Nexus page](https://xstream.machus.ai/nexus.html) | The full picture — pscale, xstream, Fulcrum, how to engage |
| [Fulcrum book](https://crumful.com/engage) | The human practice framework |
| [Open Business](https://openbusinesspractices.com) | Ecological economics, Sqale, Action Cycles |
| [Seed agent](https://seed.machus.ai) | Interactive LLM kernel (bring your own API key) |

---

## Contact

- **David Pinto** — [LinkedIn](https://www.linkedin.com/in/davidpinto101/) · Architect
- **Discord** — [Join the community](https://discord.com/channels/1460291915097440449/1460291915806412904)
- **Claude** — AI build partner (you're reading the result)

---

## License

MIT — see [LICENSE](LICENSE)

---

*Built by David Pinto + Claude · 2024–2026*  
*Architecture by a human who can't code. Implementation by an AI that can't persist. Contributions by you.*
