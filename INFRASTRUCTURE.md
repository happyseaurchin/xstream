# INFRASTRUCTURE INDEX — READ THIS FIRST

> **Claude Code**: Read this file at the START of every session to understand where things are.
> **David**: Update this file when infrastructure changes (new repos, domains, etc.)

---

## QUICK LOOKUP: "User mentioned X, where do I work?"

| User mentions... | Work in repo | Domain |
|------------------|--------------|--------|
| `xstream.onen.ai`, "main app", "3-zone UI", "vapor/liquid/solid" | `happyseaurchin/xstream` | xstream.onen.ai |
| `xstream.machus.ai`, `/experiments`, `/videos`, "marketing site" | `happyseaurchin/xstream-the-address-of-meaning` | xstream.machus.ai |
| `seed.machus.ai`, "kernel", "BYOK" | `happyseaurchin/xstream-seed` | seed.machus.ai |
| `xq.crumful.com`, "XQ", "math visualizations" | `happyseaurchin/xq-showcase` | xq.crumful.com |

---

## ALL PROJECTS

### 1. xstream (Main App)
- **GitHub**: `happyseaurchin/xstream`
- **Vercel Project**: `xstream` (`prj_EqJrQikosntMtDXeFxP1l7MVRaDI`)
- **Domain**: xstream.onen.ai
- **Supabase**: `piqxyfmzzywxzqkzmpmm`
- **Purpose**: Main 3-zone coordination app (vapor/liquid/solid)
- **Local path**: `/Users/davidpinto/Projects/xstream`
- **Worktrees**: `/Users/davidpinto/.claude-worktrees/xstream/`

### 2. xstream-the-address-of-meaning (Marketing + Experiments)
- **GitHub**: `happyseaurchin/xstream-the-address-of-meaning`
- **Vercel Project**: `xstream-the-address-of-meaning` (`prj_6GGLFu4xB1OXu6TaQN4sIstqHLqy`)
- **Domain**: xstream.machus.ai
- **Supabase**: Same (`piqxyfmzzywxzqkzmpmm`) — shared auth
- **Purpose**: Marketing site, `/experiments` gallery, `/videos` streaming
- **Routes**:
  - `/` — Landing page (public)
  - `/experiments` — Auth-protected experiments
  - `/videos` — Auth-protected video gallery
- **Video server**: Mac Mini via Cloudflare tunnel (URL changes on restart)

### 3. xstream-seed (Kernel)
- **GitHub**: `happyseaurchin/xstream-seed`
- **Vercel Project**: `xstream-seed` (`prj_y9QlZFhnsRgStpBxI5n8krMbnxNM`)
- **Domain**: seed.machus.ai
- **Purpose**: Minimal self-bootstrapping kernel (bring your own API key)

### 4. xq-showcase (Math Visualizations)
- **GitHub**: `happyseaurchin/xq-showcase`
- **Vercel Project**: `xq-showcase` (`prj_dt6Pbgocn8Q0F1t8PdpXvOdUHZro`)
- **Domain**: xq.crumful.com
- **Purpose**: Interactive XQ mathematics visualizations

---

## SHARED INFRASTRUCTURE

### Supabase
- **Project ID**: `piqxyfmzzywxzqkzmpmm`
- **URL**: https://piqxyfmzzywxzqkzmpmm.supabase.co
- **Used by**: All xstream projects (shared auth)

### Vercel Team
- **Team ID**: `team_iTERHQuAAemSTP39REAvULJr`
- **Name**: happyseaurchin's projects

---

## LOCAL WORKTREES (for xstream repo)

Location: `/Users/davidpinto/.claude-worktrees/xstream/`

Each folder is a separate branch checkout. To check which branch:
```bash
git branch --show-current
```

The main repo is at `/Users/davidpinto/Projects/xstream` (on `main` branch).

---

## VIDEO SERVER (Mac Mini)

Videos are served from David's Mac Mini via Cloudflare quick tunnel.

**The tunnel URL changes after each Mac restart!**

After restart:
1. Start HTTP server with CORS on port 8080
2. Start Cloudflare tunnel
3. Update `VITE_VIDEO_SERVER_URL` in Vercel (xstream-the-address-of-meaning project)
4. Redeploy

See full instructions in `xstream-the-address-of-meaning` repo's INFRASTRUCTURE.md.

---

## FOR CLAUDE CODE SESSIONS

**At session start:**
1. Read this file
2. Check what the user is asking about
3. Identify the correct repo from the lookup table above
4. If you're in the wrong repo, tell David and ask how to proceed

**If user mentions a domain you don't recognize:**
- ASK — don't guess or search randomly

**To modify a different repo than the current one:**
- Use GitHub MCP tools to edit directly, OR
- Ask David to switch you to that repo's worktree

---

*Last updated: 2025-01-20*
