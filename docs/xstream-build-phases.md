# Xstream Build Phases: Reversed Development Sequence

**Version**: 0.1
**Date**: January 2025
**Purpose**: Specification for Claude Code implementation

---

## Overview

Traditional build: Game mechanics → User systems → Adaptive interface
**Xstream build**: Adaptive interface → User identity → Game mechanics

This inversion follows from pscale's core insight: if coordinates carry meaning, the system that reads coordinates can generate what it needs. The LLM builds the site as we develop the tool for LLM to "find itself" in psycho-social reality.

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

**Why F Before E**: LLM trained on real-world data can be accurate without authored input. Fantasy (E) requires author-created content or produces generic output.

**Success Criteria**: User has pscale identity (T, S, I coordinates) and understands their position in the system.

---

### Phase 3.5: Interface Refinement

**What**: We (David + Claude instances) improve the interface based on Phase 3 usage

**Purpose**:
- Prepare UI for multi-player engagement (Phase 4)
- Refine skill documents based on real interaction
- Optimize the loop for the game use case

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
- F (real world identity) enables group coordination
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

Current branch: `feature/new-ui`
All commits specify branch explicitly.

---

*Document status: Living specification - updates as phases complete*
