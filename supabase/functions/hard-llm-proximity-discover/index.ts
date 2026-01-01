// ============================================================
// HARD-LLM PROXIMITY DISCOVER
// Phase 0.8: Calculates proximity between characters via prefix overlap
// ============================================================

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProximityDiscoveryRequest {
  character_id: string;
  frame_id: string;
}

interface CharacterCoord {
  character_id: string;
  spatial: string;
  temporal: string;
}

/**
 * Calculate shared prefix length between two coordinates.
 * Counts matching digits from left, stopping at first mismatch.
 * Decimal point must match but doesn't count toward length.
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
 * Group characters by proximity based on spatial coordinate prefix overlap.
 * 
 * ≥2 digits → close (same room or immediate vicinity)
 * 1 digit → nearby (same building or adjacent)
 * 0 digits → distant (same cosmology, no overlap)
 */
function groupByProximity(
  referenceId: string,
  referenceSpatial: string,
  others: CharacterCoord[]
): { close: string[]; nearby: string[]; distant: string[] } {
  const close: string[] = [];
  const nearby: string[] = [];
  const distant: string[] = [];
  
  for (const other of others) {
    if (other.character_id === referenceId) continue;
    
    const overlap = sharedPrefixLength(referenceSpatial, other.spatial);
    
    if (overlap >= 2) {
      close.push(other.character_id);
    } else if (overlap >= 1) {
      nearby.push(other.character_id);
    } else {
      distant.push(other.character_id);
    }
  }
  
  return { close, nearby, distant };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { character_id, frame_id } = await req.json() as ProximityDiscoveryRequest;
    
    if (!character_id || !frame_id) {
      return new Response(
        JSON.stringify({ error: 'Missing character_id or frame_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get the reference character's coordinates
    const { data: myCoords, error: myError } = await supabase
      .from('character_coordinates')
      .select('spatial, temporal')
      .eq('character_id', character_id)
      .eq('frame_id', frame_id)
      .single();

    if (myError || !myCoords) {
      console.error('Error fetching reference coordinates:', myError);
      return new Response(
        JSON.stringify({ error: 'Character coordinates not found', details: myError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get all other characters in the same frame
    const { data: others, error: othersError } = await supabase
      .from('character_coordinates')
      .select('character_id, spatial, temporal')
      .eq('frame_id', frame_id)
      .neq('character_id', character_id);

    if (othersError) {
      console.error('Error fetching other coordinates:', othersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch other characters', details: othersError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Calculate proximity groups
    const proximity = groupByProximity(
      character_id,
      myCoords.spatial,
      others || []
    );

    // 4. Upsert proximity record
    const now = new Date().toISOString();
    const { error: upsertError } = await supabase
      .from('character_proximity')
      .upsert({
        character_id,
        close: proximity.close,
        nearby: proximity.nearby,
        distant: proximity.distant,
        coordinated_at: now
      }, {
        onConflict: 'character_id'
      });

    if (upsertError) {
      console.error('Error upserting proximity:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save proximity', details: upsertError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Also update proximity for affected characters (bidirectional)
    // When A becomes close to B, B should also show A as close
    for (const closeId of proximity.close) {
      await updateOtherProximity(supabase, closeId, character_id, 'close');
    }
    for (const nearbyId of proximity.nearby) {
      await updateOtherProximity(supabase, nearbyId, character_id, 'nearby');
    }
    for (const distantId of proximity.distant) {
      await updateOtherProximity(supabase, distantId, character_id, 'distant');
    }

    // Return result
    return new Response(
      JSON.stringify({
        character_id,
        close: proximity.close,
        nearby: proximity.nearby,
        distant: proximity.distant,
        coordinated_at: now,
        total_characters: (others?.length || 0) + 1
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in hard-llm-proximity-discover:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Helper to update another character's proximity to include the reference character.
 * This keeps proximity bidirectional.
 */
async function updateOtherProximity(
  supabase: ReturnType<typeof createClient>,
  otherId: string,
  referenceId: string,
  state: 'close' | 'nearby' | 'distant'
): Promise<void> {
  // First get current proximity for the other character
  const { data: current } = await supabase
    .from('character_proximity')
    .select('close, nearby, distant')
    .eq('character_id', otherId)
    .single();

  if (!current) {
    // Create new record with just this relationship
    const record: Record<string, string[] | string> = {
      character_id: otherId,
      close: [],
      nearby: [],
      distant: [],
      coordinated_at: new Date().toISOString()
    };
    (record[state] as string[]).push(referenceId);
    
    await supabase.from('character_proximity').insert(record);
    return;
  }

  // Remove reference from all arrays (might have moved between states)
  const close = (current.close || []).filter((id: string) => id !== referenceId);
  const nearby = (current.nearby || []).filter((id: string) => id !== referenceId);
  const distant = (current.distant || []).filter((id: string) => id !== referenceId);

  // Add to correct array
  if (state === 'close') close.push(referenceId);
  else if (state === 'nearby') nearby.push(referenceId);
  else distant.push(referenceId);

  // Update
  await supabase
    .from('character_proximity')
    .update({
      close,
      nearby,
      distant,
      coordinated_at: new Date().toISOString()
    })
    .eq('character_id', otherId);
}
