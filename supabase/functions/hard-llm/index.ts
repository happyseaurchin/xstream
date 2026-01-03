import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// TYPES
// ============================================================

interface HardLLMRequest {
  trigger: 'synthesis-complete' | 'author-synthesis' | 'action-commit' | 'time-advance' | 'manual';
  frame_id: string;
  character_ids?: string[];
  narrative?: string;
  action_pscale?: number;
  face?: string;
  // For author-synthesis: original liquid submissions
  liquid_content?: { user_id: string; user_name: string; content: string }[];
}

interface Skill {
  id: string;
  name: string;
  content: string;
}

interface Character {
  id: string;
  name: string;
  description: string | null;
  is_npc: boolean;
}

interface CharacterCoordinate {
  character_id: string;
  spatial: string;
  temporal: string;
  focus: string | null;
}

interface ContentEntry {
  id: string;
  content_type: string;
  name: string;
  data: Record<string, any>;
  spatial: string | null;
  temporal: string | null;
  pscale_floor: number | null;
  pscale_ceiling: number | null;
}

interface Cosmology {
  id: string;
  name: string;
  description: string | null;
  physics_rules: string | null;
  spatial_tabulation: Record<string, Record<string, string>>;
  temporal_tabulation: Record<string, Record<string, string>>;
}

interface CoordinateUpdate {
  character_id: string;
  spatial?: string;
  temporal?: string;
  reasoning: string;
}

interface ProximityUpdate {
  character_id: string;
  close: string[];
  nearby: string[];
  distant: string[];
}

interface OperationalFrame {
  character_id: string;
  frame_id: string;
  character_name: string;
  character_description: string | null;
  coordinates: { spatial: string; temporal: string };
  close_characters: { id: string; name: string; description: string | null; spatial: string }[];
  nearby_character_ids: string[];
  relevant_content: ContentEntry[];
  aperture: { floor: number; ceiling: number };
  compiled_at: string;
}

interface SemanticVector {
  phrase: string;
  pscale: number;
  magnitude: number;
}

interface SemanticNumberExtraction {
  character_id: string;
  vectors: SemanticVector[];
  pure_number: number;
}

// Phase 0.10.3: Entity classification for author content
interface EntityExtraction {
  type: 'character' | 'location' | 'item' | 'event' | 'faction' | 'lore';
  name: string;
  description: string;
  is_npc?: boolean;  // For character type
}

interface HardLLMOutput {
  thinking_summary: string;
  coordinate_updates: CoordinateUpdate[];
  proximity_updates: ProximityUpdate[];
  operational_frames: OperationalFrame[];
  semantic_numbers_extracted: SemanticNumberExtraction[];
  // Phase 0.10.3: Entity extraction for author synthesis
  entities_extracted?: EntityExtraction[];
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function formatTabulation(tabulation: Record<string, Record<string, string>>): string {
  const lines: string[] = [];
  const levels = Object.keys(tabulation).sort((a, b) => {
    const numA = parseInt(a.replace('+', ''));
    const numB = parseInt(b.replace('+', ''));
    return numB - numA;
  });
  
  for (const level of levels) {
    const entries = tabulation[level];
    const entryStrs = Object.entries(entries)
      .map(([digit, name]) => `${digit}="${name}"`)
      .join(', ');
    lines.push(`Pscale ${level}: ${entryStrs}`);
  }
  
  return lines.join('\n');
}

// ============================================================
// DATA LOADING
// ============================================================

async function loadHardSkills(supabase: any): Promise<Skill[]> {
  const { data, error } = await supabase
    .from('skills')
    .select('id, name, content')
    .eq('category', 'hard');
  
  if (error) {
    console.error('Error loading hard skills:', error);
    return [];
  }
  
  return data || [];
}

async function loadCosmology(supabase: any, frameId: string): Promise<Cosmology | null> {
  const { data: frame } = await supabase
    .from('frames')
    .select('cosmology_id')
    .eq('id', frameId)
    .single();
  
  if (!frame?.cosmology_id) return null;
  
  const { data: cosmology, error } = await supabase
    .from('cosmologies')
    .select('*')
    .eq('id', frame.cosmology_id)
    .single();
  
  if (error) {
    console.error('Error loading cosmology:', error);
    return null;
  }
  
  return cosmology;
}

async function loadCharactersWithCoordinates(
  supabase: any,
  frameId: string,
  characterIds: string[]
): Promise<{ characters: Character[]; coordinates: CharacterCoordinate[] }> {
  let charactersQuery = supabase
    .from('characters')
    .select('id, name, description, is_npc');
  
  if (characterIds.length > 0) {
    charactersQuery = charactersQuery.in('id', characterIds);
  }
  
  const { data: characters, error: charError } = await charactersQuery;
  
  if (charError) {
    console.error('Error loading characters:', charError);
    return { characters: [], coordinates: [] };
  }
  
  const charIds = (characters || []).map((c: Character) => c.id);
  
  if (charIds.length === 0) {
    return { characters: characters || [], coordinates: [] };
  }
  
  const { data: coordinates, error: coordError } = await supabase
    .from('character_coordinates')
    .select('character_id, spatial, temporal, focus')
    .in('character_id', charIds)
    .eq('frame_id', frameId);
  
  if (coordError) {
    console.error('Error loading coordinates:', coordError);
  }
  
  return {
    characters: characters || [],
    coordinates: coordinates || [],
  };
}

async function loadContent(supabase: any, cosmologyId: string): Promise<ContentEntry[]> {
  const { data, error } = await supabase
    .from('content')
    .select('id, content_type, name, data, spatial, temporal, pscale_floor, pscale_ceiling')
    .eq('cosmology_id', cosmologyId)
    .eq('active', true);
  
  if (error) {
    console.error('Error loading content:', error);
    return [];
  }
  
  return data || [];
}

// ============================================================
// PROMPT ASSEMBLY
// ============================================================

/**
 * Build prompt for player/character face (coordinate updates, proximity, frames)
 */
function buildPlayerPrompt(
  skills: Skill[],
  cosmology: Cosmology | null,
  characters: Character[],
  coordinates: CharacterCoordinate[],
  content: ContentEntry[],
  request: HardLLMRequest
): string {
  const parts: string[] = [];
  
  parts.push(`# Hard-LLM Coordination Task

## Your Role
You are the coordination layer for a narrative system. You determine where characters are, who they can interact with, and what they can perceive. Use the skills below to guide your reasoning.`);
  
  // Skills
  parts.push('\n## Skills\n');
  for (const skill of skills) {
    parts.push(`### ${skill.name}\n${skill.content}\n`);
  }
  
  // Cosmology
  if (cosmology) {
    parts.push(`\n## Cosmology: ${cosmology.name}\n`);
    if (cosmology.description) parts.push(`Description: ${cosmology.description}\n`);
    if (cosmology.physics_rules) parts.push(`Physics: ${cosmology.physics_rules}\n`);
    if (Object.keys(cosmology.spatial_tabulation || {}).length > 0) {
      parts.push(`\n### Spatial Tabulation\n${formatTabulation(cosmology.spatial_tabulation)}\n`);
    }
    if (Object.keys(cosmology.temporal_tabulation || {}).length > 0) {
      parts.push(`\n### Temporal Tabulation\n${formatTabulation(cosmology.temporal_tabulation)}\n`);
    }
  }
  
  // Characters and coordinates
  parts.push('\n## Characters in Frame\n');
  for (const char of characters) {
    const coord = coordinates.find(c => c.character_id === char.id);
    parts.push(`- **${char.name}** (${char.id.slice(0, 8)})`);
    if (coord) parts.push(`  - Spatial: ${coord.spatial}, Temporal: ${coord.temporal}`);
    if (char.description) parts.push(`  - ${char.description.slice(0, 100)}...`);
    parts.push('');
  }
  
  // Content
  if (content.length > 0) {
    parts.push('\n## Available Content\n');
    for (const c of content.slice(0, 20)) {
      parts.push(`- **${c.name}** (${c.content_type})`);
      if (c.spatial) parts.push(`  - Spatial: ${c.spatial}`);
      if (c.pscale_floor !== null || c.pscale_ceiling !== null) {
        parts.push(`  - Pscale range: ${c.pscale_floor ?? 'any'} to ${c.pscale_ceiling ?? 'any'}`);
      }
    }
    parts.push('');
  }
  
  parts.push(`\n## Trigger\nType: ${request.trigger}`);
  if (request.action_pscale !== undefined) parts.push(`Action Pscale: ${request.action_pscale}`);
  if (request.narrative) parts.push(`\n## Narrative to Analyze\n${request.narrative}`);
  
  parts.push(`\n## Task
Using the skills above:
1. Determine if any coordinates changed (use hard-movement skill)
2. Calculate proximity for all characters (use hard-proximity skill)  
3. Assemble operational frames for requested characters (use hard-frame-assembly skill)
4. Extract semantic-numbers from narrative if present (use hard-semantic-extraction skill)\n`);
  
  parts.push(`## Output Format
Respond with ONLY valid JSON:
{
  "thinking_summary": "Brief summary",
  "coordinate_updates": [{ "character_id": "uuid", "spatial": "coord", "temporal": "coord", "reasoning": "why" }],
  "proximity_updates": [{ "character_id": "uuid", "close": [], "nearby": [], "distant": [] }],
  "operational_frames": [],
  "semantic_numbers_extracted": []
}`);
  
  return parts.join('\n');
}

/**
 * Phase 0.10.3: Build prompt for author face (content classification, entity filing)
 */
function buildAuthorPrompt(
  skills: Skill[],
  cosmology: Cosmology | null,
  existingContent: ContentEntry[],
  existingCharacters: Character[],
  request: HardLLMRequest
): string {
  const parts: string[] = [];
  
  parts.push(`# Hard-LLM Content Classification Task

## Your Role
You analyze synthesized author content to:
1. Identify named entities (characters, locations, items, events, factions, lore)
2. Classify content for filing
3. Extract structured data for database storage

You are NOT creating content - you are analyzing what authors have created.`);

  // Skills (if any apply to author content classification)
  if (skills.length > 0) {
    parts.push('\n## Skills\n');
    for (const skill of skills) {
      parts.push(`### ${skill.name}\n${skill.content}\n`);
    }
  }

  // Cosmology context
  if (cosmology) {
    parts.push(`\n## Cosmology: ${cosmology.name}`);
    if (cosmology.description) parts.push(`Description: ${cosmology.description}`);
  }

  // Existing entities (to avoid duplicates)
  if (existingCharacters.length > 0) {
    parts.push('\n## Existing Characters (do not duplicate)\n');
    for (const char of existingCharacters) {
      parts.push(`- ${char.name}`);
    }
  }
  
  if (existingContent.length > 0) {
    parts.push('\n## Existing Content (do not duplicate)\n');
    for (const c of existingContent.slice(0, 30)) {
      parts.push(`- ${c.name} (${c.content_type})`);
    }
  }

  // Author liquid content (original submissions)
  if (request.liquid_content && request.liquid_content.length > 0) {
    parts.push('\n## Original Author Submissions\n');
    for (const entry of request.liquid_content) {
      parts.push(`**${entry.user_name}:**\n${entry.content}\n`);
    }
  }

  // Synthesized narrative
  if (request.narrative) {
    parts.push(`\n## Synthesized Content (Medium-LLM output)\n${request.narrative}`);
  }

  parts.push(`\n## Task
Analyze the content above and extract NAMED ENTITIES that should be filed to the database.

ENTITY TYPES:
- character: People, creatures, beings with agency (set is_npc: true for NPCs)
- location: Places, buildings, regions, geographic features
- item: Objects, artifacts, equipment
- event: Things that happened or will happen
- faction: Groups, organizations, cultures
- lore: Background information, legends, rules

RULES:
1. Only extract entities with CLEAR NAMES (not "a merchant" but "Korven the Trapper")
2. Descriptions should be CONCISE (50-150 words)
3. Do NOT duplicate existing entities
4. If content describes an existing entity, do NOT extract it again
5. If no clear named entities, return empty array

## Output Format
Respond with ONLY valid JSON:
{
  "thinking_summary": "Brief summary of analysis",
  "entities_extracted": [
    {
      "type": "character",
      "name": "Korven",
      "description": "A grizzled trapper with weathered hands and keen eyes...",
      "is_npc": true
    },
    {
      "type": "location", 
      "name": "The Rusty Anchor",
      "description": "A dimly lit tavern on the waterfront, smelling of salt and old ale..."
    }
  ],
  "coordinate_updates": [],
  "proximity_updates": [],
  "operational_frames": [],
  "semantic_numbers_extracted": []
}`);

  return parts.join('\n');
}

// ============================================================
// RESPONSE PARSING
// ============================================================

function parseHardLLMResponse(responseText: string): HardLLMOutput | null {
  try {
    let jsonStr = responseText.trim();
    
    if (jsonStr.startsWith('```')) {
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) jsonStr = match[1].trim();
    }
    
    const parsed = JSON.parse(jsonStr);
    
    return {
      thinking_summary: parsed.thinking_summary || '',
      coordinate_updates: parsed.coordinate_updates || [],
      proximity_updates: parsed.proximity_updates || [],
      operational_frames: parsed.operational_frames || [],
      semantic_numbers_extracted: parsed.semantic_numbers_extracted || [],
      entities_extracted: parsed.entities_extracted || [],
    };
  } catch (e) {
    console.error('Failed to parse Hard-LLM response:', e);
    console.error('Response text:', responseText.slice(0, 500));
    return null;
  }
}

// ============================================================
// DATABASE UPDATES
// ============================================================

async function applyCoordinateUpdates(
  supabase: any,
  frameId: string,
  updates: CoordinateUpdate[]
): Promise<void> {
  for (const update of updates) {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
      updated_by: 'hard-llm',
    };
    
    if (update.spatial) updateData.spatial = update.spatial;
    if (update.temporal) updateData.temporal = update.temporal;
    
    const { error } = await supabase
      .from('character_coordinates')
      .update(updateData)
      .eq('character_id', update.character_id)
      .eq('frame_id', frameId);
    
    if (error) {
      console.error('Error updating coordinate:', error);
    } else {
      console.log(`Updated coordinates for ${update.character_id.slice(0, 8)}: ${update.reasoning}`);
    }
  }
}

async function applyProximityUpdates(supabase: any, updates: ProximityUpdate[]): Promise<void> {
  for (const update of updates) {
    const { error } = await supabase
      .from('character_proximity')
      .upsert({
        character_id: update.character_id,
        close: update.close,
        nearby: update.nearby,
        distant: update.distant,
        coordinated_at: new Date().toISOString(),
      }, { onConflict: 'character_id' });
    
    if (error) console.error('Error updating proximity:', error);
  }
}

async function cacheOperationalFrames(supabase: any, frames: OperationalFrame[]): Promise<void> {
  for (const frame of frames) {
    const { error } = await supabase
      .from('character_context')
      .upsert({
        character_id: frame.character_id,
        frame_id: frame.frame_id,
        context_content: {
          character_name: frame.character_name,
          character_description: frame.character_description,
          coordinates: frame.coordinates,
          close_characters: frame.close_characters,
          nearby_character_ids: frame.nearby_character_ids,
          relevant_content: frame.relevant_content,
        },
        aperture_floor: frame.aperture.floor,
        aperture_ceiling: frame.aperture.ceiling,
        compiled_at: frame.compiled_at,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      }, { onConflict: 'character_id' });
    
    if (error) console.error('Error caching operational frame:', error);
  }
}

/**
 * Phase 0.10.3: File extracted entities to database
 */
async function fileExtractedEntities(
  supabase: any,
  cosmologyId: string,
  entities: EntityExtraction[]
): Promise<{ characters: string[]; content: string[] }> {
  const filed = { characters: [] as string[], content: [] as string[] };
  
  for (const entity of entities) {
    if (entity.type === 'character') {
      // File to characters table
      const characterId = crypto.randomUUID();
      const { error } = await supabase
        .from('characters')
        .insert({
          id: characterId,
          cosmology_id: cosmologyId,
          name: entity.name,
          description: entity.description,
          is_npc: entity.is_npc ?? true,
          created_by: 'hard-llm',
        });
      
      if (error) {
        console.error('Error filing character:', entity.name, error);
      } else {
        console.log(`[Hard-LLM] Filed character: ${entity.name}`);
        filed.characters.push(characterId);
      }
    } else {
      // File to content table (location, item, event, faction, lore)
      const contentId = crypto.randomUUID();
      const { error } = await supabase
        .from('content')
        .insert({
          id: contentId,
          cosmology_id: cosmologyId,
          content_type: entity.type,
          name: entity.name,
          data: { description: entity.description },
          active: true,
          created_by: 'hard-llm',
        });
      
      if (error) {
        console.error('Error filing content:', entity.name, error);
      } else {
        console.log(`[Hard-LLM] Filed ${entity.type}: ${entity.name}`);
        filed.content.push(contentId);
      }
    }
  }
  
  return filed;
}

// ============================================================
// MAIN HANDLER
// ============================================================

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const supabase = createClient(supabaseUrl, supabaseKey);
    const request: HardLLMRequest = await req.json();

    if (!request.frame_id) throw new Error('frame_id is required');

    console.log('[Hard-LLM] Starting coordination:', {
      trigger: request.trigger,
      frame_id: request.frame_id.slice(0, 8),
      face: request.face || 'player',
      has_narrative: !!request.narrative,
      liquid_count: request.liquid_content?.length || 0,
    });

    // Load skills
    const skills = await loadHardSkills(supabase);
    console.log(`[Hard-LLM] Loaded ${skills.length} skills`);

    // Load cosmology
    const cosmology = await loadCosmology(supabase, request.frame_id);
    console.log(`[Hard-LLM] Cosmology: ${cosmology?.name || 'none'}`);

    let prompt: string;
    let result: HardLLMOutput;
    let entitiesFiled: { characters: string[]; content: string[] } | undefined;

    // Branch based on trigger type
    if (request.trigger === 'author-synthesis') {
      // Phase 0.10.3: Author content classification
      console.log('[Hard-LLM] Author synthesis mode - classifying content');
      
      // Load existing entities to avoid duplicates
      const existingCharacters = cosmology 
        ? (await supabase.from('characters').select('id, name, description, is_npc').eq('cosmology_id', cosmology.id)).data || []
        : [];
      const existingContent = cosmology 
        ? await loadContent(supabase, cosmology.id)
        : [];
      
      prompt = buildAuthorPrompt(skills, cosmology, existingContent, existingCharacters, request);
      
      // Invoke Claude
      console.log('[Hard-LLM] Invoking Claude for content classification...');
      const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          thinking: { type: 'enabled', budget_tokens: 6000 },
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!claudeResponse.ok) {
        const errorText = await claudeResponse.text();
        throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`);
      }

      const claudeResult = await claudeResponse.json();
      let responseText = '';
      for (const block of claudeResult.content || []) {
        if (block.type === 'text') { responseText = block.text; break; }
      }

      result = parseHardLLMResponse(responseText) || {
        thinking_summary: 'Failed to parse',
        coordinate_updates: [],
        proximity_updates: [],
        operational_frames: [],
        semantic_numbers_extracted: [],
        entities_extracted: [],
      };

      console.log('[Hard-LLM] Parsed result:', {
        thinking: result.thinking_summary.slice(0, 80),
        entities: result.entities_extracted?.length || 0,
      });

      // File extracted entities
      if (cosmology && result.entities_extracted && result.entities_extracted.length > 0) {
        entitiesFiled = await fileExtractedEntities(supabase, cosmology.id, result.entities_extracted);
        console.log('[Hard-LLM] Filed entities:', entitiesFiled);
      }

    } else {
      // Standard player/character coordination
      const { characters, coordinates } = await loadCharactersWithCoordinates(
        supabase,
        request.frame_id,
        request.character_ids || []
      );
      console.log(`[Hard-LLM] Characters: ${characters.length}, Coordinates: ${coordinates.length}`);

      const content = cosmology ? await loadContent(supabase, cosmology.id) : [];
      console.log(`[Hard-LLM] Content entries: ${content.length}`);

      prompt = buildPlayerPrompt(skills, cosmology, characters, coordinates, content, request);

      // Invoke Claude
      console.log('[Hard-LLM] Invoking Claude with extended thinking...');
      const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 16000,
          thinking: { type: 'enabled', budget_tokens: 8000 },
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!claudeResponse.ok) {
        const errorText = await claudeResponse.text();
        throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`);
      }

      const claudeResult = await claudeResponse.json();
      let responseText = '';
      for (const block of claudeResult.content || []) {
        if (block.type === 'text') { responseText = block.text; break; }
      }

      result = parseHardLLMResponse(responseText) || {
        thinking_summary: 'Failed to parse',
        coordinate_updates: [],
        proximity_updates: [],
        operational_frames: [],
        semantic_numbers_extracted: [],
      };

      console.log('[Hard-LLM] Parsed result:', {
        thinking: result.thinking_summary.slice(0, 80),
        coordinate_updates: result.coordinate_updates.length,
        proximity_updates: result.proximity_updates.length,
        operational_frames: result.operational_frames.length,
      });

      // Apply standard updates
      if (result.coordinate_updates.length > 0) {
        await applyCoordinateUpdates(supabase, request.frame_id, result.coordinate_updates);
      }
      if (result.proximity_updates.length > 0) {
        await applyProximityUpdates(supabase, result.proximity_updates);
      }
      if (result.operational_frames.length > 0) {
        await cacheOperationalFrames(supabase, result.operational_frames);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        thinking_summary: result.thinking_summary,
        coordinate_updates: result.coordinate_updates,
        proximity_updates: result.proximity_updates,
        operational_frames: result.operational_frames,
        semantic_numbers_extracted: result.semantic_numbers_extracted,
        entities_extracted: result.entities_extracted,
        entities_filed: entitiesFiled,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Hard-LLM] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
