# Xstream n8n MCP Workflow Setup

## Target Workflow
- ID: K3y5AgQYFSTllQjm
- Name: xstream-orchestration
- URL: https://onen.app.n8n.cloud/mcp-server/http

## Required Tools to Expose via MCP

### 1. `xstream_create_room`
Create a new game room.
```json
{ "scenario": "string (optional)" }
```
Returns: `{ room_id: "xxx" }`

### 2. `xstream_join_room`
Add a character to a room.
```json
{ "room_id": "string", "character_name": "string" }
```
Returns: `{ character_id: "xxx" }`

### 3. `xstream_get_room`
Get room state.
```json
{ "room_id": "string" }
```
Returns: Room + characters + latest narrative

### 4. `xstream_submit_action`
Submit/commit character action.
```json
{ "character_id": "string", "prompt": "string", "pscale": "integer (optional)" }
```

### 5. `xstream_add_narrative`
Add compiled narrative.
```json
{ "room_id": "string", "narrative_text": "string" }
```

## Supabase Tables (xstream project)
- `rooms` (id, scenario, timestamps)
- `characters` (id, room_id, name, submitted_prompt, committed_prompt, pscale, timestamps)
- `narratives` (id, room_id, text, compiled_from, created_at)
