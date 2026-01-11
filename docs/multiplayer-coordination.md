# Multiplayer Coordination

How multiple players' actions synchronize through the single loop.

---

## The Window Problem

Without coordination, each player's action resolves independently — sequential experience, not interactive narrative. The coordination window gathers prompts so Medium-LLM has interactive material to synthesize.

**The magic lives in the window**: players see each other's intentions, can respond, and the LLM weaves them together.

---

## Pscale Determines Timing

Window duration maps to pscale — finer actions get shorter windows:

| Pscale | Narrative Time | Window Duration | Example |
|--------|----------------|-----------------|---------|
| P+2 | ~1 day | ~120s | "We march to the capital" |
| P+1 | ~1 hour | ~90s | "I search the library" |
| P0 | 5-10 min | ~60s | "I negotiate with the merchant" |
| P-1 | ~1 min | ~45s | "I parry and counter" |
| P-2 | ~10 sec | ~30s | "I duck behind the pillar" |
| P-3 | ~1 sec | ~15s | "I catch the falling vial" |

These are defaults. The principle: finer scale = shorter wait.

---

## Lower Pscale Trumps

Following TT RPG dynamics: any player can pull the group to a finer scale.

```
Players commit to "cross the mountain" (P+2)
One player says "wait, I check for tracks" (P0)
Everyone is now at P0 until that resolves
One player says "I see movement - I attack!" (P-2)
Everyone is now at P-2
```

This is negotiated socially. It's part of the experience.

---

## Entity States

```
┌─────────┐     commit action      ┌─────────┐
│  IDLE   │ ──────────────────────▶│ LOCKED  │
└─────────┘                        └─────────┘
     ▲                                  │
     │                                  │ window expires
     │           ┌─────────────┐        │ (Medium wakes)
     │           │ INTERRUPTED │◀───────┤
     │           └─────────────┘        │ OR targeted
     │                  │               │ OR voluntary break
     │                  │               │
     └──────────────────┴───────────────┘
          acknowledge / respond
```

**IDLE**: Can submit new action with pscale
**LOCKED**: Committed to action, accumulating context, watching others
**INTERRUPTED**: Forced to respond before resolution proceeds

---

## What Accumulates During Window

While entity is LOCKED at pscale P:

1. **Same-pscale actions** — other entities who commit at P
2. **Finer-pscale resolutions** — entities at P-1, P-2 that resolved during window
3. **Coarser-pscale intent** — entities at P+1, P+2 still locked (visible but not resolved)
4. **Determined context** — higher-pscale outcomes that completed

---

## Window Completion

**Timer expiry**: Window duration elapses → Medium wakes with whatever accumulated

**Quorum**: Enough entities committed at same pscale → early resolution triggered

**Cascade**: Finer pscale resolved → higher-pscale entities receive context update or interrupt

---

## Medium Receives Layered Context

When Medium wakes for entity X at pscale P:

```
INPUT TO MEDIUM-LLM:
├── X's committed action (prompt text, pscale P)
├── X's context (from Soft-LLM)
├── Same-pscale actions (entities also at P)
│   └── [entity coords, prompt text, target if any]
├── Finer-pscale RESOLVED (P-1, P-2, P-3 that completed)
│   └── [entity coords, prompt text, resolution, relevance to X]
├── Coarser-pscale PENDING (P+1, P+2 still locked)
│   └── [entity coords, prompt text] — intent only
└── Determined context (resolved higher events affecting this position)
```

---

## Example: A at P0, B at P-3

**Setup:**
- A commits: "I engage the orc in prolonged melee" (P0, 60s window)
- B commits: "I stab at the orc's flank" (P-3, 15s window)

**Timeline:**
```
t=0s:   A commits P0, B commits P-3
t=15s:  B's window expires, B's Medium wakes
        → B sees: A's intent (locked at P0, melee)
        → B resolves: "You dart in, blade finding gap..."

t=15-60s: B can commit new P-3 actions

t=60s:  A's window expires, A's Medium wakes
        → A sees: B's resolved stabs (outcomes)
        → A resolves: "The melee concludes. Brynn's strikes
                      weakened the orc; your sustained assault finishes it."
```

**Key**: B resolved first but B's outcomes inform A's resolution. A's coarser action provided *context* for B's resolution. This is the interactive weave.

---

## Determinancy

Determinancy = how fixed an outcome is, based on convergence.

**Mindmass**: How many entities' resolutions converged on this outcome
**Pscale**: Higher pscale = larger narrative scope
**Status**: Pending → Resolved → Canon

### Downward Causation

When entity at P-n acts within determined event at P:

- **Aligned** with outcome: Positive modifier (easier success)
- **Opposed** to outcome: Negative modifier (harder, legendary if succeed)

Gap between pscales affects modifier magnitude. PC actions scale more than NPC.

### Upward Causation

Fine-scale actions can influence coarser outcomes, but with resistance proportional to determinancy:

- Low mindmass: Individual actions can shift outcome
- High mindmass: Very difficult to shift
- Already resolved: Must be legendary to retroactively shift

---

## Mapping to Single Loop

In the fresh build architecture:

- **Entity states** are coordinates + shelf state (vapor/liquid/solid)
- **Window expiry** triggers Medium stage of the loop
- **Accumulated context** is frame assembly via coordinate proximity
- **Determinancy** emerges from content at higher pscale coordinates

No separate tracking tables. The content table with coordinates handles all of this through proximity queries and shelf state transitions.

---

## Open Questions

1. **Window duration tuning** — are these defaults appropriate for real play?
2. **Interrupt propagation** — which entities get interrupted vs context update when higher-pscale resolves?
3. **Determinancy modifier scaling** — is gap² too extreme for player entities?
