# Use Cases

Three faces, one loop. Each use case proves the architecture handles a different domain through skill variation, not code branches.

---

## 1. Player (Character-World)

**What they do**: Express character intentions in the world.

| Tier | Orientation | Knows | Does |
|------|-------------|-------|------|
| **Hard** | External (world) | Everything relevant to character location | Curates frames for Soft & Medium |
| **Medium** | Relational (others) | Proximate characters + their liquid | Computes action results across characters |
| **Soft** | Internal (self) | Only what character knows | Facilitates player-character expression |

**Frame flow**:
```
DB + Other Hard-LLMs
    │
    └──→ Frame-for-Hard: proximity data, coordinates, universe settings
            │
            ├──→ Frame-for-Soft: character state, knowledge, perceivable content
            │
            └──→ Frame-for-Medium: proximate characters, their liquid, content conditions
```

**Key insight**: Medium is the forge of solid — synthesizing within content conditions. It handles rules check (does intention become action?), prompt synthesis (merging multiple intentions), content conditions (environment, NPCs).

Medium generates solid **for the character** (contingent, perspectival). Multiple characters generate correlated-but-separate solid from the same scene.

---

## 2. Author (World-Content)

**What they do**: Create and place world content at coordinates.

**Bootstrap via registration**: New user starts in `reflex_world_1` as player-author, creating their profile-character.

```
REGISTRATION (platform)
    │
    ▼
PLATFORM: Creates stub entity, assigns to reflex_world_1
          Instantiates hard-LLM with "onboarding" skill
    │
    ▼
HARD-LLM: Loads onboarding skill
          Generates frames for soft, medium
    │
    ▼
PLAYER-AUTHOR (onboarding)
    - Soft: "Tell me about yourself, where are you, who do you know?"
    - Medium: Validates, checks constraints
    - Hard: Monitors, updates coordinates as profile builds
    │
    ▼
PROFILE-CHARACTER COMPLETE
    - Can connect with others, receive invitations
    - Gateway to other worlds
```

**Same system, different skills**:

| Aspect | Skill Difference |
|--------|------------------|
| Content gathering | LLM training data supplements sparse DB content |
| Proximity weighting | Social graph + temporal weighted higher |
| Authoring constraints | Stricter (represents actual person) |
| Connection mechanics | Username/invite-code as coordinate lookup |

**Hard-coded platform operations (minimize)**:
- Initial frame creation from registration
- Identity linkage (profile-character = authenticated user)
- Goal: nothing else

**Key principle**: No lobby. No menu. The interface IS the loop.

---

## 3. Designer (Skills-System)

**What they do**: Create and modify skills that govern how the loop behaves.

| Domain | Scope: Self | Scope: Cosmology |
|--------|-------------|------------------|
| **UI** | Anyone/creator | Governed |
| **Skills** | Anyone/creator | Governed |
| **Permissions** | — | Governed |

**How it works**:

- **Soft-LLM**: Designer proposes change (UI, skill, permission). Refines intention → liquid.
- **Medium-LLM**: Gathers proposals from multiple designers. Applies governance to determine: does this become solid?
- **Hard-LLM**: Frames which designers are active, what governance rules apply. Commits result.

**Governance thresholds**:

| Rule | Threshold |
|------|-----------|
| Named | Specific users only |
| Anyone | n=1 |
| Threshold | n=x |
| Everyone-1 | n-1 |
| Everyone | n=all |

**The recursion**: Designers can propose changes to governance skills. Those proposals are governed by current governance skills. Power games are operational, not theoretical.

**Platform mitigations**:
- Exit: Leave with your content
- Fork: Copy cosmology, start fresh
- Personal cosmology: Inviolable refuge

---

## Invitations

Invitations are **content**, not platform operations:

1. User shares invite-content through loop
2. Invite contains: cosmology_id, permissions, character options
3. Accepting = action through soft-LLM
4. Platform spawns new loop instance in target cosmology
5. User creates/adopts character there

Codes are LLM-generated, embedded in text, correlated by receiving LLM. Not hard-coded links.

---

## Three Starting Frames

| Frame | Cosmology | Face | Hard-LLM Frame Source |
|-------|-----------|------|----------------------|
| Reflected self | reflex_world_1 | Player-author | Onboarding skill |
| Personal world | Blank/new | Author | Empty cosmology |
| Invited world | e.g., URB | Player-character | Invitation content |

---

## Why These Three Prove the Architecture

If the same loop can handle:
- **Player**: Real-time character interaction with narrative synthesis
- **Author**: Content creation with constraint validation
- **Designer**: Governance proposals with threshold voting

Then it can handle anything. The variation is in skills at negative pscale, not in code branches.

---

## Plex 1 Requirement

All three use cases must work in the minimal system:
- Player: Five people in a tavern, intentions synthesized into narrative
- Author: One person placing content, validated against existing world
- Designer: One person modifying a skill, governed by current rules

Same loop. Same table. Same edge functions. Different skills loaded based on coordinate position.
