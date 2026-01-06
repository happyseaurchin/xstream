# Feature Analysis: Working vs New Components

**Created:** 2026-01-06  
**Updated:** 2026-01-06 - LiquidZone & VapourZone complete  
**Purpose:** Understand each feature before deciding what to port/improve

---

## KNOWN ISSUE: Liquid Clear on Commit

**Problem:** When Player A commits, Medium-LLM synthesizes ALL liquid (A + B + C) into one solid. But currently only Player A's liquid clears.

**Expected:** ALL liquid should clear when synthesis starts.

**Fix location:** Edge function or useLiquidSubscription - when placeholder solid appears, delete ALL liquid for that frame/face, not just committer's.

**Tracked for:** Phase 0.12 or separate bugfix

---

## LIQUID ZONE ✅ COMPLETE

| Feature | Decision |
|---------|----------|
| In-place editing | ❌ DROP - use copy-to-vapor |
| History navigation | ❌ DROP - one entry per user, show all |
| Commit button | ✅ ADDED |
| Copy to vapor | ✅ ADDED |
| Self/Other distinction | ✅ ADDED |

---

## VAPOUR ZONE ✅ COMPLETE

| Feature | Decision |
|---------|----------|
| Soft response display | ✅ ADDED - styled box with type badge |
| Clarify options | ✅ Text only (1. 2. 3.) - user types response |
| Loading states | ✅ ADDED - spinner on query button |
| Keyboard shortcuts | ✅ Enter/Shift+Enter/Cmd+Enter |
| Keyboard hints | ✅ ADDED - subtle row below input |
| onLLMActivate → onQuery | ✅ RENAMED |
| onCommit prop | ✅ ADDED |

---

## SOLID ZONE - NO CHANGES NEEDED

Log view works. Directory view deferred (separate concern).

---

## SUMMARY: Component Status

| Component | Status | Notes |
|-----------|--------|-------|
| LiquidZone | ✅ Done | Commit, copy-to-vapor, self/other |
| VapourZone | ✅ Done | Soft response, loading, shortcuts |
| SolidZone | ✅ Keep as is | Works for log view |

---

## NEXT STEPS

1. **Update adapters** if needed for new props
2. **Wire up in App.tsx** - replace old panels with new zones
3. **Test integration** - verify all callbacks work
4. **Fix liquid clear bug** - separate issue

---

## Final Props Reference

### LiquidZone
```typescript
interface LiquidZoneProps {
  cards: LiquidCardType[];
  height: number;
  currentUserId: string;
  isLoading?: boolean;
  onCommit?: (cardId: string) => void;
  onCopyToVapor?: (text: string) => void;
}
```

### VapourZone
```typescript
interface VapourZoneProps {
  entries: VapourEntry[];
  onQuery: (text: string) => void;      // Enter → Soft-LLM
  onSubmit: (text: string) => void;     // Shift+Enter → Liquid
  onCommit?: (text: string) => void;    // Cmd+Enter → Solid
  softResponse?: SoftLLMResponse | null;
  onDismissSoftResponse?: () => void;
  isQuerying?: boolean;
  placeholder?: string;
}

// Ref handle
interface VapourZoneHandle {
  focus: () => void;
}
```

### SolidZone (unchanged)
```typescript
interface SolidZoneProps {
  blocks: SolidBlock[];
  height: number;
}
```
