import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShelfEntry {
  id: string;
  user_id: string;
  frame_id: string | null;
  text: string;
  face: 'player' | 'author' | 'designer';
  state: string;
  lamina: Record<string, any>;
}

interface Skill {
  id: string;
  name: string;
  category: string;
  applies_to: string[];
  content: string;
  package: {
    id: string;
    name: string;
    level: string;
    signature: string;
  };
}

interface SkillSet {
  format?: Skill;
  guard?: Skill;
  gathering?: Skill;
  aperture?: Skill;
  weighting?: Skill;
  routing?: Skill;
  constraint?: Skill;
}

/**
 * Load skills for a given face and optional frame.
 * Resolution order: platform → frame (by priority) → user
 * Guards cannot be overridden.
 */
async function loadSkills(
  supabase: any,
  face: string,
  frameId: string | null
): Promise<SkillSet> {
  const skillSet: SkillSet = {};

  // 1. Load platform skills (always apply)
  const { data: platformSkills, error: platformError } = await supabase
    .from('skills')
    .select(`
      id, name, category, applies_to, content,
      package:packages!inner(id, name, level, signature)
    `)
    .eq('packages.level', 'platform')
    .contains('applies_to', [face]);

  if (platformError) {
    console.error('Error loading platform skills:', platformError);
  } else {
    for (const skill of platformSkills || []) {
      skillSet[skill.category as keyof SkillSet] = skill;
    }
  }

  // 2. Load frame-specific skills (if frame provided)
  if (frameId) {
    const { data: frameSkills, error: frameError } = await supabase
      .from('skills')
      .select(`
        id, name, category, applies_to, content,
        package:packages!inner(id, name, level, signature),
        frame_packages!inner(frame_id, priority)
      `)
      .eq('frame_packages.frame_id', frameId)
      .contains('applies_to', [face])
      .order('priority', { foreignTable: 'frame_packages', ascending: true });

    if (frameError) {
      console.error('Error loading frame skills:', frameError);
    } else {
      // Frame skills override platform skills (except guards)
      for (const skill of frameSkills || []) {
        if (skill.category !== 'guard') {
          skillSet[skill.category as keyof SkillSet] = skill;
        }
      }
    }
  }

  // 3. User skills would go here (future: load from user's personal package)

  return skillSet;
}

/**
 * Compile prompt using loaded skills.
 * Format skill becomes system prompt foundation.
 * Guard skills are appended (always enforced).
 */
function compilePrompt(
  skills: SkillSet,
  entry: ShelfEntry
): { systemPrompt: string; userPrompt: string } {
  
  // Use format skill content as system prompt foundation
  let systemPrompt = '';
  
  if (skills.format) {
    systemPrompt = skills.format.content;
  } else {
    // Fallback if no format skill found
    systemPrompt = `You are helping a ${entry.face} in a narrative coordination system.`;
  }

  // Add guard skill content (always enforced)
  if (skills.guard) {
    systemPrompt += '\n\n---\n\n' + skills.guard.content;
  }

  // User prompt is the shelf entry text
  const userPrompt = entry.text;

  return { systemPrompt, userPrompt };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
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

    // Parse request - accept either shelf_entry_id or direct input
    const body = await req.json();
    let entry: ShelfEntry;

    if (body.shelf_entry_id) {
      // Load from shelf
      const { data, error } = await supabase
        .from('shelf')
        .select('*')
        .eq('id', body.shelf_entry_id)
        .single();

      if (error || !data) {
        throw new Error(`Shelf entry not found: ${body.shelf_entry_id}`);
      }
      entry = data;
    } else if (body.text && body.face) {
      // Direct input (for testing / X0 ephemeral)
      entry = {
        id: 'direct',
        user_id: body.user_id || 'anonymous',
        frame_id: body.frame_id || null,
        text: body.text,
        face: body.face,
        state: 'committed',
        lamina: body.lamina || {},
      };
    } else {
      throw new Error('Either shelf_entry_id or (text + face) required');
    }

    // Load skills for this face and frame
    const skills = await loadSkills(supabase, entry.face, entry.frame_id);

    // Log which skills were loaded
    console.log('Loaded skills:', {
      face: entry.face,
      frame_id: entry.frame_id,
      skills: Object.entries(skills).map(([cat, s]) => ({
        category: cat,
        name: (s as Skill).name,
        package: (s as Skill).package?.name,
      })),
    });

    // Compile prompt
    const { systemPrompt, userPrompt } = compilePrompt(skills, entry);

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const claudeResponse = await response.json();
    const generatedText = claudeResponse.content?.[0]?.text || '';

    // Return response with metadata
    return new Response(
      JSON.stringify({
        success: true,
        text: generatedText,
        metadata: {
          face: entry.face,
          frame_id: entry.frame_id,
          skills_used: Object.entries(skills).map(([cat, s]) => ({
            category: cat,
            name: (s as Skill).name,
          })),
          model: 'claude-sonnet-4-20250514',
          tokens: claudeResponse.usage,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
