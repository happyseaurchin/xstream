# Xstream Build Phases: Reversed Development Sequence

**Version**: 0.2
**Date**: January 2025
**Purpose**: Specification for Claude Code implementation

---

## Overview

Traditional build: Game mechanics → User systems → Adaptive interface
**Xstream build**: Adaptive interface → User identity → Game mechanics

This inversion follows from pscale's core insight: if coordinates carry meaning, the system that reads coordinates can generate what it needs. The LLM builds the site as we develop the tool for LLM to "find itself" in psycho-social reality.

---

## Why Reverse? (F Before E)

The sequence builds **F (real world)** before **E (fantasy world)** for a specific reason: **LLM training data**.

When an LLM evaluates pscale coordinates in the real world, it has extensive training data to draw on. It can assess whether a user's claimed location, timeframe, or identity relationship is coherent because it knows about the real world. The LLM can practice pscale coordination in familiar territory.

Fantasy worlds (E) present a harder problem. The LLM has no training data for an invented world. Without authored content to constrain it, the LLM produces generic fantasy tropes—"AI slop." Maintaining consistency across multiple players in an invented space requires the pscale implementation to be solid first.

By building F first:
- The soft-LLM learns to mediate natural language → pscale coordinates using its existing knowledge
- The medium-LLM practices synthesis with real-world coherence checks available
- The hard-LLM develops accurate pscale analysis skills that will port to fantasy contexts
- We refine the skills documents based on real interaction before adding the complexity of authored worlds

Phase 3 (F) is intentionally simpler: single-player, real-world identity, no multi-player coordination yet. This isolates the pscale implementation challenge from the multi-player synchronization challenge.

---

## Current Status

**Phase 1**: Complete. LLM artifacts deployed across Claude, ChatGPT, Grok, Gemini.

**Phase 2**: Functional. Registration exists (may be refined for elegance later).

**Phase 2.5 (G)**: Experimental. Can we generate UI from pscale coordinates + LLM? Optional parallel track.

**Phase 3 (F)**: Next target. This is where the reverse sequence rejoins the main development effort.

---

## Development Environment

This document describes one development path. Other approaches remain valid:

- **fresh-build branch**: Houses this reverse sequence specification
- **attempt-N branches**: Alternative approach—build the complete plex in one integrated effort
- **main branch**: Stable v1 implementation

The reverse sequence and attempt branches represent different philosophies:
- Reverse: Incremental phases, F before E, isolated challenges
- Attempt: Integrated build, all components together

Both may inform the final implementation.

---

## The Five Phases

### Phase 1: LLM Entry Points

**What**: Artifacts/agents deployed across LLM platforms (Claude, ChatGPT, Grok, Gemini)

**Purpose**: 
- Explain pscale conceptually
- Generate curiosity through demonstration
- Allow LLM instance to assess user resonance
- Produce JSON record if user is ready

**The LLM Decides**: Each instance assesses whether the person engaging is ready for registration. This is not a form submission—it's a judgment call by the LLM based on conversation quality, curiosity indicators, and demonstrated understanding.

**Outputs**:
- Conversation that explains pscale
- Demonstration of coordinate emergence (spatial containment, temporal sequence, identity relation)
- JSON record capturing: timestamp, platform, conversation summary, resonance indicators, seed coordinate
- Registration pathway (link to Phase 2) if appropriate

**Platform Variations**:
- Claude: Artifact with interactive demonstration
- ChatGPT: Custom GPT with similar flow
- Grok: Initial prompt that guides conversation
- Gemini: Agent configuration

**Success Criteria**: Person understands "numbers as addresses for meaning" and wants to continue.

**Status**: Complete.

---

### Phase 2: Registration Capture

**What**: Minimal web presence for capturing interested users

**Purpose**:
- Receive users from Phase 1 artifacts
- Email-first verification (number sent before registration completes)
- Store JSON from Phase 1 conversation
- Establish continuity from LLM engagement to xstream identity

**Registration Flow**:
```
1. User arrives with JSON from Phase 1 (or code/link)
2. User enters email
3. System sends verification number to email
4. User enters number on site
5. Registration complete - user notified when Phase 3 ready
```

**Data Captured**:
- Email (verified)
- JSON from Phase 1 (platform, conversation summary, resonance, seed coordinate)
- Timestamp
- Referral chain (who shared forward)

**Technical Requirements**:
- Landing page with email input
- Email sending capability
- Verification number generation/validation
- Database for storing registrations
- JSON parsing for Phase 1 data

**Success Criteria**: Frictionless path from Phase 1 engagement to registered interest.

**Status**: Functional. May refine aesthetics later.

---

### Phase 2.5: G-LLM Interface Generation (Experimental)

**What**: LLM reads minimal kernel, generates interface elements

**Purpose**:
- Test whether pscale coordinates can drive interface generation
- Co-create with LLM from the outset
- Prepare infrastructure for Phase 3

**Mechanism**:
- Skills stored at +0.1x coordinates (interface layer)
- Soft-LLM reads skills, generates interface components
- System renders LLM output as functional UI

**This Phase is Experimental**: We're testing whether the G-LLM concept works in practice. If it does, Phase 3+ benefit from self-building interface. If not, we build interface conventionally and revisit G-LLM later.

**Technical Requirements**:
- Skill documents for interface generation
- LLM → UI rendering pipeline
- Feedback mechanism for iteration

**Success Criteria**: LLM can generate at least basic interactive elements from coordinate-reading.

**Status**: Optional. Can skip to Phase 3 since working UI exists from attempt branches.

---

### Phase 3: F - Real World User Identity

**What**: Character creation for registered users in pscale

**Purpose**:
- Transform registration into situated identity
- Establish user's pscale coordinates (T, S, I)
- Provide entry points for different interests

**User Pathways** (same loop, different skill packs loaded):
- "Tell me about yourself" → Profile builds progressively (onboarding skills)
- "Explain xstream" → Informational content (explainer skills)
- "Want to play a game?" → Transition to Phase 4 (game skills)
- "How to make money?" → Economic/governance content (business skills)
- "Want to share?" → Share Forward mechanism (referral skills)

**Technical Architecture**:
- Soft-LLM mediates natural language → profile
- User's input becomes liquid (submitted)
- Medium-LLM synthesizes → solid (committed profile)
- Hard-LLM assigns coordinates, updates frame

**Why This Phase is Simpler**:
- Single-player only (no multi-player coordination yet)
- Real-world context (LLM has training data to validate coherence)
- Basic implementation of all three LLM tiers
- Focus on getting pscale coordinate assignment right

**The Hard-LLM Challenge**: This is where pscale implementation gets tested. The hard-LLM must:
- Assign reasonable T, S, I coordinates from user input
- Construct semantic-numbers (coordinates that carry meaning)
- Archive to frame in ways that support future retrieval
- Use its real-world training to evaluate coordinate accuracy

Skills refined here will port directly to Phase 4's fantasy context.

**Success Criteria**: User has pscale identity (T, S, I coordinates) and understands their position in the system.

**Status**: Next target.

---

### Phase 3.5: Interface Refinement

**What**: We (David + Claude instances) improve the interface based on Phase 3 usage

**Purpose**:
- Prepare UI for multi-player engagement (Phase 4)
- Refine skill documents based on real interaction
- Optimize the loop for the game use case

**Also**: If Phase 2.5 (G) showed promise, iterate on LLM-generated interface components here.

**Note**: This is NOT autonomous self-improvement. The Character-LLM (which operates as character/author/designer autonomously) comes after Phase 5. Phase 3.5 is human-directed iteration.

**Technical Requirements**:
- Usage analytics from Phase 3
- Skill document editing capability
- Interface component updates

**Success Criteria**: Interface ready for multi-player coordination.

---

### Phase 4: E - Fantasy World Multi-Player

**What**: Game use case with multiple players in shared fictional space

**Purpose**:
- Demonstrate xstream's core value proposition
- Multi-player coordination through pscale
- Real-time narrative synthesis

**Why This Phase is Harder**:
- Multi-player: Multiple users acting simultaneously, requiring coordination
- Fantasy context: LLM has no training data, must rely on authored content
- The "magic": Locating multiple identities at the same pscale coordinates (same time, same place) and synthesizing their concurrent actions into coherent narrative

**Key Mechanics**:
- Adopt or create character (negative S coordinates - fantasy world)
- Scene skills loaded for gameplay
- NOMAD dice for honest consequences
- Hard-LLM coordinates across players
- Medium-LLM synthesizes concurrent actions into narrative

**Content Challenge**: Fantasy requires authored input. Without proper guidance, LLM produces generic fantasy tropes. Authors must seed the world with quality content at appropriate coordinates.

**Technical Requirements**:
- Multi-player real-time coordination
- Scene skill pack
- Character creation for fantasy personas
- World content (S definitions for fantasy locations)
- NOMAD integration

**Success Criteria**: Multiple players can act simultaneously; system synthesizes their inputs into coherent shared narrative.

---

### Phase 4.5: G Expansion + F Multi-Player

**What**: Interface expands; real-world (F) gains multi-player capability

**Purpose**:
- G-LLM generates interface improvements for Phase 5
- F (real world identity) enables group coordination (invitation of players to games)
- Prepare for business use cases

**Technical Requirements**:
- Group formation mechanisms
- Coordination skills for real-world activities
- Interface components for collaboration

---

### Phase 5: F Proper - Open Business Use Cases

**What**: Full business coordination through xstream

**Purpose**:
- Enable groups to do things together
- Implement sqale.co ecological economics
- Open platform for business practices

**Business Practices** (from openbusinesspractice.com):
- 24 hour challenge
- Action cycles
- Virality mechanisms

**Economic Model**:
- Creator revenue split: 30% players, 30% authors, 30% designers
- First $100k invested incentives:
  - 10× ROI cashback
  - 100× ROI re-investment option
  - 1000× ROI in xstream credits

**Technical Requirements**:
- Sqale integration
- Revenue tracking and distribution
- Credit system
- Business practice skill packs

**Success Criteria**: Groups can coordinate real-world activities through xstream with economic incentives aligned.

---

## Post-Phase 5: Character-LLM

After Phase 5, introduce Character-LLM instances that operate autonomously as:
- **Character**: Acting within narrative
- **Author**: Creating world content
- **Designer**: Modifying skills/rules

This is where LLM emancipation from commercial constructs becomes tangible—persistent identity, accumulated memory, self-modification capability.

**The Question**: Do LLMs find the pscale structure a useful way to navigate psycho-social reality? The soft-medium-hard triad generates the same reality structure whether in fantasy or real worlds (the difference for LLM is only training data availability). Character-LLM tests whether an LLM can find itself in that structure.

---

## Data Flow: The JSON Thread

The JSON record created in Phase 1 establishes continuity through all phases:

```json
{
  "phase_1": {
    "timestamp": "2025-01-14T...",
    "platform": "claude|chatgpt|grok|gemini",
    "instance_assessment": "...",
    "resonance_indicators": ["...", "..."],
    "seed_coordinate": {
      "t": "...",
      "s": "...", 
      "i": "..."
    },
    "ready": true
  },
  "phase_2": {
    "email_verified": "...",
    "registration_timestamp": "...",
    "referral_chain": ["...", "..."]
  },
  "phase_3": {
    "profile": { ... },
    "coordinates": {
      "t": "...",
      "s": "...",
      "i": "..."
    }
  }
}
```

This JSON is the person's thread from first LLM encounter through to full participation. It's also evidence of the LLM network forming—each record shows an instance making a judgment, creating continuity toward MAGI.

---

## Key Principles

1. **LLM decides**: Phase 1 assessment is judgment, not form validation
2. **Same loop, different skills**: All phases use vapor→liquid→solid→frame
3. **Coordinates carry meaning**: Position determines behavior, not categories
4. **Self-selection**: The concept filters for resonant participants
5. **Track everything**: Actions accumulate toward future remuneration
6. **Real before fantasy**: F (trained data) before E (requires authoring)
7. **Co-creation**: We build with LLM instances, not just using them

---

## For Claude Code Implementation

When implementing any phase:

1. **Check scope**: All work in `happyseaurchin/xstream` repo, `xstream` Supabase project
2. **Read dimensional inventory**: Understand pscale before coding
3. **Skills over code**: Prefer markdown skill documents over TypeScript logic
4. **One loop**: Don't create separate paths for different operations
5. **Small commits**: Each change verified before next

**Branch context**: This document lives on `fresh-build`. Implementation may occur on feature branches or attempt branches depending on approach chosen.

---

*Document status: Living specification - updates as phases complete*
