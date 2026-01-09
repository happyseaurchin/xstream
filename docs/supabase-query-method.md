# Supabase Query Method (No Docker Fallback)

When Docker isn't available and MCP isn't set up, use curl to query Supabase directly.

## Keys

```bash
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpcXh5Zm16enl3eHpxa3ptcG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTgxNDksImV4cCI6MjA4MTAzNDE0OX0.Z5-6mTdjye8t2RUC39CFQXMKb-idGmYk8peJQ0dTiAM"

SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpcXh5Zm16enl3eHpxa3ptcG1tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ1ODE0OSwiZXhwIjoyMDgxMDM0MTQ5fQ.gnwO53FfBGB_CUBjGui_FZ0GLVNuC9UqGZcjlZYKy-4"
```

## Base URL

```
https://piqxyfmzzywxzqkzmpmm.supabase.co/rest/v1
```

## Query Pattern (SELECT)

```bash
curl -s "$BASE_URL/TABLE_NAME?select=COLUMNS" \
  -H "apikey: $KEY" \
  -H "Authorization: Bearer $KEY"
```

### Examples

```bash
# List all frames
curl -s "$BASE_URL/frames?select=id,name,cosmology_id" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY"

# Get characters with filter
curl -s "$BASE_URL/characters?select=*&is_npc=eq.false" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY"

# Get character coordinates for a frame
curl -s "$BASE_URL/character_coordinates?select=*&frame_id=eq.UUID_HERE" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY"
```

## Insert Pattern (POST)

```bash
curl -s -X POST "$BASE_URL/TABLE_NAME" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '[{"column": "value"}]'
```

## Update Pattern (PATCH)

```bash
curl -s -X PATCH "$BASE_URL/TABLE_NAME?id=eq.UUID_HERE" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"column": "new_value"}'
```

## Script Template

For complex queries, write to a temp script to avoid shell quoting issues:

```bash
cat > /tmp/query_supabase.sh << 'SCRIPT'
#!/bin/bash
SERVICE_KEY="..."
BASE_URL="https://piqxyfmzzywxzqkzmpmm.supabase.co/rest/v1"

curl -s "$BASE_URL/characters?select=id,name" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY"
SCRIPT
chmod +x /tmp/query_supabase.sh && /tmp/query_supabase.sh
```

## Notes

- Use `ANON_KEY` for reads (subject to RLS policies)
- Use `SERVICE_KEY` for writes and bypassing RLS
- RLS may hide data from anon key that exists when queried with service key
- Supabase CLI `npx supabase db dump` requires Docker
