# Technical Design Spec: Zone Component Integration

**Created:** 2026-01-06  
**Updated:** 2026-01-06 - Simplified to single column  
**Branch:** feature/third-ui  
**Goal:** Swap old panels for new zone components (single column)

---

## Architecture

```
App.tsx (hooks + state - unchanged)
  └── render()
        ├── SolidZone (was SolidPanel)
        ├── LiquidZone (was LiquidPanel)
        └── VapourZone (was VaporPanel)
```

**Key principle:** Only the render components change. Hooks and state remain identical.

---

## Step-by-Step Implementation

### Step 1: Import new zone components in App.tsx

```typescript
import { SolidZone } from './components/xstream/SolidZone'
import { LiquidZone } from './components/xstream/LiquidZone'  
import { VapourZone } from './components/xstream/VapourZone'
import { adaptSolidEntries, combineLiquidCards, adaptVaporContents } from './utils/adapters'
```

**Commit:** `[App] Import new zone components and adapters`

---

### Step 2: Replace SolidPanel with SolidZone

OLD:
```tsx
<SolidPanel
  solidView={solidView}
  onViewChange={setSolidView}
  solidEntries={dbSolidEntries}
  frameSkills={frameSkills}
  contentEntries={dbContentEntries}
  characterEntries={dbCharacterEntries}
  face={face}
  frameId={frameId}
  isLoadingDirectory={isLoadingDirectory || isLoadingContent}
  showMeta={showMeta}
  onSkillClick={handleSkillClick}
  onDeleteContent={handleDeleteContent}
  onDeleteCharacter={handleDeleteCharacter}
/>
```

NEW:
```tsx
<SolidZone
  blocks={adaptSolidEntries(dbSolidEntries)}
  height={mainRef.current ? mainRef.current.clientHeight * zoneProportions.solid / 100 : 200}
/>
```

**Note:** Directory view functionality temporarily lost - add back later or keep SolidPanel for dir mode.

**Commit:** `[App] Replace SolidPanel with SolidZone`

---

### Step 3: Replace LiquidPanel with LiquidZone

OLD:
```tsx
<LiquidPanel
  liquidEntries={myLiquidEntries}
  currentIndex={liquidHistoryIndex}
  othersLiquid={othersLiquid}
  isLoading={isLoading}
  onEdit={handleLiquidEdit}
  onCommit={handleCommitEntry}
  onDismiss={(id) => setEntries(prev => prev.filter(e => e.id !== id))}
  onNavigate={handleLiquidNavigate}
  onCopyToVapor={handleCopyToVapor}
/>
```

NEW:
```tsx
<LiquidZone
  cards={combineLiquidCards(myLiquidEntries, selectedCharacter?.name || userName, othersLiquid)}
  height={mainRef.current ? mainRef.current.clientHeight * zoneProportions.liquid / 100 : 150}
  currentUserId={userId}
  isLoading={isLoading}
  onCommit={(cardId) => handleCommitEntry(cardId)}
  onCopyToVapor={handleCopyToVapor}
/>
```

**Commit:** `[App] Replace LiquidPanel with LiquidZone`

---

### Step 4: Replace VaporPanel with VapourZone

OLD:
```tsx
<VaporPanel
  ref={vaporPanelRef}
  input={input}
  onInputChange={setInput}
  userName={selectedCharacter?.name || userName}
  face={face}
  othersVapor={othersVapor}
  softResponse={softResponse}
  onDismissSoftResponse={handleDismissSoftResponse}
  onSelectOption={handleSelectOption}
  isLoading={isLoading}
  isQuerying={isQuerying}
  hasLiquidToClear={hasLiquidToClear}
  onQuery={handleQuery}
  onSubmit={handleSubmit}
  onCommit={handleCommit}
  onClear={handleClear}
/>
```

NEW:
```tsx
<VapourZone
  ref={vaporPanelRef}
  entries={adaptVaporContents(othersVapor)}
  onQuery={handleQuery}
  onSubmit={() => handleSubmitDirect(input)}
  onCommit={() => handleCommitDirect(input)}
  softResponse={softResponse}
  onDismissSoftResponse={handleDismissSoftResponse}
  isQuerying={isQuerying}
  placeholder={`As ${selectedCharacter?.name || userName}...`}
/>
```

**Note:** VapourZone manages its own input state internally. Need to sync or remove App's input state.

**Commit:** `[App] Replace VaporPanel with VapourZone`

---

### Step 5: Wire remaining functionality

- Check ref compatibility (VapourZoneHandle vs VaporPanelHandle)
- Ensure callbacks work correctly
- Test soft response display
- Test keyboard shortcuts

**Commit:** `[App] Wire zone callbacks and fix integration issues`

---

### Step 6: Apply styling

Import theme CSS if needed:
```typescript
import './components/xstream/xstream-theme.css'
```

**Commit:** `[App] Apply xstream theme styling`

---

## Files Modified

| File | Change | Risk |
|------|--------|------|
| src/App.tsx | Swap panels for zones | MEDIUM |

---

## Rollback Plan

```bash
git checkout main -- src/App.tsx
```

---

## Success Criteria

- [ ] Single column displays with new zones
- [ ] Solid shows narratives
- [ ] Liquid shows self + others' entries
- [ ] Commit button works from liquid
- [ ] Vapor input works (query/submit/commit)
- [ ] Soft response displays and dismisses
- [ ] Keyboard shortcuts work
