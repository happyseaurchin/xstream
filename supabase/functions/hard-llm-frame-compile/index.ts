// ============================================================
// HARD-LLM FRAME COMPILE
// Phase 0.8: Assembles operational context for Medium-LLM
// ============================================================

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FrameCompileRequest {
  character_id: string;
  action_pscale?: number;  // Optional: derives from recent shelf entry if not provided
}

interface Aperture {
  floor: number;
  ceiling: number;
}

interface CharacterState {
  character_id: string;
  name: string;
  description?: string;
  spatial: string;
  temporal: string;
  is_npc: boolean;
}

interface ContentEntry {
  id: string;
  content_type: string;
  name: string;
  data: Record<string, unknown>;
  spatial?: string;
  temporal?: string;
  pscale_floor?: number;
  pscale_ceiling?: number;
}

interface OperationalFrame {
  character_id: string;
  frame_id: string;
  coordinates: {
    spatial: string;
    temporal: string;
  };
  proximity: {
    close: CharacterState[];
    nearby: string[];
  };
  content: ContentEntry[];
  aperture: Aperture;
  compiled_at: string;
}

/**
 * Calculate shared prefix length between two coordinates.
 */
function sharedPrefixLength(coordA: string, coordB: string): number {
  const normalize = (c: string) => c.includes('.') ? c : c + '.';
  const a = normalize(coordA);
  const b = normalize(coordB);
  
  let shared = 0;
  const minLen = Math.min(a.length, b.length);
  
  for (let i = 0; i < minLen; i++) {
    if (a[i] !== b[i]) break;
    if (a[i] !== '.') shared++;
  }
  
  return shared;
}

/**
 * Calculate aperture from action pscale.
 * Extends 2 levels in each direction.
 */
function calculateAperture(actionPscale: number): Aperture {
  return {
    floor: actionPscale - 2,
    ceiling: actionPscale + 2
  };
}

/**
 * Check if content is relevant based on spatial overlap and aperture.
 */
function isContentRelevant(
  characterSpatial: string,
  aperture: Aperture,
  contentSpatial: string | null | undefined,
  contentFloor: number | null | undefined,
  contentCeiling: number | null | undefined
): boolean {
  // Spatial relevance: any prefix overlap
  const spatialMatch = contentSpatial
    ? sharedPrefixLength(characterSpatial, contentSpatial) > 0
    : true;  // Content without spatial is always spatially relevant
  
  // Aperture relevance: ranges overlap
  const cFloor = contentFloor ?? -10;
  const cCeiling = contentCeiling ?? 10;
  const apertureMatch = 
    cFloor <= aperture.ceiling && 
    cCeiling >= aperture.floor;
  
  return spatialMatch && apertureMatch;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { character_id, action_pscale: requestedPscale } = await req.json() as FrameCompileRequest;
    
    if (!character_id) {
      return new Response(
        JSON.stringify({ error: 'Missing character_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get character's coordinates
    const { data: coords, error: coordsError } = await supabase
      .from('character_coordinates')
      .select('frame_id, spatial, temporal')
      .eq('character_id', character_id)
      .single();

    if (coordsError || !coords) {
      console.error('Error fetching coordinates:', coordsError);
      return new Response(
        JSON.stringify({ error: 'Character coordinates not found', details: coordsError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const frame_id = coords.frame_id;

    // 2. Determine action pscale (from request or recent shelf entry)
    let actionPscale = requestedPscale ?? 0;
    
    if (requestedPscale === undefined) {
      // Try to get from recent shelf entry
      const { data: recentAction } = await supabase
        .from('shelf')
        .select('action_pscale')
        .eq('frame_id', frame_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (recentAction?.action_pscale != null) {
        actionPscale = recentAction.action_pscale;
      }
    }

    const aperture = calculateAperture(actionPscale);

    // 3. Get character's proximity list
    const { data: proximity } = await supabase
      .from('character_proximity')
      .select('close, nearby')
      .eq('character_id', character_id)
      .single();

    const closeIds = proximity?.close || [];
    const nearbyIds = proximity?.nearby || [];

    // 4. Get full state for close characters
    let closeStates: CharacterState[] = [];
    if (closeIds.length > 0) {
      const { data: closeData } = await supabase
        .from('characters')
        .select(`
          id,
          name,
          description,
          is_npc,
          character_coordinates (
            spatial,
            temporal
          )
        `)
        .in('id', closeIds);

      closeStates = (closeData || []).map((char: Record<string, unknown>) => {
        const coordData = char.character_coordinates as { spatial: string; temporal: string }[] | undefined;
        return {
          character_id: char.id as string,
          name: char.name as string,
          description: char.description as string | undefined,
          is_npc: char.is_npc as boolean,
          spatial: coordData?.[0]?.spatial || '0.',
          temporal: coordData?.[0]?.temporal || '0.'
        };
      });
    }

    // 5. Get frame's cosmology for content filtering
    const { data: frame } = await supabase
      .from('frames')
      .select('cosmology_id')
      .eq('id', frame_id)
      .single();

    // 6. Get all content for this cosmology
    const { data: allContent } = await supabase
      .from('content')
      .select('id, content_type, name, data, spatial, temporal, pscale_floor, pscale_ceiling')
      .eq('cosmology_id', frame?.cosmology_id)
      .eq('active', true);

    // 7. Filter content by spatial overlap and aperture
    const relevantContent: ContentEntry[] = (allContent || [])
      .filter((c: ContentEntry) => isContentRelevant(
        coords.spatial,
        aperture,
        c.spatial,
        c.pscale_floor,
        c.pscale_ceiling
      ));

    // 8. Assemble operational frame
    const now = new Date().toISOString();
    const operationalFrame: OperationalFrame = {
      character_id,
      frame_id,
      coordinates: {
        spatial: coords.spatial,
        temporal: coords.temporal
      },
      proximity: {
        close: closeStates,
        nearby: nearbyIds
      },
      content: relevantContent,
      aperture,
      compiled_at: now
    };

    // 9. Cache the compiled frame
    const { error: cacheError } = await supabase
      .from('character_context')
      .upsert({
        character_id,
        frame_id,
        context_content: operationalFrame,
        aperture_floor: aperture.floor,
        aperture_ceiling: aperture.ceiling,
        compiled_at: now,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 min expiry
      }, {
        onConflict: 'character_id'
      });

    if (cacheError) {
      console.error('Error caching frame:', cacheError);
      // Continue anyway - caching is optimization, not critical
    }

    // Return the operational frame
    return new Response(
      JSON.stringify(operationalFrame),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in hard-llm-frame-compile:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
