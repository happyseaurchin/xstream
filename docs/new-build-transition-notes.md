# New Build Transition Notes

## Document Purpose

This document consolidates architectural decisions, porting requirements, and extension specifications for the new Xstream UI build (Phase 0.11, `feature/new-ui` branch). It serves as the reference for Claude to frame work correctly from the beginning.

---

## Part 1: Pscale Spatial Coordinate Structure — Worlds vs Real

### The Distinction Mechanism

The pscale coordinate system distinguishes between **reflection** (real world) and **refraction** (fantasy/imagined worlds) through structural presence, not explicit flags.

#### Scale Hierarchy

| Pscale | Scope | Example |
|--------|-------|---------|
| 2 | Building/block | A specific house |
| 5-6 | Region/country | Wales |
| 10 | World | Middle Earth = digit 1 at 10^10 position |
| 11 | Universe | Collection of worlds |
| 12+ | Multiverse | Multiple universes |

#### Reflection (Real World) Coordinates

- **No pscale-10+ prefix required**
- Coordinates are "grounded" — assumed real by default
- KDU, Wales → `600100` (pscale 6 region, nested down to building)
- The **absence** of world-ID signals: "this is actual reality"

**Example**: Person in KDU, Wales
```
Spatial: 600,100.00
         ↑ Wales (P-Scale 6)
           ↑ Local area coordinates descending to room
```

#### Refraction (Fantasy) Coordinates

- **Requires world-ID at pscale 10**
- Each imagined world gets a unique digit at position 10^10
- Middle Earth = `1` at position 10
- Hobbiton in Middle Earth → `10,000,000,000 + 600,100`

**Example**: Hobbit in Hobbiton, Middle Earth
```
Spatial: 10,000,600,100.00
         ↑ Middle Earth (1 at P-Scale 10)
              ↑ The Shire region
                 ↑ Hobbiton
```

#### The Structural Semantic

| Coordinate Structure | Interpretation |
|---------------------|----------------|
| `600,100` | Real world location (no world prefix) |
| `10,000,600,100` | Fantasy world #1, location mirroring real structure |
| `20,000,600,100` | Fantasy world #2, different universe |

**Principle**: The coordinate structure itself carries the semantic — real world coordinates are "grounded," fantasy coordinates are "situated" in a named world. No separate flag or negative/positive notation needed.

---

## Part 2: UI Changes — vapor-ui → new-ui Branch

### Change 1: Text Entry Relocation

**Before (vapor-ui)**:
- Text entry area in vapor zone of column
- Direct typing into vapor space

**After (new-ui)**:
- Text entry inside Construction Button panel
- Construction button has 2 panels (cycles between them)
- Button is associated with the focused column
- Supports which vapor stream text enters

**Implication**: The button becomes the primary input mechanism, not the column itself.

### Change 2: Directory Access

**Before (vapor-ui)**:
- Directory accessible in vapor area
- Part of the streaming content view

**After (new-ui)**:
- Directory in **solid area** (not vapor)
- New **book icon** button in UI
- Opens a **drawer sliding down from top**
- Shows directory/navigation content
- Clearly separates navigation (solid) from creation (vapor)

### Change 3: Face → Focus Terminology

**Before**:
- Explicit "face" labels: Player, Author, Designer
- UI shows which face is active

**After**:
- Focus-based, determined by pscale coordinates
- No explicit face categories in UI
- **Title in top bar** derived from frame (Hard-LLM provides)
- Focus title replaces face label

| Old (Face) | New (Focus On) | Determined By |
|------------|----------------|---------------|
| Player | Character | pscale identity coordinates |
| Author | Content/World | pscale spatial coordinates (refraction) |
| Designer | Code/Skills | pscale meta-coordinates (negative) |

**Principle**: The face is implicit in what you're focused on. The coordinates determine the mode.

---

## Part 3: Shelf Methods — Vapor, Liquid, Solid

### Method Summary

| Shelf State | Method | Status |
|-------------|--------|--------|
| **Vapor** | Real-time streaming | **TO PORT** from vapor-ui |
| **Liquid** | Save to database | Already implemented |
| **Solid** | Save to database | Already implemented |

### Vapor Method (Porting Required)

The vapor-ui branch contains an efficient real-time method for vapor state that should be preserved. Key characteristics:
- Real-time character-by-character or chunk streaming
- WebSocket or Supabase realtime subscription
- Ephemeral (not persisted until transition to liquid)
- Visible to others in same focus/column

### Liquid Method (Implemented)

- User submits vapor content → becomes liquid
- Saved to database with `shelf_state: 'liquid'`
- Awaits Medium-LLM synthesis
- May be modified before solidification

### Solid Method (Implemented)

- Medium-LLM or Hard-LLM commits content
- Saved to database with `shelf_state: 'solid'`
- Becomes canonical narrative
- Indexed in directory

---

## Part 4: UI Component Architecture — Column = Frame

### The Core Insight

The **column IS the pscale coordinate bundle** that frames everything.

```
BUTTON (Input)
    ↓ user focus + text entry
    ↓ dynamically attached to column
COLUMN (Frame = Pscale Coordinate Bundle)
    ↓ supplies context to all tiers
    ↓ IS the coordinate specification
┌─────────────────────────────────┐
│  CARD (Shelf Stack)             │
│  ┌───────────────────────────┐  │
│  │ VAPOR  ←→ Soft-LLM Frame  │  │
│  ├───────────────────────────┤  │
│  │ LIQUID ←→ Medium-LLM Frame│  │
│  ├───────────────────────────┤  │
│  │ SOLID  ←→ Hard-LLM Frame  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Component Functions

| Component | Function |
|-----------|----------|
| **Button** | User input mechanism + focus selector |
| **Focus** | Dynamically attached to column |
| **Column** | Pscale coordinate bundle = the frame itself |
| **Frame** | Context window for each LLM tier, derived from column coordinates |
| **Card** | Visual representation of shelf stack at those coordinates |

### The Clean Principle

**Column = Frame = Pscale Coordinate Bundle**

The column doesn't *have* coordinates — it *is* coordinates. When you focus on a column, you're specifying:
- Temporal coordinates (when)
- Spatial coordinates (where)
- Identity coordinates (who)

These coordinates then frame:
1. What Soft-LLM knows when responding
2. What Medium-LLM synthesizes
3. What Hard-LLM coordinates for coherence

---

## Part 5: Claude API Features for Maximizing LLM Usage

### Extended Thinking

| Feature | Status | Beta Header | Use In Xstream |
|---------|--------|-------------|----------------|
| Basic Extended Thinking | GA | None | Hard-LLM coordination |
| Interleaved Thinking | Beta | `interleaved-thinking-2025-05-14` | Hard-LLM with tools |
| Thinking Block Clearing | Beta | `context-management-2025-06-27` | Long conversations |
| Summarized Thinking | Default (Claude 4) | N/A | All tiers |

**Configuration**:
```javascript
{
  extended_thinking: true,
  thinking: {
    budget_tokens: 10000  // Adjust per tier
  }
}
```

### Memory Tool

| Aspect | Detail |
|--------|--------|
| Beta Header | `context-management-2025-06-27` |
| Tool Type | `memory_20250818` |
| Operations | Create, read, update, delete files |

**Use in Xstream**: Character-LLM persistence, world state caching, relationship memory.

### Agent Skills

| Aspect | Detail |
|--------|--------|
| Beta Header | `skills-2025-10-02` |
| Requires | Code execution tool |
| Built-in | `pptx`, `xlsx`, `docx`, `pdf` |
| Custom | Via Skills API |

**Key Insight**: Skills are **prompt templates**, not code. They inject instructions + modify execution context. Perfect for pscale-aware processing.

### MCP Connector

| Aspect | Detail |
|--------|--------|
| Beta Header | `mcp-client-2025-11-20` |
| Response Types | `mcp_tool_use`, `mcp_tool_result` |

**Use in Xstream**: Connect to n8n workflows, external services.

### Prompt Caching

| TTL | Use Case |
|-----|----------|
| 5-minute | Rapid player exchanges |
| 1-hour | Extended narrative sessions |

**Xstream Application**:
- Cache skill definitions (stable across requests)
- Cache world context at higher pscale (changes slowly)
- Don't cache vapor content (changes constantly)

### Structured Outputs

| Aspect | Detail |
|--------|--------|
| Beta Header | `structured-outputs-2025-11-13` |
| Models | Sonnet 4.5, Opus 4.1 |

**Use in Xstream**: Guaranteed schema for pscale coordinate responses, frame definitions.

### Recommended Configuration by LLM Tier

| Tier | Model | Extended Thinking | Memory | Skills | Caching |
|------|-------|-------------------|--------|--------|---------|
| Soft-LLM | Haiku 4.5 | No | No | Minimal | 5-min |
| Medium-LLM | Sonnet 4.5 | Yes (low budget) | No | Synthesis skills | 5-min |
| Hard-LLM | Sonnet 4.5 | Yes (high budget) | Yes | Coordination skills | 1-hour |
| Character-LLM | Sonnet 4.5 | Yes | Yes | Personality skills | 1-hour |

---

## Part 6: Pscale Extension — Skills as Coordinates

### The Extension Logic

If pscale already contains:
- Worlds (spatial coordinates)
- Time (temporal coordinates)
- Identity (character/entity coordinates)

Then it can also contain:
- **Skills** (prompt templates at specific coordinate ranges)

### Skills in Pscale

Skills become content at **negative pscale coordinates** (meta-level):

| Pscale Range | Content Type |
|--------------|--------------|
| -7 to -10 | Core platform skills (immutable) |
| -4 to -6 | Domain skills (modifiable by Designer) |
| -1 to -3 | Instance skills (active in current session) |

**Example Skill Coordinate**:
```
Skill: character-response-generation
Temporal: 0 (always available)
Spatial: 0.0000001 (P-Scale -7, platform level)
Identity: 0 (applies to all)

Full coordinate: (0, 0.0000001, 0)
```

### Skill Retrieval by Pscale

When Hard-LLM frames a request:
1. Determine current pscale focus
2. Query skills at relevant meta-coordinates
3. Load skills into context
4. Process with skill-aware prompting

---

## Part 7: Pscale Extension — Code as Coordinates (Speculative)

### The Radical Proposition

If skills can live in pscale coordinates, why not code itself?

```
PSCALE DATABASE CONTAINS:
├── Worlds (P-Scale 10+)
├── Locations (P-Scale 0-9)
├── Characters (Identity coordinate)
├── Time states (Temporal coordinate)
├── Skills (P-Scale -4 to -10)
└── Code (P-Scale -10 to -20) ← NEW
    ├── Soft-LLM logic
    ├── Medium-LLM logic
    ├── Hard-LLM logic
    └── UI components
```

### Code Coordinate Structure

| Pscale Range | Code Type |
|--------------|-----------|
| -11 | UI component definitions |
| -12 | Soft-LLM processing logic |
| -13 | Medium-LLM synthesis logic |
| -14 | Hard-LLM coordination logic |
| -15 | Database schema definitions |
| -20 | Bootstrap kernel (immutable) |

### The Bootstrap Paradox Resolution

**The Egg** (minimal seed):
```html
<!-- bootstrap.html -->
<!DOCTYPE html>
<script>
  // Connect to pscale database
  // Read coordinate -20 (bootstrap kernel)
  // Execute: compile yourself
</script>
```

**The Chicken** (emerges from seed):
1. Claude reads bootstrap instruction
2. Claude queries pscale for code coordinates
3. Claude generates interface from code coordinates
4. Interface serves users AND can update pscale
5. System is self-modifying through coordinate updates

### Implications

If this works:
- **Infinitely portable**: Just the database
- **Self-modifying**: Code changes = pscale updates
- **Version control**: Temporal coordinates, not Git
- **True "Minecraft"**: Even the engine is modifiable blocks

### Caution: The Immutable Kernel

Self-modifying systems need a stable foundation:
- P-Scale -20 (bootstrap) must be **immutable**
- Some coordinates are read-only
- The bootstrap seed IS the kernel — it cannot modify itself

---

## Part 8: Implementation Priority

### Immediate (This Build)

1. ✅ Document pscale spatial structure (real vs fantasy)
2. 🔲 Port vapor method from vapor-ui branch
3. 🔲 Implement button-based text entry
4. 🔲 Implement directory drawer (book icon)
5. 🔲 Implement focus-based titles (not face labels)
6. 🔲 Column = Frame architecture

### Near-Term

1. 🔲 Skills stored in pscale coordinates
2. 🔲 Claude API optimization (thinking, caching, skills)
3. 🔲 Character-LLM with memory tool

### Speculative (Future Exploration)

1. 🔲 Code stored in pscale coordinates
2. 🔲 Self-bootstrapping system test
3. 🔲 Git-free version control via temporal coordinates

---

## Appendix: Claude API Beta Headers Reference

```javascript
// Full configuration for maximized Claude usage
const betaHeaders = [
  "interleaved-thinking-2025-05-14",  // Think between tool calls
  "context-management-2025-06-27",     // Memory tool + thinking clearing
  "skills-2025-10-02",                 // Agent Skills
  "mcp-client-2025-11-20",             // MCP Connector
  "code-execution-2025-08-25",         // Code execution tool
  "structured-outputs-2025-11-13"      // Guaranteed schema
];
```

---

*Document created: January 2025*
*For: Xstream Phase 0.11 (feature/new-ui branch)*
*Status: Working specification — subject to refinement through implementation*
