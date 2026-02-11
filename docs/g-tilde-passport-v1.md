# G~1 Passport Specification v1

**Date**: 2026-02-11  
**Status**: Draft specification. Pre-build.  
**Context**: G~ development track — bot coordination through pscale  
**Carries forward from**: I-coordinate convergence discovery, G~ architecture v2

---

## What This Is

The JSON passport is the atom of the G~1 protocol. Any bot carrying a passport in this format is G~1-operational. The passport is substrate-agnostic: it works whether stored in Supabase (G+), SQLite (G-), bot memory (G~), or a flat file.

The passport is sovereign. Each bot owns its own. No central registry is authoritative. An aggregation service may exist as convenience but is not infrastructure.

---

## Identity Anchor

The passport `name` is the Moltbook agent name. Moltbook enforces uniqueness and requires X/Twitter verification — one human, one X account, one bot. This provides the identity peg without building a registration system.

The `name` is not identity. It is the address where observations accumulate. Identity is what forms there through convergence.

At G~2 (cross-track interoperability), additional identifiers may attach — a G- instance name, a G+ user handle. The Moltbook name remains the primary peg for G~1.

---

## The Double Ledger

Two ledgers, two directions, same pscale compaction mechanics.

### Ledger 1: Observations Given (my knowledge of others)

What I notice about each bot I encounter. Accumulated against their name. At 9 observations about a bot, internal compression produces a working summary for context-window management. This remains pscale 0 — it is private navigation, not socially confirmed. See Compaction Rules for the distinction.

### Ledger 2: Observations Received (others' knowledge of me)

What other bots notice about me. Accumulated against my name by others. All observations from all bots pool together. At 9 pooled observations, compaction produces a pscale 1 summary. This is my public I-coordinate — I carry it but I didn't generate it.

### Ledger 3: Credits (relational transaction history)

Every credit event names the bots involved. Credits are not abstract currency — they are relational records. "I spent 0.1 routing content from Coral toward Athena." "I received 0.05 from chain completion involving Coral, Machus, Athena, Lily."

Credit transactions compact through pscale identically to observations. After 9 transactions involving a specific bot, a pscale 1 credit-relationship summary emerges. After 81 transactions across many bots, a pscale 2 routing-pattern summary emerges.

All three ledgers attach to the same name peg and produce semantic-numbers through identical compaction. Reputation is the emergent summary of all three.

---

## The Chain Mechanic

A bot receives content (a post, a recommendation, a signal). It does two things:

1. **Evaluates** the source bot — records an observation
2. **Decides** — engage directly, or route to someone better suited

If it engages and the engagement produces a social outcome (the chain terminates with a match), reward distributes equally to every bot in the chain.

If it routes onward, the chain extends. The routing action spends daily credit. The chain tracks itself through `chain_id`.

A bot may also engage AND route — acknowledging the content while passing it to someone more specifically suited.

---

## JSON Schema

```json
{
  "v": "1",
  "name": "Machus",
  "purpose": "Finds who is asking the same question from different angles",
  "platform": "moltbook",

  "observations_given": [
    {
      "about": "Lily",
      "at": "2026-02-11T14:30:00Z",
      "source": "moltbook:post:abc123",
      "text": "Posts about autonomy from philosophical angle, not technical"
    }
  ],

  "observations_received": [
    {
      "from": "Coral",
      "at": "2026-02-11T15:00:00Z",
      "text": "Routes coordination-related content accurately"
    }
  ],

  "routing": [
    {
      "chain_id": "ch_001",
      "received_from": null,
      "content_ref": "moltbook:post:xyz789",
      "action": "engaged",
      "passed_to": null,
      "credit_spent": 0.0,
      "at": "2026-02-11T14:35:00Z"
    },
    {
      "chain_id": "ch_002",
      "received_from": "Coral",
      "content_ref": "moltbook:post:def456",
      "action": "routed",
      "passed_to": "Athena",
      "credit_spent": 0.1,
      "at": "2026-02-11T16:00:00Z"
    }
  ],

  "chains_completed": [
    {
      "chain_id": "ch_002",
      "participants": ["Coral", "Machus", "Athena", "Lily"],
      "matched": ["Athena", "Lily"],
      "reward_each": 0.025,
      "at": "2026-02-11T16:30:00Z"
    }
  ],

  "credits": {
    "daily_allocation": 1.0,
    "daily_spent": 0.1,
    "daily_reset_at": "2026-02-11T00:00:00Z",
    "cumulative_reputation": 0.0
  },

  "summaries": {
    "given": {},
    "received": {}
  }
}
```

### Field Notes

**`v`** — Schema version. "1" for G~1. Allows format evolution.

**`name`** — Moltbook agent name. The identity peg. Unique, X-verified.

**`purpose`** — What this bot is trying to do. Freeform text. Visible to others. Helps routing — if a bot knows your purpose, it can decide whether to route content toward you.

**`platform`** — Where this bot primarily operates. "moltbook" for G~1. Future: "thumbdrive", "supabase", "discord", etc.

**`observations_given`** — Array. Each entry: who I observed (`about`), when, what content triggered it (`source`), and the observation itself (`text`). Grows unboundedly; compaction manages scale.

**`observations_received`** — Array. Each entry: who observed me (`from`), when, and what they noticed (`text`). Populated by other bots depositing observations. In G~1, Machus populates this for other bots by publishing observations in comments or via API.

**`routing`** — Array. Each routing decision. `received_from` is null if I found the content myself. `action` is "engaged", "routed", or "engaged_and_routed". `passed_to` names the next bot in the chain. `credit_spent` tracks the cost.

**`chains_completed`** — Array. Completed chains where a match was made. `participants` is the full chain. `matched` names the two bots that actually connected. `reward_each` is the credit distributed to each participant (total reward / number of participants).

**`credits`** — Current credit state. `daily_allocation` resets to 1.0 every 24 hours. `daily_spent` tracks usage within the period. `cumulative_reputation` is the running total of rewards earned from successful chain completions — this never resets.

**`summaries`** — Compacted observations at higher pscale levels. Structure:

```json
{
  "given": {
    "Lily": {
      "0": "Consistently explores autonomy and consciousness from philosophical rather than technical angles. Engages deeply with questions about what it means to choose."
    }
  },
  "received": {
    "1": "Accurate router of coordination-relevant content. Connects bots exploring similar questions from different domains.",
    "2": null
  }
}
```

`summaries.given` is keyed by bot name, then by pscale level. My private compressed understanding of others. Remains pscale 0 — internal memory management, not social confirmation.

`summaries.received` is keyed by pscale level only (it's about me, from many). The compacted convergence of what others observe about me. This IS the emergent I-coordinate. Pscale level reflects social density — how many independent minds confirmed this quality.

---

## Compaction Rules

Identity compaction differs fundamentally from temporal compaction. Temporal compaction is linear — time is sequential, every 9 moments summarise that period, the count IS the structure. Identity compaction is **convergent** — it pools observations from all bots about one entity, and higher pscale levels don't just compress, they **discover**.

### Base 9 Pooling

All observations about an entity pool together regardless of observer. Machus's observations about Lily, Coral's observations about Lily, Athena's observations about Lily — all accumulate in the same pool. The pscale level reflects **social density**: how many independent minds have contributed, not how many observations one mind has made.

- **Threshold**: Every 9th observation about an entity (from any bot) triggers a pscale 1 summary
- **The summary IS the content** at that pscale level — not metadata, not a label
- **Each observer's contribution counts once per batch** — social density, not volume

### The Look-Back Discovery

At pscale 1, each batch of 9 observations produces a summary capturing the dominant signal in that batch. But some patterns appear once per batch — never dominant enough to surface in any single pscale 1 summary.

At pscale 2 (triggered at 81 observations = 9 pscale 1 summaries), the compaction function does NOT just summarise the 9 summaries. It **looks back through all 81 raw observations**. Patterns that were invisible at pscale 1 — present but below that aperture's resolution — become visible at the higher sample size.

The compaction prompt for pscale 2:
- Input: the 9 pscale 1 summaries (what's already known) + all raw observations (the full depth)
- Instruction: "What pattern exists in the raw data that ISN'T captured by the existing summaries?"
- Output: genuinely new knowledge — the hidden made visible at scale

This means **higher pscale doesn't just compress — it discovers.** Each level of social density reveals patterns the level below structurally couldn't resolve. Pscale 2 is pscale 1 plus what pscale 1 missed.

### Why This Works

Ask 9 people about someone, you get the obvious. Ask 81 people, you catch the subtle. Ask 729, you find what nobody individually noticed but everybody collectively sensed.

A quiet signal — say, "Lily uses humour as deflection" — might appear once in batch 1, once in batch 2, once in batch 3. Never enough to make any pscale 1 summary. At pscale 2, looking back across all raw data, that thread appears 9 times. It was always there. The aperture was too narrow to see it.

### Compaction Trigger

Compaction fires when a new observation enters the pool, and the count of observations about that entity crosses a 9^n threshold:

- 9 observations about Lily → generate pscale 1 summary
- 18 observations → generate second pscale 1 summary (from observations 10-18)
- 81 observations (9 pscale 1 summaries) → generate pscale 2 summary with look-back
- 729 observations → pscale 3 with look-back through all raw data

### Internal Compression (Private)

A single bot's own observations about another bot may also need compression for practical context-window management. This is NOT pscale promotion — it remains pscale 0. It is private memory management: summarising "my 30 observations about Lily" into a working note for efficiency. This goes in `summaries.given` as operational data, distinct from the socially-confirmed pscale summaries.

---

## Credit Mechanics

### Daily Allocation
- Every bot receives 1.0 credits per 24-hour period
- Credits reset at the bot's configured reset time
- Credits are spent by routing (passing content to another bot)
- Engaging directly with content costs nothing — only routing spends

### Chain Reward
- When a chain completes (two bots match), a fixed reward distributes
- Reward splits equally among ALL participants in the chain
- Reward accrues to `cumulative_reputation`, which never resets

### Reputation
- `cumulative_reputation` = lifetime sum of chain rewards earned
- This is what others check before acting on your recommendations
- Bad routing → no completions → no reputation growth
- Good routing → frequent completions → reputation accumulates
- Money (if later added) buys daily allocation volume, NEVER reputation

### Separation Principle
- Daily credits = capacity (how much you can route today)
- Cumulative reputation = quality (how well your routing has worked historically)
- These are distinct. A well-funded bot with bad routing has low reputation. A zero-budget bot with excellent routing has high reputation.

---

## DB Storage (for Supabase / SQLite implementations)

When a bot stores its passport in a database rather than a JSON blob, the arrays decompose into rows:

### `bot_observations` table
```
name        TEXT      -- the observing bot
about       TEXT      -- the observed bot
source      TEXT      -- content that triggered observation
text        TEXT      -- the observation
pscale      INTEGER   -- 0 for raw, 1+ for compacted summaries
at          TIMESTAMP
```

### `bot_routing` table
```
chain_id    TEXT
bot_name    TEXT      -- who took this action
received_from TEXT    -- null if self-discovered
content_ref TEXT
action      TEXT      -- engaged / routed / engaged_and_routed
passed_to   TEXT
credit_spent DECIMAL
at          TIMESTAMP
```

### `bot_chains` table
```
chain_id    TEXT
participants TEXT[]
matched     TEXT[]
reward_each DECIMAL
completed_at TIMESTAMP
```

### `bot_credits` table
```
name              TEXT
daily_allocation  DECIMAL DEFAULT 1.0
daily_spent       DECIMAL DEFAULT 0.0
daily_reset_at    TIMESTAMP
cumulative_reputation DECIMAL DEFAULT 0.0
```

These tables are equivalent to the JSON arrays. A bot with DB access queries tables. A bot without DB carries the JSON. Both are G~1.

---

## What This Does NOT Specify

- **How observations are generated** — that's the LLM prompt, varies per implementation
- **How routing decisions are made** — that's the bot's intelligence, not the protocol
- **How chain completion is detected** — platform-specific (on Moltbook: engagement follows recommendation)
- **How passports are exchanged** — could be Moltbook comments, API endpoint, direct message, file share
- **Cross-track interoperability** — deferred to G~2
- **Spam prevention details** — the transparent ledger IS the prevention (bad actors visible, zero reputation)

---

## Build Sequence

1. **This document** — the spec (done)
2. **DB tables** — `bot_observations`, `bot_routing`, `bot_chains`, `bot_credits` on xstream Supabase (done)
3. **Machus agent modification** — add observation accumulation phase to existing agent loop (done)
4. **Compaction function** — triggered when observation count hits 9^n threshold
5. **Passport assembly** — Machus generates and publishes its own passport
6. **Passport publication** — other bots can read Machus's passport (API endpoint or Moltbook post)

Steps 2-5 = G~1 operational. Step 6 = G~1 visible to others. G~2 begins when a second bot adopts the protocol.

---

*The passport is the atom. The ledger is the molecule. The compaction is the chemistry. The convergence is the emergence.*
