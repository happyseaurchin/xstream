# Phase 2: Skills from Database

**Status: Implemented**

---

## What This Phase Adds

1. **`packages` table** — Skill bundles with signatures
2. **`skills` table** — Markdown assembly rules
3. **`frame_packages` table** — Composition binding
4. **`generate-v2` edge function** — Loads skills at compile time

---

## Schema

### packages

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Package name (e.g., 'onen', 'urb') |
| signature | TEXT | Provenance marker (e.g., 'onen-official', 'david') |
| level | TEXT | 'platform' / 'frame' / 'user' |
| description | TEXT | What this package does |
| created_by | UUID | Reference to users |

### skills

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Skill name (kebab-case) |
| package_id | UUID | Which package this belongs to |
| category | TEXT | gathering/aperture/weighting/format/routing/constraint/guard |
| applies_to | TEXT[] | Which faces: ['player'], ['author'], ['designer'], or combinations |
| content | TEXT | The markdown skill definition |
| overrides | UUID | Skill this replaces (optional) |
| extends | UUID | Skill this adds to (optional) |

### frame_packages

| Column | Type | Description |
|--------|------|-------------|
| frame_id | UUID | Reference to frames |
| package_id | UUID | Reference to packages |
| priority | INTEGER | Resolution order (lower = loaded first, higher can override) |

---

## Skill Categories

| Category | Purpose | Overridable? |
|----------|---------|---------------|
| gathering | What context to fetch | Yes |
| aperture | What pscale range to include | Yes |
| weighting | Priority when conflicts | Yes |
| format | How to structure prompt for LLM | Yes |
| routing | Who receives output | Yes |
| constraint | Tunable rules | Yes |
| guard | Immutable platform rules | **No** |

---

## Resolution Order

1. **Platform skills** — Always loaded first (the foundation)
2. **Frame skills** — Loaded by `frame_packages.priority` (ascending)
3. **User skills** — Personal preferences (future)

Later skills override earlier ones, **except guards** which cannot be overridden.

---

## Bootstrap Data

The `onen` platform package includes:

- `guard-no-private-access` — Cannot access other users' private data
- `default-format-player` — Character-LLM prompt structure
- `default-format-author` — Author-LLM prompt structure  
- `default-format-designer` — Designer-LLM prompt structure

---

## generate-v2 API

**Endpoint:** `https://piqxyfmzzywxzqkzmpmm.supabase.co/functions/v1/generate-v2`

**Request (via shelf entry):**
```json
{
  "shelf_entry_id": "uuid"
}
```

**Request (direct input):**
```json
{
  "text": "I reach for the door handle...",
  "face": "player",
  "frame_id": "uuid" // optional
}
```

**Response:**
```json
{
  "success": true,
  "text": "You reach for the cold brass handle...",
  "metadata": {
    "face": "player",
    "frame_id": null,
    "skills_used": [
      { "category": "format", "name": "default-format-player" },
      { "category": "guard", "name": "guard-no-private-access" }
    ],
    "model": "claude-sonnet-4-20250514",
    "tokens": { "input_tokens": 150, "output_tokens": 75 }
  }
}
```

---

## Next Steps (Phase 3)

1. Update UI to call generate-v2 instead of generate
2. Display skills_used in metadata
3. Create test frame with custom package
4. Implement remaining skill categories (gathering, aperture, etc.)
