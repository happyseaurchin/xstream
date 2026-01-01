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
  trigger: 'synthesis-complete' | 'action-commit' | 'time-advance' | 'manual';
  frame_id: string;
  character_ids: string[];
  narrative?: string;
  action_pscale?: number;
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

interface HardLLMOutput {
  thinking_summary: string;
  coordinate_updates: CoordinateUpdate[];
  proximity_updates: ProximityUpdate[];
  operational_frames: OperationalFrame[];
  semantic_numbers_extracted: SemanticNumberExtraction[];
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Calculate shared prefix length between two coordinates.
 * This is the only "algorithm" - all decision logic is in skills.
 */
function sharedPrefixLength(coordA: string, coordB: string): number {
  const a = coordA.includes('.') ? coordA : coordA + '.';
  const b = coordB.includes('.') ? coordB : coordB + '.';
  
  let shared = 0;
  const minLen = Math.min(a.length, b.length);
  
  for (let i = 0; i < minLen; i++) {
    if (a[i] !== b[i]) break;
    if (a[i] !== '.') shared++;
  }
  
  return shared;
}

/**
 * Format tabulation for inclusion in prompt.
 */
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
  // Load characters
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
  
  // Load coordinates
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

function buildHardLLMPrompt(
  skills: Skill[],
  cosmology: Cosmology | null,
  characters: Character[],
  coordinates: CharacterCoordinate[],
  content: ContentEntry[],
  request: HardLLMRequest
): string {
  const parts: string[] = [];
  
  // Header
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
    if (cosmology.description) {
      parts.push(`Description: ${cosmology.description}\n`);
    }
    if (cosmology.physics_rules) {
      parts.push(`Physics: ${cosmology.physics_rules}\n`);
    }
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
    if (coord) {
      parts.push(`  - Spatial: ${coord.spatial}, Temporal: ${coord.temporal}`);
    }
    if (char.description) {
      parts.push(`  - ${char.description.slice(0, 100)}...`);
    }
    parts.push('');
  }
  
  // Content
  if (content.length > 0) {
    parts.push('\n## Available Content\n');
    for (const c of content.slice(0, 20)) { // Limit to 20 entries
      parts.push(`- **${c.name}** (${c.content_type})`);
      if (c.spatial) parts.push(`  - Spatial: ${c.spatial}`);
      if (c.pscale_floor !== null || c.pscale_ceiling !== null) {
        parts.push(`  - Pscale range: ${c.pscale_floor ?? 'any'} to ${c.pscale_ceiling ?? 'any'}`);
      }
    }
    parts.push('');
  }
  
  // Trigger info
  parts.push(`\n## Trigger\nType: ${request.trigger}`);
  if (request.action_pscale !== undefined) {
    parts.push(`Action Pscale: ${request.action_pscale}`);
  }
  
  // Narrative to analyze
  if (request.narrative) {
    parts.push(`\n## Narrative to Analyze\n${request.narrative}`);
  }
  
  // Task
  parts.push(`\n## Task\nUsing the skills above:
1. Determine if any coordinates changed (use hard-movement skill)
2. Calculate proximity for all characters (use hard-proximity skill)  
3. Assemble operational frames for requested characters (use hard-frame-assembly skill)
4. Extract semantic-numbers from narrative if present (use hard-semantic-extraction skill)\n`);
  
  // Output format
  parts.push(`## Output Format\nRespond with ONLY valid JSON (no markdown, no explanation):
{
  "thinking_summary": "Brief summary of your reasoning",
  "coordinate_updates": [
    { "character_id": "uuid", "spatial": "new-spatial", "temporal": "new-temporal", "reasoning": "why" }
  ],
  "proximity_updates": [
    { "character_id": "uuid", "close": ["uuid", ...], "nearby": ["uuid", ...], "distant": ["uuid", ...] }
  ],
  "operational_frames": [
    {
      "character_id": "uuid",
      "frame_id": "uuid",
      "character_name": "name",
      "character_description": "desc",
      "coordinates": { "spatial": "13.", "temporal": "234.1" },
      "close_characters": [{ "id": "uuid", "name": "name", "description": "desc", "spatial": "13." }],
      "nearby_character_ids": ["uuid", ...],
      "relevant_content": [{ "id": "uuid", "content_type": "type", "name": "name", "data": {} }],
      "aperture": { "floor": -2, "ceiling": 2 },
      "compiled_at": "ISO timestamp"
    }
  ],
  "semantic_numbers_extracted": [
    {
      "character_id": "uuid",
      "vectors": [{ "phrase": "action-phrase", "pscale": 0, "magnitude": 5 }],
      "pure_number": 5.0
    }
  ]
}`);
  
  return parts.join('\n');
}

// ============================================================
// RESPONSE PARSING
// ============================================================

function parseHardLLMResponse(responseText: string): HardLLMOutput | null {
  try {
    // Try to extract JSON from response
    let jsonStr = responseText.trim();
    
    // Remove markdown code blocks if present
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

async function applyProximityUpdates(
  supabase: any,
  updates: ProximityUpdate[]
): Promise<void> {
  for (const update of updates) {
    const { error } = await supabase
      .from('character_proximity')
      .upsert({
        character_id: update.character_id,
        close: update.close,
        nearby: update.nearby,
        distant: update.distant,
        coordinated_at: new Date().toISOString(),
      }, {
        onConflict: 'character_id',
      });
    
    if (error) {
      console.error('Error updating proximity:', error);
    }
  }
}

async function cacheOperationalFrames(
  supabase: any,
  frames: OperationalFrame[]
): Promise<void> {
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
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min expiry
      }, {
        onConflict: 'character_id',
      });
    
    if (error) {
      console.error('Error caching operational frame:', error);
    }
  }
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

    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const request: HardLLMRequest = await req.json();

    if (!request.frame_id) {
      throw new Error('frame_id is required');
    }

    console.log('[Hard-LLM] Starting coordination:', {
      trigger: request.trigger,
      frame_id: request.frame_id.slice(0, 8),
      character_count: request.character_ids?.length || 'all',
      has_narrative: !!request.narrative,
    });

    // 1. Load Hard-LLM skills
    const skills = await loadHardSkills(supabase);
    console.log(`[Hard-LLM] Loaded ${skills.length} skills`);

    // 2. Load cosmology
    const cosmology = await loadCosmology(supabase, request.frame_id);
    console.log(`[Hard-LLM] Cosmology: ${cosmology?.name || 'none'}`);

    // 3. Load characters and coordinates
    const { characters, coordinates } = await loadCharactersWithCoordinates(
      supabase,
      request.frame_id,
      request.character_ids || []
    );
    console.log(`[Hard-LLM] Characters: ${characters.length}, Coordinates: ${coordinates.length}`);

    // 4. Load content
    const content = cosmology 
      ? await loadContent(supabase, cosmology.id)
      : [];
    console.log(`[Hard-LLM] Content entries: ${content.length}`);

    // 5. Build prompt
    const prompt = buildHardLLMPrompt(
      skills,
      cosmology,
      characters,
      coordinates,
      content,
      request
    );

    // 6. Invoke Claude with extended thinking
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
        thinking: {
          type: 'enabled',
          budget_tokens: 8000,
        },
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`);
    }

    const claudeResult = await claudeResponse.json();

    // Extract text response (skip thinking blocks)
    let responseText = '';
    for (const block of claudeResult.content || []) {
      if (block.type === 'text') {
        responseText = block.text;
        break;
      }
    }

    console.log('[Hard-LLM] Got response, parsing...');

    // 7. Parse response
    const result = parseHardLLMResponse(responseText);
    
    if (!result) {
      throw new Error('Failed to parse Hard-LLM response');
    }

    console.log('[Hard-LLM] Parsed result:', {
      thinking: result.thinking_summary.slice(0, 100),
      coordinate_updates: result.coordinate_updates.length,
      proximity_updates: result.proximity_updates.length,
      operational_frames: result.operational_frames.length,
      semantic_extractions: result.semantic_numbers_extracted.length,
    });

    // 8. Apply updates
    if (result.coordinate_updates.length > 0) {
      await applyCoordinateUpdates(supabase, request.frame_id, result.coordinate_updates);
    }

    if (result.proximity_updates.length > 0) {
      await applyProximityUpdates(supabase, result.proximity_updates);
    }

    if (result.operational_frames.length > 0) {
      await cacheOperationalFrames(supabase, result.operational_frames);
    }

    // 9. Log semantic extractions (not stored in 0.8)
    if (result.semantic_numbers_extracted.length > 0) {
      console.log('[Hard-LLM] Semantic numbers extracted (logged, not stored):');
      for (const sn of result.semantic_numbers_extracted) {
        console.log(`  ${sn.character_id.slice(0, 8)}: ${sn.pure_number} - ${sn.vectors.map(v => v.phrase).join(', ')}`);
      }
    }

    // 10. Return result
    return new Response(
      JSON.stringify({
        success: true,
        thinking_summary: result.thinking_summary,
        coordinate_updates: result.coordinate_updates,
        proximity_updates: result.proximity_updates,
        operational_frames: result.operational_frames,
        semantic_numbers_extracted: result.semantic_numbers_extracted,
        tokens_used: claudeResult.usage,
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
