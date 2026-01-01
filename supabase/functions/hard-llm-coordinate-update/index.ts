// ============================================================
// HARD-LLM COORDINATE UPDATE
// Phase 0.8: Analyzes narrative to extract position changes
// ============================================================

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoordinateUpdateRequest {
  character_id: string;
  narrative: string;
  frame_id: string;
}

interface SemanticTabulation {
  [pscaleLevel: string]: {
    [digit: string]: string;
  };
}

// Decode coordinate using tabulation
function decodeCoordinate(coord: string, tabulation: SemanticTabulation): string[] {
  const normalized = coord.includes('.') ? coord : coord + '.';
  const [intPart, decPart = ''] = normalized.split('.');
  const result: string[] = [];
  
  for (let i = 0; i < intPart.length; i++) {
    const pscale = intPart.length - 1 - i;
    const digit = intPart[i];
    const name = tabulation[`+${pscale}`]?.[digit] || tabulation[`${pscale}`]?.[digit];
    if (name) result.push(name);
  }
  
  if (decPart) {
    for (let i = 0; i < decPart.length; i++) {
      const pscale = -(i + 1);
      const digit = decPart[i];
      const name = tabulation[`${pscale}`]?.[digit];
      if (name) result.push(name);
    }
  }
  
  return result;
}

// Format tabulation for LLM prompt
function formatTabulation(tabulation: SemanticTabulation): string {
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

// Build the coordinate extraction prompt
function buildPrompt(
  characterName: string,
  currentSpatial: string,
  currentTemporal: string,
  decodedSpatial: string,
  decodedTemporal: string,
  spatialTabFormatted: string,
  temporalTabFormatted: string,
  narrative: string
): string {
  return `# Character Coordinate Update

You are updating a character's position in narrative space after new events.

## Character State
- Name: ${characterName}
- Current spatial: ${currentSpatial} → ${decodedSpatial}
- Current temporal: ${currentTemporal} → ${decodedTemporal}

## Cosmology Tabulations

### Spatial (Where)
${spatialTabFormatted}

### Temporal (When)
${temporalTabFormatted}

## Narrative to Analyze
${narrative}

## Task

Analyze the narrative and determine:
1. Did the character's LOCATION change?
2. Did TIME pass?

Update coordinates accordingly. Match location/time references to tabulation entries.
Build coordinates from most general (left) to specific (right), with decimal separating room (0) from furniture (-1).

## Output Format (JSON only, no markdown)

{
  "spatial": {
    "changed": boolean,
    "new_value": "string or null",
    "decoded": ["location", "chain"] or null,
    "reasoning": "string"
  },
  "temporal": {
    "changed": boolean,
    "new_value": "string or null", 
    "decoded": ["time", "chain"] or null,
    "reasoning": "string"
  },
  "overall_confidence": "high" | "medium" | "low"
}`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { character_id, narrative, frame_id } = await req.json() as CoordinateUpdateRequest;
    
    if (!character_id || !narrative) {
      return new Response(
        JSON.stringify({ error: 'Missing character_id or narrative' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get current coordinates
    const { data: coords, error: coordsError } = await supabase
      .from('character_coordinates')
      .select('spatial, temporal')
      .eq('character_id', character_id)
      .single();

    if (coordsError) {
      console.error('Error fetching coordinates:', coordsError);
      return new Response(
        JSON.stringify({ error: 'Character coordinates not found', details: coordsError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get character and cosmology with tabulations
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select(`
        name, 
        cosmology_id,
        cosmologies (
          spatial_tabulation,
          temporal_tabulation
        )
      `)
      .eq('id', character_id)
      .single();

    if (charError || !character) {
      console.error('Error fetching character:', charError);
      return new Response(
        JSON.stringify({ error: 'Character not found', details: charError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cosmology = character.cosmologies as {
      spatial_tabulation: SemanticTabulation;
      temporal_tabulation: SemanticTabulation;
    };

    // 3. Decode current coordinates for context
    const decodedSpatial = decodeCoordinate(coords.spatial, cosmology.spatial_tabulation);
    const decodedTemporal = decodeCoordinate(coords.temporal, cosmology.temporal_tabulation);

    // 4. Format tabulations for prompt
    const spatialTabFormatted = formatTabulation(cosmology.spatial_tabulation);
    const temporalTabFormatted = formatTabulation(cosmology.temporal_tabulation);

    // 5. Build and send prompt to Claude
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });
    
    const prompt = buildPrompt(
      character.name,
      coords.spatial,
      coords.temporal,
      decodedSpatial.join(' → ') || '(unknown)',
      decodedTemporal.join(' → ') || '(unknown)',
      spatialTabFormatted || '(no tabulation defined)',
      temporalTabFormatted || '(no tabulation defined)',
      narrative
    );

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    // 6. Parse response
    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse LLM response', raw: responseText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(jsonMatch[0]);

    // 7. Update coordinates if changed
    const updates: Record<string, string | object> = {};
    if (result.spatial?.changed && result.spatial?.new_value) {
      updates.spatial = result.spatial.new_value;
    }
    if (result.temporal?.changed && result.temporal?.new_value) {
      updates.temporal = result.temporal.new_value;
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      updates.updated_by = 'hard-llm';
      
      const { error: updateError } = await supabase
        .from('character_coordinates')
        .update(updates)
        .eq('character_id', character_id);

      if (updateError) {
        console.error('Error updating coordinates:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update coordinates', details: updateError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Return result
    return new Response(
      JSON.stringify({
        character_id,
        spatial_changed: result.spatial?.changed || false,
        temporal_changed: result.temporal?.changed || false,
        new_spatial: result.spatial?.new_value || null,
        new_temporal: result.temporal?.new_value || null,
        reasoning: {
          spatial: result.spatial?.reasoning,
          temporal: result.temporal?.reasoning
        },
        confidence: result.overall_confidence
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in hard-llm-coordinate-update:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
