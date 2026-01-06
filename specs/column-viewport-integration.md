# Technical Design Spec: Column Viewport Integration

**Created:** 2026-01-06  
**Branch:** feature/third-ui  
**Goal:** Multi-column UI where columns are viewports into shared frame data

---

## Architecture

```
App.tsx (hooks for the FRAME - single subscription per hook)
  ├── columns[] state (UI viewports only)
  └── map(columns) → XStreamColumn
        └── receives filtered props via adapters
              ├── VapourZone (face-filtered vapor)
              ├── LiquidZone (face-filtered liquid)
              └── SolidZone (face-filtered solid)
```

**Key principle:** Hooks don't multiply. Columns are views, not data sources.

---

## Step-by-Step Implementation

### Step 1: Add column state to App.tsx

Add ~30 lines for column management:

```typescript
interface ColumnState {
  id: string;
  face: Face;
  background?: string;
}

const [columns, setColumns] = useState<ColumnState[]>([
  { id: 'col-1', face: activeFace }
]);

const addColumn = (face: Face) => {
  setColumns(prev => [...prev, { 
    id: `col-${Date.now()}`, 
    face 
  }]);
};

const removeColumn = (id: string) => {
  setColumns(prev => prev.filter(c => c.id !== id));
};

const updateColumnFace = (id: string, face: Face) => {
  setColumns(prev => prev.map(c => 
    c.id === id ? { ...c, face } : c
  ));
};
```

**Commit:** `[App] Add column viewport state management`

---

### Step 2: Create buildColumnProps helper

In `src/utils/adapters.ts`, add:

```typescript
export function buildColumnProps(params: {
  face: Face;
  solidEntries: SolidEntry[];
  liquidEntries: ShelfEntry[];
  vaporContent: VaporContent[];
  currentUserId: string;
  isLoading: boolean;
}) {
  // Filter by face
  const faceSolid = params.solidEntries.filter(e => e.face === params.face);
  const faceLiquid = params.liquidEntries.filter(e => e.face === params.face);
  const faceVapor = params.vaporContent.filter(v => v.face === params.face);
  
  return {
    solid: adaptSolidEntries(faceSolid),
    liquid: adaptShelfEntries(faceLiquid),
    vapor: adaptVaporContents(faceVapor),
    currentUserId: params.currentUserId,
    isLoading: params.isLoading,
  };
}
```

**Commit:** `[adapters] Add buildColumnProps helper for face filtering`

---

### Step 3: Import new zone components

Update App.tsx imports:

```typescript
import { SolidZone } from './components/xstream/SolidZone';
import { LiquidZone } from './components/xstream/LiquidZone';
import { VapourZone } from './components/xstream/VapourZone';
import { buildColumnProps } from './utils/adapters';
```

**Commit:** `[App] Import new zone components`

---

### Step 4: Replace single-column render with multi-column

Replace the panel render section with:

```typescript
<div className={`flex-1 flex gap-2 p-2 ${columns.length > 1 ? 'overflow-x-auto' : ''}`}>
  {columns.map(col => {
    const props = buildColumnProps({
      face: col.face,
      solidEntries,
      liquidEntries: shelfEntries,
      vaporContent,
      currentUserId: user?.id || '',
      isLoading: isSynthesizing,
    });
    
    return (
      <div key={col.id} className="flex-1 min-w-[300px] flex flex-col border rounded-lg overflow-hidden">
        {/* Column header with face selector */}
        <div className="p-2 border-b bg-muted/20 flex items-center gap-2">
          <FaceSelector 
            value={col.face} 
            onChange={(face) => updateColumnFace(col.id, face)} 
          />
          {columns.length > 1 && (
            <button onClick={() => removeColumn(col.id)}>×</button>
          )}
        </div>
        
        {/* Zones */}
        <SolidZone blocks={props.solid} height={200} />
        <LiquidZone 
          cards={props.liquid}
          height={150}
          currentUserId={props.currentUserId}
          isLoading={props.isLoading}
          onCommit={handleCommit}
          onCopyToVapor={(text) => setVaporInput(text)}
        />
        <VapourZone
          entries={props.vapor}
          onQuery={handleQuery}
          onSubmit={handleSubmit}
          onCommit={handleDirectCommit}
          softResponse={softResponse}
          onDismissSoftResponse={() => setSoftResponse(null)}
          isQuerying={isQuerying}
          placeholder={`As ${col.face}...`}
        />
      </div>
    );
  })}
</div>
```

**Commit:** `[App] Replace panels with multi-column zone render`

---

### Step 5: Add column controls

Add button to add columns:

```typescript
<button 
  onClick={() => addColumn('character')}
  className="..."
>
  + Add Column
</button>
```

**Commit:** `[App] Add column management controls`

---

### Step 6: Wire callbacks

Ensure all zone callbacks work with column context:

- `onCommit` needs to know which face
- `onSubmit` needs to know which face
- `onQuery` needs to know which face

May need to curry the handlers:

```typescript
onCommit={(cardId) => handleCommit(cardId, col.face)}
```

**Commit:** `[App] Wire column-aware callbacks`

---

### Step 7: Apply styling

Import new CSS variables and apply theme:

```typescript
import './components/xstream/xstream-theme.css';
```

**Commit:** `[App] Apply xstream theme styling`

---

### Step 8: Test and bug hunt

- Single column works
- Add second column
- Different faces in different columns
- Submit/commit from each column
- Real-time updates appear in both

**Commit:** `[App] Fix [specific issues found]`

---

## Files Modified

| File | Change | Risk |
|------|--------|------|
| src/App.tsx | Add column state, swap panels | HIGH |
| src/utils/adapters.ts | Add buildColumnProps | LOW |
| src/index.css | Import theme | LOW |

---

## Rollback Plan

If integration fails:
1. `git checkout main -- src/App.tsx`
2. Keep new zone components for future use
3. Document what broke

---

## Success Criteria

- [ ] Single column displays correctly with new zones
- [ ] Multiple columns can be added
- [ ] Each column can have different face
- [ ] Submit/commit works from any column
- [ ] Real-time updates appear in all columns
- [ ] No hook duplication (check network tab)
