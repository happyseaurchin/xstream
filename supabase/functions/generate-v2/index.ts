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
  package_name?: string;
  package_level?: string;
}

interface SkillSet {
  format?: Skill;
  guard?: Skill;
  gathering?: Skill;
  aperture?: Skill;
  weighting?: Skill;
  routing?: Skill;
  constraint?: Skill;
  parsing?: Skill;
  display?: Skill;
}

// Skill creation request parsed from LLM response
interface SkillCreateRequest {
  name: string;
  category: string;
  applies_to: string[];
  content: string;
}

/**
 * Get or create user's personal package.
 * Returns the package_id for the user's default personal package.
 */
async function getOrCreateUserPackage(
  supabase: any,
  userId: string
): Promise<string> {
  // Check if user has a personal package
  const { data: existing, error: existError } = await supabase
    .from('user_packages')
    .select('package_id')
    .eq('user_id', userId)
    .eq('is_default', true)
    .single();

  if (existing) {
    return existing.package_id;
  }

  // Create new personal package for user
  const packageId = crypto.randomUUID();
  const { error: pkgError } = await supabase
    .from('packages')
    .insert({
      id: packageId,
      name: `user-${userId.slice(0, 8)}`,
      signature: `user-${userId.slice(0, 8)}`,
      level: 'user',
      description: 'Personal skills package',
      created_by: userId,
    });

  if (pkgError) {
    console.error('Error creating user package:', pkgError);
    throw new Error('Failed to create user package');
  }

  // Link to user_packages
  const { error: linkError } = await supabase
    .from('user_packages')
    .insert({
      user_id: userId,
      package_id: packageId,
      is_default: true,
    });

  if (linkError) {
    console.error('Error linking user package:', linkError);
    // Package was created, so return it anyway
  }

  return packageId;
}

/**
 * Parse skill creation request from LLM response.
 * Looks for SKILL_CREATE block in response.
 */
function parseSkillCreateFromResponse(response: string): SkillCreateRequest | null {
  // Look for SKILL_CREATE block
  const skillMatch = response.match(/SKILL_CREATE\s*\n([\s\S]*?)(?:\n```|$)/);
  if (!skillMatch) return null;

  const block = skillMatch[1];
  
  // Parse fields
  const nameMatch = block.match(/name:\s*(.+)/);
  const categoryMatch = block.match(/category:\s*(.+)/);
  const appliesToMatch = block.match(/applies_to:\s*(.+)/);
  const contentMatch = block.match(/content:\s*\|?\s*\n([\s\S]*)/);

  if (!nameMatch || !categoryMatch || !contentMatch) {
    return null;
  }

  const name = nameMatch[1].trim();
  const category = categoryMatch[1].trim();
  const appliesTo = appliesToMatch 
    ? appliesToMatch[1].split(',').map(s => s.trim())
    : ['player', 'author', 'designer'];
  const content = contentMatch[1].trim();

  // Validate category
  const validCategories = ['gathering', 'aperture', 'weighting', 'format', 'routing', 'constraint', 'parsing', 'display'];
  if (!validCategories.includes(category)) {
    console.warn(`Invalid category: ${category}`);
    return null;
  }

  // Guard category cannot be created by users
  if (category === 'guard') {
    console.warn('Cannot create guard skills');
    return null;
  }

  return { name, category, applies_to: appliesTo, content };
}

/**
 * Create a new skill in user's personal package.
 */
async function createUserSkill(
  supabase: any,
  userId: string,
  skill: SkillCreateRequest
): Promise<Skill | null> {
  const packageId = await getOrCreateUserPackage(supabase, userId);

  const skillId = crypto.randomUUID();
  const { data, error } = await supabase
    .from('skills')
    .insert({
      id: skillId,
      name: skill.name,
      package_id: packageId,
      category: skill.category,
      applies_to: skill.applies_to,
      content: skill.content,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating skill:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    category: data.category,
    applies_to: data.applies_to,
    content: data.content,
    package_name: `user-${userId.slice(0, 8)}`,
    package_level: 'user',
  };
}

/**
 * Load skills for a given face and optional frame.
 * Resolution order: platform → frame (by priority) → user
 * Guards cannot be overridden.
 */
async function loadSkills(
  supabase: any,
  face: string,
  frameId: string | null,
  userId: string | null = null
): Promise<SkillSet> {
  const skillSet: SkillSet = {};

  // 1. Load platform skills (always apply)
  const { data: platformSkills, error: platformError } = await supabase
    .from('skills')
    .select(`
      id, name, category, applies_to, content,
      packages!inner(name, level)
    `)
    .eq('packages.level', 'platform')
    .contains('applies_to', [face]);

  if (platformError) {
    console.error('Error loading platform skills:', platformError);
  } else {
    for (const skill of platformSkills || []) {
      const processed: Skill = {
        id: skill.id,
        name: skill.name,
        category: skill.category,
        applies_to: skill.applies_to,
        content: skill.content,
        package_name: skill.packages?.name,
        package_level: skill.packages?.level,
      };
      skillSet[skill.category as keyof SkillSet] = processed;
    }
  }

  // 2. Load frame-specific skills (if frame provided)
  if (frameId) {
    const { data: framePackages, error: fpError } = await supabase
      .from('frame_packages')
      .select('package_id, priority')
      .eq('frame_id', frameId)
      .order('priority', { ascending: true });

    if (fpError) {
      console.error('Error loading frame packages:', fpError);
    } else if (framePackages && framePackages.length > 0) {
      const packageIds = framePackages.map((fp: any) => fp.package_id);
      
      const { data: frameSkills, error: fsError } = await supabase
        .from('skills')
        .select(`
          id, name, category, applies_to, content,
          package_id,
          packages!inner(name, level)
        `)
        .in('package_id', packageIds)
        .contains('applies_to', [face]);

      if (fsError) {
        console.error('Error loading frame skills:', fsError);
      } else {
        const priorityMap = new Map(framePackages.map((fp: any) => [fp.package_id, fp.priority]));
        const sortedSkills = (frameSkills || []).sort((a: any, b: any) => {
          const pA = priorityMap.get(a.package_id) || 0;
          const pB = priorityMap.get(b.package_id) || 0;
          return pA - pB;
        });

        for (const skill of sortedSkills) {
          if (skill.category !== 'guard') {
            const processed: Skill = {
              id: skill.id,
              name: skill.name,
              category: skill.category,
              applies_to: skill.applies_to,
              content: skill.content,
              package_name: skill.packages?.name,
              package_level: skill.packages?.level,
            };
            skillSet[skill.category as keyof SkillSet] = processed;
          }
        }
      }
    }
  }

  // 3. Load user skills (if user provided)
  if (userId) {
    // Get user's packages
    const { data: userPackages, error: upError } = await supabase
      .from('user_packages')
      .select('package_id')
      .eq('user_id', userId);

    if (upError) {
      console.error('Error loading user packages:', upError);
    } else if (userPackages && userPackages.length > 0) {
      const packageIds = userPackages.map((up: any) => up.package_id);
      
      const { data: userSkills, error: usError } = await supabase
        .from('skills')
        .select(`
          id, name, category, applies_to, content,
          packages!inner(name, level)
        `)
        .in('package_id', packageIds)
        .contains('applies_to', [face]);

      if (usError) {
        console.error('Error loading user skills:', usError);
      } else {
        // User skills override frame skills (except guards)
        for (const skill of userSkills || []) {
          if (skill.category !== 'guard') {
            const processed: Skill = {
              id: skill.id,
              name: skill.name,
              category: skill.category,
              applies_to: skill.applies_to,
              content: skill.content,
              package_name: skill.packages?.name,
              package_level: skill.packages?.level,
            };
            skillSet[skill.category as keyof SkillSet] = processed;
          }
        }
      }
    }
  }

  return skillSet;
}

/**
 * Get user's created skills.
 */
async function getUserSkills(
  supabase: any,
  userId: string
): Promise<Skill[]> {
  const { data: userPackages } = await supabase
    .from('user_packages')
    .select('package_id')
    .eq('user_id', userId);

  if (!userPackages || userPackages.length === 0) {
    return [];
  }

  const packageIds = userPackages.map((up: any) => up.package_id);
  
  const { data: skills, error } = await supabase
    .from('skills')
    .select(`
      id, name, category, applies_to, content,
      packages!inner(name, level)
    `)
    .in('package_id', packageIds);

  if (error) {
    console.error('Error loading user skills:', error);
    return [];
  }

  return (skills || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    applies_to: s.applies_to,
    content: s.content,
    package_name: s.packages?.name,
    package_level: s.packages?.level,
  }));
}

/**
 * Compile prompt using loaded skills.
 * For designer face, merge designer-skill-creation with format.
 */
function compilePrompt(
  skills: SkillSet,
  entry: ShelfEntry
): { systemPrompt: string; userPrompt: string } {
  
  let systemPrompt = '';
  
  if (skills.format) {
    systemPrompt = skills.format.content;
  } else {
    systemPrompt = `You are helping a ${entry.face} in a narrative coordination system.`;
  }

  // Add guard skill content (always enforced)
  if (skills.guard) {
    systemPrompt += '\n\n---\n\n' + skills.guard.content;
  }

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

    const body = await req.json();

    // Handle list_skills request (for designer UI)
    if (body.action === 'list_skills') {
      const userId = body.user_id;
      if (!userId) {
        throw new Error('user_id required for list_skills');
      }
      const skills = await getUserSkills(supabase, userId);
      return new Response(
        JSON.stringify({ success: true, skills }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request - accept either shelf_entry_id or direct input
    let entry: ShelfEntry;

    if (body.shelf_entry_id) {
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

    // Load skills for this face and frame (including user skills)
    const skills = await loadSkills(supabase, entry.face, entry.frame_id, entry.user_id);

    console.log('Loaded skills:', {
      face: entry.face,
      frame_id: entry.frame_id,
      user_id: entry.user_id,
      skills: Object.entries(skills).map(([cat, s]) => ({
        category: cat,
        name: (s as Skill).name,
        package: (s as Skill).package_name,
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

    // For designer face, check if response contains skill creation
    let createdSkill: Skill | null = null;
    if (entry.face === 'designer' && entry.user_id && entry.user_id !== 'anonymous') {
      const skillRequest = parseSkillCreateFromResponse(generatedText);
      if (skillRequest) {
        createdSkill = await createUserSkill(supabase, entry.user_id, skillRequest);
        console.log('Created skill:', createdSkill);
      }
    }

    // Return response with metadata
    return new Response(
      JSON.stringify({
        success: true,
        text: generatedText,
        created_skill: createdSkill,
        metadata: {
          face: entry.face,
          frame_id: entry.frame_id,
          user_id: entry.user_id,
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
