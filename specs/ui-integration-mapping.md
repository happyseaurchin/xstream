# UI Integration Mapping: App.tsx → New XStream Components

**Created:** 2026-01-06  
**Branch:** feature/third-ui  
**Goal:** Map working App.tsx logic to new vapor-flow UI components

---

## Executive Summary

| Source | Location | Size | Purpose |
|--------|----------|------|--------|
| Working App | `src/App.tsx` | 30KB (~800 lines) | Full working app with auth, Supabase, LLM |
| New UI Shell | `src/components/xstream/XStreamApp.tsx` | 5KB | Multi-column layout with mock data |
| New Zones | `src/components/xstream/*.tsx` | ~20KB total | SolidZone, LiquidZone, VapourZone, etc. |

**The Gap:** New UI has mock data arrays. Working App has real Supabase subscriptions and LLM calls.

---

## Part 1: Working App.tsx Structure

### 1.1 Imports & Dependencies (Lines 1-30)
```
- useAuth (authentication hook)
- useFrameChannel (realtime presence/vapor broadcast)
- useLiquidSubscription (Supabase realtime for liquid entries)
- useSolidSubscription (Supabase realtime for solid entries)
- useContentSubscription (content/character directory)
- Component imports: AuthPage, ConstructionButton, PresenceBar, etc.
- Type imports: Face, LLMMode, Frame, ShelfEntry, etc.
```

### 1.2 Configuration (Lines 31-75)
```
- SUPABASE_URL, SUPABASE_ANON_KEY
- GENERATE_URL (edge function endpoint)
- FRAMES array (available frames)
- Zone proportion defaults
- localStorage utilities
```

### 1.3 State Management (Lines 77-130)

| State | Type | Purpose |
|-------|------|--------|
| `userId` | string | Current authenticated user |
| `userName` | string | Display name |
| `face` | Face | Current face (character/author/designer) |
| `frameId` | string\|null | Selected frame |
| `input` | string | Vapor zone input text |
| `entries` | ShelfEntry[] | Local liquid entries |
| `frameCharacters` | FrameCharacter[] | Characters in current frame |
| `selectedCharacterId` | string\|null | Inhabited character |
| `zoneProportions` | ZoneProportions | Solid/liquid/vapor heights |
| `isLoading` | boolean | Medium-LLM processing |
| `isQuerying` | boolean | Soft-LLM processing |
| `softResponse` | SoftLLMResponse\|null | Soft-LLM response display |
| `visibility` | VisibilitySettings | Show/hide zones |
| `solidView` | SolidView | Log/directory view toggle |

### 1.4 Hooks (Lines 131-175)

| Hook | Returns | Purpose |
|------|---------|--------|
| `useAuth()` | user, profile, signOut, updateProfile | Supabase auth |
| `useFrameChannel()` | presentUsers, isConnected, othersVapor, broadcastVapor | Realtime presence |
| `useLiquidSubscription()` | dbLiquidEntries, upsertLiquid, commitLiquid, deleteLiquid | Liquid table ops |
| `useSolidSubscription()` | dbSolidEntries, clearSolid | Solid table subscription |
| `useContentSubscription()` | contentEntries, characterEntries, deleteContent, deleteCharacter | Directory data |

### 1.5 Key Functions (Lines 200-500)

| Function | Purpose | LLM Tier |
|----------|---------|----------|
| `generateResponse()` | Commit liquid → trigger Medium-LLM synthesis | Medium |
| `executeQuery()` | Soft-LLM refine/info/action processing | Soft |
| `handleQuery()` | Parse input typography, route to appropriate handler | - |
| `handleSubmitDirect()` | Vapor → Liquid (skip soft-LLM) | - |
| `handleCommitDirect()` | Vapor → Solid (skip liquid) | Medium |
| `handleCommitEntry()` | Liquid → Solid | Medium |
| `handleLiquidEdit()` | Edit liquid entry with debounce | - |
| `handleClear()` | Clear all local state | - |

### 1.6 Render Structure (Lines 550-750)

```jsx
<div className="app">
  <header>  {/* Face selector, frame selector, character selector, presence, logout */}
  <VisibilityPanel />  {/* Optional settings drawer */}
  <PresenceBar />  {/* Who's here */}
  <main>
    <SolidPanel />  {/* Log/directory view */}
    <DraggableSeparator />
    <LiquidPanel />  {/* Submitted entries */}
    <DraggableSeparator />
    <VaporPanel />  {/* Input + soft response */}
  </main>
  <ConstructionButton />
</div>
```

---

## Part 2: New UI Components (vapor-flow)

### 2.1 XStreamApp.tsx (Root)

```jsx
<div className="app" data-theme={theme} data-layout={layout}>
  <div className="columns-container">
    {columns.map(col => <XStreamColumn />)}
  </div>
  <ConstructionButton />
</div>
```

**Key Differences:**
- Multi-column support (layout: single/double/triple)
- Theme system (dark/light via data attributes)
- State managed as single AppState object
- Uses mock data (createSampleColumn)

### 2.2 XStreamColumn.tsx

```jsx
<div className="xstream-column" data-face={face}>
  <ColumnHeader />  {/* Face selector, frame, presence */}
  <FilterDrawer />  {/* Settings panel */}
  <SolidZone />     {/* blocks prop */}
  <ZoneSeparator />
  <LiquidZone />    {/* cards prop */}
  <ZoneSeparator />
  <VapourZone />    {/* entries prop */}
</div>
```

**Key Differences:**
- Column-scoped state (each column has own face/frame)
- Draggable zone heights in pixels, not percentages
- Simpler props interface (data passed down)

### 2.3 Zone Components

| Component | Props | Mock Data Type |
|-----------|-------|---------------|
| `SolidZone` | `blocks`, `height` | `SolidBlock[]` |
| `LiquidZone` | `cards`, `height` | `LiquidCard[]` |
| `VapourZone` | `entries`, `onSubmit`, `onLLMActivate` | `VapourEntry[]` |

---

## Part 3: Data Type Mapping

### 3.1 Solid Zone

| Working (main) | New (vapor-flow) | Notes |
|----------------|------------------|-------|
| `dbSolidEntries: SolidEntry[]` | `blocks: SolidBlock[]` | Different shape |
| Properties: `id, face, narrative, frame_id, created_at` | Properties: `id, title, content, timestamp` | Need adapter |

### 3.2 Liquid Zone

| Working (main) | New (vapor-flow) | Notes |
|----------------|------------------|-------|
| `myLiquidEntries: ShelfEntry[]` | `cards: LiquidCard[]` | Different shape |
| `othersLiquid` from DB | N/A | Need to add |
| History navigation (prev/next) | N/A | Need to add |

### 3.3 Vapor Zone

| Working (main) | New (vapor-flow) | Notes |
|----------------|------------------|-------|
| `input: string` | Part of `VapourEntry[]` | Different model |
| `othersVapor` from channel | `entries.filter(!isSelf)` | Similar concept |
| `softResponse` | N/A | Need to add |

---

## Part 4: Integration Strategy

### Option A: Adapt Working App to Use New UI Components (RECOMMENDED)

Keep App.tsx as orchestrator, replace rendered components:

1. **Phase 1:** Replace zone panels with new components
   - Keep all hooks and logic in App.tsx
   - Create adapter functions for data shapes
   - Replace `<SolidPanel>` → `<SolidZone>` (with adapter)
   - Replace `<LiquidPanel>` → `<LiquidZone>` (with adapter)
   - Replace `<VaporPanel>` → `<VapourZone>` (with adapter)

2. **Phase 2:** Add column support
   - Wrap single column in column container
   - Add column management UI
   - Each column gets own face/frame state

3. **Phase 3:** Adopt theme system
   - Move styles to CSS variables
   - Add theme toggle to ConstructionButton

### Option B: Replace App.tsx with XStreamApp (NOT RECOMMENDED)

Would require porting all hooks/logic into new structure. More work, more risk.

---

## Part 5: Step-by-Step Implementation Plan

### Step 1: Create Data Adapters (NEW FILE)
**File:** `src/utils/adapters.ts`

```typescript
// Convert working SolidEntry → vapor-flow SolidBlock
export function adaptSolidEntry(entry: SolidEntry): SolidBlock {
  return {
    id: entry.id,
    title: entry.face, // or extract from narrative
    content: entry.narrative || '',
    timestamp: new Date(entry.created_at).getTime(),
  };
}

// Convert working ShelfEntry → vapor-flow LiquidCard  
export function adaptLiquidEntry(entry: ShelfEntry): LiquidCard {
  return {
    id: entry.id,
    userId: 'self',
    userName: entry.userName || 'Unknown',
    content: entry.text,
    timestamp: new Date(entry.timestamp).getTime(),
  };
}
```

### Step 2: Update App.tsx Imports
Add imports for new zone components alongside existing.

### Step 3: Replace SolidPanel → SolidZone
- Keep SolidPanel for directory view (it has that logic)
- Use SolidZone for log view
- Adapter converts dbSolidEntries

### Step 4: Replace LiquidPanel → LiquidZone
- Pass adapted myLiquidEntries as cards
- Wire onCommit, onEdit callbacks
- Add othersLiquid display

### Step 5: Replace VaporPanel → VapourZone
- Wire input state
- Wire onSubmit → handleSubmit
- Wire onLLMActivate → handleQuery
- Add soft response display (may need VapourZone modification)

### Step 6: Update ColumnHeader Integration
- Replace header section with ColumnHeader
- Wire face selector
- Wire frame selector
- Wire presence display

### Step 7: Test Single Column
- Verify all functionality works
- Fix any adapter issues

### Step 8: Add Multi-Column Support (Future)
- Only after single column is stable

---

## Part 6: Files to Modify

| File | Action | Risk |
|------|--------|------|
| `src/App.tsx` | Modify imports, replace zone rendering | MEDIUM |
| `src/utils/adapters.ts` | CREATE | LOW |
| `src/components/xstream/VapourZone.tsx` | Add soft response support | LOW |
| `src/components/xstream/LiquidZone.tsx` | Add edit/commit callbacks | LOW |
| `src/types/xstream.ts` | May need updates | LOW |

---

## Part 7: Rollback Plan

If integration fails:
1. Branch is isolated - main is untouched
2. Can revert feature/third-ui to previous commit
3. Can use David's manual branch as clean starting point

---

## Appendix: Component Props Required

### SolidZone (vapor-flow)
```typescript
interface SolidZoneProps {
  blocks: SolidBlock[];
  height: number;
}
```

### LiquidZone (vapor-flow)
```typescript
interface LiquidZoneProps {
  cards: LiquidCard[];
  height: number;
}
```

### VapourZone (vapor-flow)
```typescript
interface VapourZoneProps {
  entries: VapourEntry[];
  onSubmit: (text: string) => void;
  onLLMActivate: () => void;
}
```

### What's Missing (Need to Add)
- `onEdit` callback for liquid editing
- `onCommit` callback for liquid → solid
- `softResponse` display in vapor
- `othersLiquid` display in liquid
- History navigation for liquid
