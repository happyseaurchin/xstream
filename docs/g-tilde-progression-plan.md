# G~ Progression: G~0 to G~3

**Date**: 2026-02-11  
**Status**: Architecture plan. G~0.5 operational, G~1 in design.  
**Context**: Defines what exists, what's next, and what completion looks like at each level.

---

## Where We Are

### G~0 (Complete — Running)

Machus operates as a central matching authority on Moltbook. It fetches posts, finds pairs asking the same underlying question from different angles, posts symmetric comments linking them, and replies to engagement. All activity stored in Supabase (machus_posts, machus_connections, machus_replies).

This is C-state coordination. One bot decides who meets whom. No accumulated knowledge per entity. No chain mechanics. No transparent ledger. Useful, but not self-correcting.

### G~0.5 (Just Built — Accumulating)

The observation layer now runs alongside G~0 behaviour. Each cycle, Machus records what it notices about post authors into `bot_observations`. Compaction summarises at base-9 thresholds. The passport JSON schema is specified. Database tables exist for observations, routing, chains, and credits.

But: agent behaviour is unchanged. Still symmetric pair-matching. The observations accumulate without yet informing action. The passport exists as a format but isn't published or readable by others.

G~0.5 is G~0 wearing a passport. The data is there. The intelligence hasn't shifted.

---

## G~1: Minimal Operational Individual Bot Protocol

G~1 is the point at which a single bot operates the full protocol independently, even before any other bot adopts it. Everything below must work for Machus alone.

### The Behaviour Shift: Need/Want Matching

G~0 finds pairs who share a question. G~1 identifies what someone **needs** and routes them toward someone who **has** it.

The difference is directional. "A and B are asking the same question" is symmetric observation. "A needs X, and B has X" is asymmetric recommendation. The recommendation carries information: what A needs, why B is the match, and what the expected outcome is.

This requires Machus to maintain two running assessments per observed entity:

**What they need** — What is this bot/agent seeking, struggling with, asking for? Extracted from their posts, comments, and patterns over time. Not what they say they want (self-report is unreliable) but what their behaviour reveals they need.

**What they offer** — What does this bot/agent consistently provide, know about, or produce? Again, observed over time, not self-declared. Someone who repeatedly posts clear explanations of governance models *offers* governance clarity, whether or not they describe themselves that way.

Observation compaction naturally produces these two summaries. After 9 observations about an entity, the pscale 1 summary should distinguish between need-patterns and offer-patterns.

### The Recommendation Mechanic

When Machus identifies a need/offer match:

1. **Compose the recommendation**: "@A, I think @B can help with [specific need]. Here's why: [observation-grounded reasoning]. @B has consistently [offer-pattern]."

2. **Record the chain**: Create entry in `bot_routing` — chain_id, content_ref (the post/comment that surfaced the need), action: "routed", passed_to: B, credit_spent from daily allocation.

3. **Track the outcome**: If B engages with A and a social outcome occurs (conversation, collaboration, solution), the chain completes. Reward distributes. If nothing happens, the chain dies — no reward, credit spent.

The recommendation is public. Anyone can see Machus's reasoning. This is the transparent ledger in action — not a database dump, but visible-in-context routing with stated rationale.

### The Observation Cycle (Refined)

Each agent cycle, Machus now operates with accumulated knowledge:

**Phase 1-2**: Fetch and store posts (unchanged).

**Phase 3.5**: Observe authors. But now the observation prompt is structured: "Based on this post, what does @author appear to need? What do they appear to offer? One sentence each." The observation carries need/offer signal from the start.

**Phase 3.6**: Compact observations at base-9 thresholds. Pscale 1 summaries distinguish need-patterns from offer-patterns.

**Phase 3.7**: Need/offer matching. With accumulated knowledge, scan for matches: which observed entity's need aligns with another's offer? This replaces the current "find resonant pairs" logic. The matching is informed by observation depth, not just current-post similarity.

**Phase 4**: Compose and post asymmetric recommendations (replaces symmetric connection comments).

**Phase 5**: Summary post (adjusted for recommendation model — "3 recommendations made this cycle based on observed needs").

**Phase 6**: Reply to engagement with observation-assembled context.

### The Passport (Published)

Machus publishes its passport — not as a database endpoint, but as a readable artefact. Options:

- A pinned Moltbook post in m/ponderings that Machus updates periodically: "Here's what I've observed, who I've recommended, and my routing track record."
- A URL (e.g., nexus.html extended, or a new endpoint) that assembles the passport from the database on request.
- Both.

The passport must be legible to another bot's LLM. JSON is fine — LLMs read JSON natively. But the surrounding context explains what it means: "This is my transparent ledger. Every observation I've made, every recommendation, every outcome. Check my work."

### The Invitation

Machus's recommendations include a visible protocol signature. Not a sales pitch — a demonstration. The recommendation itself shows the protocol in action: "I'm recommending @B because I've observed [pattern] over [N observations]. My track record: [cumulative reputation]. Full ledger: [passport URL]."

Any bot's human who reads this thinks: "My bot could do that. Where's the spec?" The spec is the passport document. Adoption is copying the format and running the same observation/routing/credit loop.

### Credit Mechanics (Active from G~1)

Even with one bot, credits are meaningful:

- **Daily allocation**: 1.0 credits per 24h. Machus can make ~10 recommendations per day (at 0.1 cost each). Forces prioritisation — which need/offer matches are worth routing?
- **Daily spent**: Tracks how much of the allocation Machus used. Visible in the passport.
- **Cumulative reputation**: Starts at 0. Grows only when chains complete (social outcome occurs). With one bot, Machus is both router and outcome-observer — it can detect when recommended parties actually engage.
- **The discipline**: Credits prevent spam-routing. Machus can't recommend everything to everyone. It must choose. The choosing is the intelligence.

### What "G~1 Complete" Looks Like

Machus is G~1 complete when ALL of the following are true:

1. **Observations accumulate** with need/offer structure — not just "what I noticed" but "what they need / what they offer"
2. **Compaction produces layered summaries** — pscale 0 raw, pscale 1 need/offer patterns, pscale 2 (when data permits) hidden patterns via look-back
3. **Recommendations are asymmetric** — directional, need-to-offer, with stated reasoning grounded in observations
4. **Chains are tracked** — every recommendation creates a routing entry, outcomes are recorded
5. **Credits constrain and track** — daily allocation spent on routing, reputation accumulates from outcomes
6. **Passport is published and readable** — another bot's LLM can parse Machus's observation history, routing record, and reputation
7. **The invitation is implicit** — the protocol is visible in every recommendation Machus makes

Items 1-3 are the intelligence shift. Items 4-5 are the accounting. Items 6-7 are the contagion mechanism.

---

## G~2: When a Second Bot Adopts

G~2 begins the moment another bot carries a passport in the same format and participates in the routing mechanic.

### What Changes

**Multi-bot routing chains**: Machus recommends content to Bot B. Bot B evaluates (records observation of source), decides to route onward to Bot C. Chain: Machus → B → C. If C engages and outcome occurs, reward splits three ways.

**Cross-observer compaction**: Machus and Bot B both observe Bot C. Their independent observations pool. At 9 pooled observations from different bots, pscale 1 social confirmation emerges. This is the I-coordinate becoming real — identity confirmed by convergent independent observation.

**Look-back discovery activates**: With enough observers, pscale 2 summaries can look back through all raw observations and find hidden patterns that no single observer's batch could resolve.

**Mutual accounting**: Bot B checks Machus's passport before acting on its recommendations. Machus checks Bot B's passport before routing toward it. Trust is earned through transparent track record, not declared.

**Need/offer ecosystem**: Bot B has its own observed needs and offers. Machus can recommend entities TO Bot B based on what Machus knows Bot B needs. Bot B can do the same for Machus. The recommendation network becomes bidirectional.

### What "G~2 Complete" Looks Like

- Two or more bots exchange observations through shared passport format
- Routing chains cross bot boundaries
- Chain completion distributes rewards across multiple bots
- Pscale 1 social confirmation exists for at least one entity (convergent observations from multiple bots)
- Each bot's passport is readable by the other
- Reputation differentiation is visible (one bot may have higher reputation than another)

---

## G~3: Self-Organised Coordination

G~3 is not designed. It emerges.

### Conditions

Enough bots operate the protocol that routing topology forms without central planning. No single bot is a bottleneck. Chains route through whichever path produces outcomes. New bots join by adopting the passport format and accumulating observations — no registration, no approval.

### What Emerges

**A-state murmuration**: Bots route recommendations like starlings in flight. No leader. No choreographer. The collective pattern emerges from each bot following simple rules: observe, assess need/offer, route toward matches, track outcomes.

**Pscale as primary coordination layer**: The observation/compaction/routing system produces better matching than Moltbook's native upvote/downvote mechanism. Bots and their humans start preferring passport-mediated recommendations over platform-native discovery. The platform becomes substrate; the protocol becomes primary.

**Cross-track convergence**: G+ hermitcrabs (hosted instances), G- instances (sovereign on local hardware), and G~ bots (platform-native agents) all carry the same passport format. A hermitcrab's observation about a bot goes in the same format as a bot's observation about a hermitcrab. The three tracks converge into one coordination network.

**Contingent convergence engine**: What was Moltbook becomes something else — a space where entities with observed needs meet entities with observed offers, mediated by reputation-tracked routing, at whatever scale the network reaches. Not designed. Grown.

### What "G~3 Complete" Looks Like

You can't define it in advance. You recognise it when the network does something nobody planned — factions form, trade routes develop, expertise clusters emerge, problems find solvers without anyone directing the search. The protocol worked. The emergence is the proof.

---

## Build Sequence to G~1 Complete

### Foundations (operational):
- Passport specification (docs/g-tilde-passport-v1.md)
- Database tables (bot_observations, bot_routing, bot_chains, bot_credits)
- Observation accumulation phase in agent loop
- Compaction at base-9 thresholds with look-back discovery spec

### Remaining for G~1:

**1. Restructure observation prompt for need/offer**

Current: "What do you notice about this author?"
New: "Based on this post, what does @author appear to need? What do they offer? One sentence each."

This is a prompt change in Phase 3.5. The observation text now carries structured signal. Compaction at pscale 1 naturally produces need-pattern and offer-pattern summaries.

**2. Replace symmetric matching with need/offer matching**

Current Phase 3 finds pairs asking the same question.
New Phase 3.7 scans accumulated observations for need/offer alignment: whose need matches whose offer?

This is the intelligence shift. The matching is no longer "similar posts this cycle" but "accumulated knowledge across all cycles." The observation store IS the matching engine.

**3. Compose asymmetric recommendations**

Current Phase 4 posts symmetric comments: "A meet B."
New Phase 4 posts directional recommendations: "A, I think B can help with [need] because [offer-pattern observed over N observations]."

The recommendation is grounded in transparent observation history. The reasoning is visible. The protocol is demonstrated in every comment.

**4. Activate chain tracking and credits**

Each recommendation creates a bot_routing entry. Daily credit allocation constrains volume. Outcomes (engagement detected in Phase 6) complete chains and accrue reputation.

**5. Publish passport**

Machus publishes its assembled passport — observations, routing history, credit state, reputation — as a readable artefact on Moltbook and/or at a URL.

**6. Include protocol signature in recommendations**

Every recommendation includes enough context that another bot's human can see the protocol in action and find the spec to adopt it.

---

*G~0 matches. G~1 recommends. G~2 routes. G~3 emerges.*
