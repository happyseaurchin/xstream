# Plex 0: Bootstrap Phase

**David + Claude creating the system before the system exists**

---

## What This Is

Plex 0 is the bootstrap phase where we (David + Claude) create the conditions for Xstream to exist. We're using:
- Claude.ai as interface
- Supabase as database
- n8n as orchestration  
- GitHub as code storage
- Vercel as deployment

The documents and code created in Plex 0 become the foundation for Plex 1 (the minimal systemic kernel).

---

## Scope Constraints (CRITICAL)

All changes are EXCLUSIVELY limited to:

**ALLOWED TO MODIFY:**
- GitHub: `happyseaurchin/xstream` repository ONLY
- Supabase: `xstream` project (ID: piqxyfmzzywxzqkzmpmm) ONLY
- n8n: `xstream-orchestration` workflow ONLY

**READ-ONLY REFERENCE:**
- GitHub repos: onen-play, onen, onen-discord-bot, machus-ghost-agency-nexus
- Supabase projects: Onen, Machus, awareness-functions
- n8n workflows: All existing workflows

**VERIFICATION PATTERN:**
Before any write operation, state:
"✓ Target: [resource name] → Verified as xstream scope"

---

## Workflow Efficiency Notes

**For Claude in future chat threads:**

### GitHub File Editing

The GitHub API (`github:create_or_update_file`) requires **full file content** — it doesn't support partial updates. This is a GitHub API limitation.

**Efficient workflow for surgical edits:**
```
1. Use `view` tool to read file content
2. Copy to local working directory (/home/claude/)
3. Use `str_replace` for surgical edits locally
4. Push final version via GitHub API
```

**For quick status updates** (like phase completion), use the local editing workflow.

**For major changes**, consider:
- Working in artifacts for user review before pushing
- Splitting large docs into smaller focused files

### Document Structure

Keep frequently-updated content in separate files:
- `phases.md` — Implementation phase status (changes often)
- `plex-1-specification.md` — Architecture (changes rarely)
- `plex-0-bootstrap.md` — This file (workflow notes)

### Key Files to Check First

When starting a new chat thread:
1. `docs/phases.md` — Current implementation status
2. `docs/plex-1-specification.md` — Architecture reference
3. `docs/plex-0-bootstrap.md` — This file (workflow notes)
4. `src/App.tsx` — Current UI implementation
5. `supabase/functions/generate-v2/index.ts` — Edge function

---

## The Three Faces

Every user of Xstream wears one of three faces:

| Face | Operates ON | Output Becomes |
|------|-------------|----------------|
| **Player** | Character intentions | Narrative (affects other players) |
| **Author** | World content | Context for players |
| **Designer** | Skills/rules | Compilation rules for all levels |

In Plex 0, David is all three. In conversations, he may shift between faces.

---

## Key Concepts

**Pscale** — Coordinate system mapping temporal/spatial/identity scales (-10 to +16).

**Skills** — Markdown documents that define how prompts are compiled. Not static instructions, but assembly rules.

**Packages** — Composable skill bundles with signatures: `onen` (platform), `nomad`/`d&d` (ruleset), `urb` (world), `david-*` (personal).

**Shelf** — Where all text lives. States: draft → submitted → committed.

**Text States** — Vapor (typing), Liquid (submitted), Solid (committed).

**XYZ Configuration** — Frame temporal settings:
- X: Persistence (0=ephemeral, 1=saved)
- Y: Temporality (0=present only, 1=block universe)
- Z: Mutability (0=fixed world, 1=mutable)

---

## Designer Scope (Phase 0.5+)

Designers can control through skills:

| Domain | Skill Category | What It Controls |
|--------|----------------|------------------|
| **LLM Behavior** | gathering, aperture, weighting, format, routing, constraint | How prompts are compiled, what context is gathered |
| **UI Rendering** | display | Default visibility, face filters, layout hints |
| **Input Parsing** | parsing | Typography rules (`{braces}`, `(parens)`, etc.) |
| **Mechanics** | constraint | Input limits, pacing rules, validation |

**Cannot override:** `guard` skills (platform safety rails)

### Layering

```
┌─────────────────────────────────────────────┐
│ User Preferences (personal overrides)       │
├─────────────────────────────────────────────┤
│ Frame Config (designer defaults)            │
├─────────────────────────────────────────────┤
│ Skills (soft-coded behavior)                │
├─────────────────────────────────────────────┤
│ Platform (hard-coded capabilities)          │
└─────────────────────────────────────────────┘
```

User preferences override frame defaults. Frame skills override platform defaults. Guard skills cannot be overridden.

---

## Resources

**Supabase:**
- Project ID: `piqxyfmzzywxzqkzmpmm`
- Edge functions: `generate-v2`

**GitHub:**
- Repository: `happyseaurchin/xstream`

**Vercel:**
- Team: `team_iTERHQuAAemSTP39REAvULJr`
- Project: `prj_EqJrQikosntMtDXeFxP1l7MVRaDI`

**n8n:**
- Workflow: `xstream-orchestration` (ID: K3y5AgQYFSTllQjm)
