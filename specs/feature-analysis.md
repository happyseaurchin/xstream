# Feature Analysis: Working vs New Components

**Created:** 2026-01-06  
**Purpose:** Understand each feature before deciding what to port/improve

---

## LIQUID ZONE

### Feature: Liquid Edit

**What it does in working LiquidPanel:**
- User can click on their submitted liquid entry
- The text becomes editable (though currently disabled: `_onEdit`)
- Changes are debounced and saved
- Allows refinement before commit

**What new LiquidZone does:**
- Displays cards read-only
- Long content can expand/collapse
- No editing capability

**Question:** Is in-place editing valuable, or is "copy back to vapor, edit there" better?

**Proposal:** Copy-to-vapor seems cleaner. Liquid is *submitted* state - editing it feels like breaking the state model. If you want to change it, pull it back to vapor.

---

### Feature: Liquid History Navigation

**What it does in working LiquidPanel:**
- User can have multiple liquid entries per face
- `currentIndex` tracks which one is visible
- `onNavigate('prev'/'next')` moves through history
- Allows reviewing past submissions

**What new LiquidZone does:**
- Shows ALL cards in a scrollable list
- No "current" selection concept
- All visible at once

**Question:** Is history navigation needed, or is "show all" better?

**Observation:** Working panel shows ONE entry at a time with nav arrows. New panel shows ALL entries scrollable. The new approach seems more intuitive - why hide entries?

**Proposal:** Keep "show all" from new component. The history nav was probably an early design when screen space was tighter.

---

### Feature: Commit Button per Entry

**What it does in working LiquidPanel:**
- Each liquid entry has a ⏺ commit button
- Clicking triggers Medium-LLM synthesis (liquid → solid)
- Shows ◌ spinner while synthesizing
- Critical for the vapor→liquid→solid flow

**What new LiquidZone does:**
- No commit button
- Cards are display-only
- No way to advance state

**Proposal:** MUST ADD. This is core functionality. Each card needs:
- Commit button (for own entries)
- Loading state indicator
- Maybe: dismiss button to remove without committing

---

### Feature: Copy to Vapor

**What it does in working LiquidPanel:**
- Clicking on liquid entry copies text to vapor input
- Allows quick iteration: see result → tweak → resubmit

**What new LiquidZone does:**
- No click handler
- No vapor integration

**Proposal:** ADD. Useful for iteration. Click card → text appears in vapor input.

---

### Feature: Others' Liquid Display

**What it does in working LiquidPanel:**
- Shows other users' liquid entries below yours
- Different styling ("other-liquid" class)
- Shows their username and face
- Shows committed/submitted state

**What new LiquidZone does:**
- All cards look the same
- Has userName display
- No distinction between self/other

**Proposal:** ADD distinction. Visual difference matters for coordination.

---

## VAPOR ZONE

### Feature: Three-Button Input (Query/Submit/Commit)

**What it does in working VaporPanel:**
```
[⚡ Query] [___textarea___] [→ Submit]
```
- **⚡ Query (Enter)**: Send to Soft-LLM for refinement/clarification
- **→ Submit (Shift+Enter)**: Direct to Liquid (skip Soft-LLM)
- **Commit (Cmd+Enter)**: Direct to Solid (skip both)

**What new VapourZone does:**
```
[⚡ LLM] [___input___] [→ Submit]
```
- **⚡ LLM**: Calls `onLLMActivate` (purpose unclear)
- **→ Submit**: Calls `onSubmit`
- No commit option

**Gap:** New component has 2 buttons, working has 3 paths. The three-path model is core to xstream's state flow.

**Proposal:** 
- Keep two buttons visually (cleaner)
- ⚡ = Query (Soft-LLM) on Enter
- → = Submit on Shift+Enter  
- Cmd+Enter = Commit (no button, keyboard only)
- This matches current working behavior

---

### Feature: Soft-LLM Response Display

**What it does in working VaporPanel:**
- When Soft-LLM returns, shows response above input
- Different styling per `softType`:
  - `refine`: Shows refined version of input
  - `clarify`: Shows options to choose from
  - `info`: Shows informational response
  - `artifact`: Shows structured content ready for liquid
- Clarify shows clickable option buttons
- Has dismiss button

**What new VapourZone does:**
- Nothing. No soft response display.

**Proposal:** ADD. Critical for the Soft-LLM interaction loop. The response display should:
- Appear above the input area
- Show response type badge
- For `clarify`: show option buttons
- Allow dismiss

---

### Feature: Others' Vapor Display

**What it does in working VaporPanel:**
- Shows other users' live typing above input
- Updates in real-time (character by character)
- Shows their face icon and name

**What new VapourZone does:**
- Shows vapor entries in scrollable area
- Has `isSelf` flag for styling
- Basic display works

**Status:** Already implemented. May need styling refinement.

---

### Feature: Loading States

**What it does in working VaporPanel:**
- `isQuerying`: Query button shows ◌, disabled
- `isLoading`: (Medium-LLM) - affects commit behavior
- Textarea is NEVER disabled (vapor always available)

**What new VapourZone does:**
- No loading states
- Submit disabled when empty (good)
- No processing indicators

**Proposal:** ADD loading states:
- `isQuerying`: LLM button shows spinner
- Textarea stays enabled always

---

### Feature: Keyboard Shortcuts

**What it does in working VaporPanel:**
- **Enter**: Query Soft-LLM
- **Shift+Enter**: Submit to Liquid
- **Cmd+Enter**: Commit to Solid

**What new VapourZone does:**
- **Enter**: Submit (calls onSubmit)
- No other shortcuts

**Proposal:** Remap to match working behavior:
- Enter → Query (most common action)
- Shift+Enter → Submit
- Cmd+Enter → Commit (needs new prop)

---

## SOLID ZONE

### Feature: Log View

**What it does in working SolidPanel:**
- Shows synthesized narratives
- Scrollable chronological list
- Shows face, participants, timestamp
- Shows "(synthesizing...)" placeholder during processing

**What new SolidZone does:**
- Shows blocks with title and content
- Scrollable
- Clean card styling

**Status:** Mostly aligned. New component is simpler but functional.

---

### Feature: Directory View

**What it does in working SolidPanel:**
- Toggle between Log and Directory views
- Directory shows:
  - Skills (for designer face)
  - Content/locations (for author face)
  - Characters (for character face)
- Click skill → loads into liquid for editing
- Delete buttons for content/characters

**What new SolidZone does:**
- No directory view
- Log only

**Proposal:** Directory view is powerful but complex. Options:
1. Add to SolidZone (makes it bigger)
2. Keep as separate mode/component
3. Move to sidebar/drawer (vapor-flow has FilterDrawer)

**Recommendation:** Keep directory separate for now. It's a different concern - browsing vs. viewing narrative. Could live in FilterDrawer or be a separate panel.

---

## SUMMARY: Required Changes

### LiquidZone - MUST ADD:
1. ✅ Commit button per card (own entries only)
2. ✅ Loading state per card  
3. ✅ Click-to-copy-to-vapor
4. ✅ Self vs Other visual distinction
5. ❌ History navigation (remove - show all is better)
6. ❌ In-place editing (remove - use vapor for edits)

### VapourZone - MUST ADD:
1. ✅ Soft-LLM response display area
2. ✅ Clarify options as buttons
3. ✅ Loading states (isQuerying)
4. ✅ Keyboard shortcuts (Enter/Shift+Enter/Cmd+Enter)
5. ✅ Rename onLLMActivate → onQuery for clarity
6. ✅ Add onCommit prop for Cmd+Enter

### SolidZone - KEEP AS IS:
- Log view is sufficient
- Directory view handled separately

---

## Proposed New Props

### LiquidZone
```typescript
interface LiquidZoneProps {
  cards: LiquidCard[];
  height: number;
  currentUserId: string;  // NEW: to distinguish self vs other
  onCommit?: (cardId: string) => void;  // NEW
  onCopyToVapor?: (text: string) => void;  // NEW
  loadingCardId?: string | null;  // NEW: which card is synthesizing
}
```

### VapourZone
```typescript
interface VapourZoneProps {
  entries: VapourEntry[];
  onSubmit: (text: string) => void;  // Shift+Enter → Liquid
  onQuery: (text: string) => void;   // RENAMED: Enter → Soft-LLM
  onCommit?: (text: string) => void; // NEW: Cmd+Enter → Solid
  // Soft response
  softResponse?: SoftLLMResponse | null;  // NEW
  onDismissSoftResponse?: () => void;     // NEW
  onSelectOption?: (option: string) => void;  // NEW
  // State
  isQuerying?: boolean;  // NEW
  placeholder?: string;  // NEW: face-specific placeholder
}
```

### SolidZone
```typescript
// No changes needed for now
interface SolidZoneProps {
  blocks: SolidBlock[];
  height: number;
}
```
