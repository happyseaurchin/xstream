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

// Soft-LLM response types
interface SoftResponse {
  type: 'artifact' | 'clarify' | 'refine';
  text: string;
  document?: string;  // For artifact type - the full SKILL_CREATE document
  options?: string[]; // For clarify type
}

/**
 * Ensure user exists in database.
 * Uses upsert to create if not exists.
 */
async function ensureUserExists(
  supabase: any,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .upsert(
      { id: userId, name: `user-${userId.slice(0, 8)}` },
      { onConflict: 'id', ignoreDuplicates: true }
    );

  if (error) {
    console.error('Error ensuring user exists:', error);
    throw new Error('Failed to ensure user exists');
  }
}

/**
 * Get or create a package for the frame.
 * Returns the package_id for the frame's custom package.
 */
async function getOrCreateFramePackage(
  supabase: any,
  frameId: string,
  userId: string
): Promise<string> {
  // First ensure user exists (for created_by FK)
  await ensureUserExists(supabase, userId);

  // Check if frame already has a custom (non-platform) package
  const { data: existingLink } = await supabase
    .from('frame_packages')
    .select(`
      package_id,
      packages!inner(id, level)
    `)
    .eq('frame_id', frameId)
    .eq('packages.level', 'frame')
    .single();

  if (existingLink?.package_id) {
    return existingLink.package_id;
  }

  // Create new package for this frame
  const packageId = crypto.randomUUID();
  const { error: pkgError } = await supabase
    .from('packages')
    .insert({
      id: packageId,
      name: `frame-${frameId.slice(0, 8)}-custom`,
      signature: `frame-${frameId.slice(0, 8)}`,
      level: 'frame',
      description: 'Custom skills for this frame',
      created_by: userId,
    });

  if (pkgError) {
    console.error('Error creating frame package:', pkgError);
    throw new Error('Failed to create frame package');
  }

  // Link to frame_packages with priority 100 (after platform, before user overrides)
  const { error: linkError } = await supabase
    .from('frame_packages')
    .insert({
      frame_id: frameId,
      package_id: packageId,
      priority: 100,
    });

  if (linkError) {
    console.error('Error linking frame package:', linkError);
  }

  return packageId;
}

/**
 * Get or create user's personal package (for drafts when no frame selected).
 * Returns the package_id for the user's default personal package.
 */
async function getOrCreateUserPackage(
  supabase: any,
  userId: string
): Promise<string> {
  await ensureUserExists(supabase, userId);

  const { data: existing } = await supabase
    .from('user_packages')
    .select('package_id')
    .eq('user_id', userId)
    .eq('is_default', true)
    .single();

  if (existing) {
    return existing.package_id;
  }

  const packageId = crypto.randomUUID();
  const { error: pkgError } = await supabase
    .from('packages')
    .insert({
      id: packageId,
      name: `user-${userId.slice(0, 8)}-drafts`,
      signature: `user-${userId.slice(0, 8)}`,
      level: 'user',
      description: 'Personal skill drafts',
      created_by: userId,
    });

  if (pkgError) {
    console.error('Error creating user package:', pkgError);
    throw new Error('Failed to create user package');
  }

  const { error: linkError } = await supabase
    .from('user_packages')
    .insert({
      user_id: userId,
      package_id: packageId,
      is_default: true,
    });

  if (linkError) {
    console.error('Error linking user package:', linkError);
  }

  return packageId;
}

/**
 * Parse skill creation request from LLM response.
 * Looks for SKILL_CREATE block in response.
 */
function parseSkillCreateFromResponse(response: string): SkillCreateRequest | null {
  const skillMatch = response.match(/SKILL_CREATE\s*\n([\s\S]*?)(?:\n```|$)/);
  if (!skillMatch) return null;

  const block = skillMatch[1];
  
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

  const validCategories = ['gathering', 'aperture', 'weighting', 'format', 'routing', 'constraint', 'parsing', 'display'];
  if (!validCategories.includes(category)) {
    console.warn(`Invalid category: ${category}`);
    return null;
  }

  if (category === 'guard') {
    console.warn('Cannot create guard skills');
    return null;
  }

  return { name, category, applies_to: appliesTo, content };
}

/**
 * Create a skill in the frame's package (or user drafts if no frame).
 */
async function createSkill(
  supabase: any,
  frameId: string | null,
  userId: string,
  skill: SkillCreateRequest
): Promise<{ skill: Skill | null; location: string }> {
  let packageId: string;
  let location: string;

  if (frameId) {
    packageId = await getOrCreateFramePackage(supabase, frameId, userId);
    location = 'frame';
  } else {
    packageId = await getOrCreateUserPackage(supabase, userId);
    location = 'drafts';
  }

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
    return { skill: null, location };
  }

  return {
    skill: {
      id: data.id,
      name: data.name,
      category: data.category,
      applies_to: data.applies_to,
      content: data.content,
      package_level: location,
    },
    location,
  };
}

/**
 * Load skills for a given face and optional frame.
 * Resolution order: platform → frame (by priority) → user
 */
async function loadSkills(
  supabase: any,
  face: string,
  frameId: string | null,
  userId: string | null = null
): Promise<SkillSet> {
  const skillSet: SkillSet = {};

  // 1. Platform skills
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
      skillSet[skill.category as keyof SkillSet] = {
        id: skill.id,
        name: skill.name,
        category: skill.category,
        applies_to: skill.applies_to,
        content: skill.content,
        package_name: skill.packages?.name,
        package_level: skill.packages?.level,
      };
    }
  }

  // 2. Frame skills
  if (frameId) {
    const { data: framePackages, error: fpError } = await supabase
      .from('frame_packages')
      .select('package_id, priority')
      .eq('frame_id', frameId)
      .order('priority', { ascending: true });

    if (!fpError && framePackages?.length > 0) {
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

      if (!fsError) {
        const priorityMap = new Map(framePackages.map((fp: any) => [fp.package_id, fp.priority]));
        const sortedSkills = (frameSkills || []).sort((a: any, b: any) => {
          return (priorityMap.get(a.package_id) || 0) - (priorityMap.get(b.package_id) || 0);
        });

        for (const skill of sortedSkills) {
          if (skill.category !== 'guard') {
            skillSet[skill.category as keyof SkillSet] = {
              id: skill.id,
              name: skill.name,
              category: skill.category,
              applies_to: skill.applies_to,
              content: skill.content,
              package_name: skill.packages?.name,
              package_level: skill.packages?.level,
            };
          }
        }
      }
    }
  }

  // 3. User skills (personal overrides)
  if (userId) {
    const { data: userPackages } = await supabase
      .from('user_packages')
      .select('package_id')
      .eq('user_id', userId);

    if (userPackages?.length > 0) {
      const packageIds = userPackages.map((up: any) => up.package_id);
      
      const { data: userSkills } = await supabase
        .from('skills')
        .select(`
          id, name, category, applies_to, content,
          packages!inner(name, level)
        `)
        .in('package_id', packageIds)
        .contains('applies_to', [face]);

      for (const skill of userSkills || []) {
        if (skill.category !== 'guard') {
          skillSet[skill.category as keyof SkillSet] = {
            id: skill.id,
            name: skill.name,
            category: skill.category,
            applies_to: skill.applies_to,
            content: skill.content,
            package_name: skill.packages?.name,
            package_level: skill.packages?.level,
          };
        }
      }
    }
  }

  return skillSet;
}

/**
 * Get skills for frame directory view.
 * Returns all skills visible in this frame (platform + frame-specific).
 */
async function getFrameSkills(
  supabase: any,
  frameId: string | null
): Promise<Skill[]> {
  const skills: Skill[] = [];

  // Platform skills (always visible)
  const { data: platformSkills } = await supabase
    .from('skills')
    .select(`
      id, name, category, applies_to, content,
      packages!inner(name, level)
    `)
    .eq('packages.level', 'platform');

  for (const skill of platformSkills || []) {
    skills.push({
      id: skill.id,
      name: skill.name,
      category: skill.category,
      applies_to: skill.applies_to,
      content: skill.content,
      package_name: skill.packages?.name,
      package_level: 'platform',
    });
  }

  // Frame-specific skills
  if (frameId) {
    const { data: framePackages } = await supabase
      .from('frame_packages')
      .select('package_id')
      .eq('frame_id', frameId);

    if (framePackages?.length > 0) {
      const packageIds = framePackages.map((fp: any) => fp.package_id);
      
      const { data: frameSkills } = await supabase
        .from('skills')
        .select(`
          id, name, category, applies_to, content,
          packages!inner(name, level)
        `)
        .in('package_id', packageIds);

      for (const skill of frameSkills || []) {
        skills.push({
          id: skill.id,
          name: skill.name,
          category: skill.category,
          applies_to: skill.applies_to,
          content: skill.content,
          package_name: skill.packages?.name,
          package_level: skill.packages?.level,
        });
      }
    }
  }

  return skills;
}

/**
 * Compile prompt using loaded skills.
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

  if (skills.guard) {
    systemPrompt += '\n\n---\n\n' + skills.guard.content;
  }

  return { systemPrompt, userPrompt: entry.text };
}

/**
 * Generate coordination response for designer (not echo).
 */
function formatDesignerResponse(
  skill: Skill,
  location: string,
  frameId: string | null
): string {
  const frameName = frameId ? `frame ${frameId.slice(0, 8)}` : 'your drafts';
  const faceList = skill.applies_to.join(', ');
  
  return `**${skill.name}** added to ${frameName}.

Category: ${skill.category}
Applies to: ${faceList}

${location === 'frame' 
  ? `This skill is now active for all users in this frame.` 
  : `This skill is saved as a draft. Select a frame to publish it.`}`;
}

/**
 * Handle soft-mode for designer face.
 * Uses extended thinking to classify intent and generate appropriate response.
 */
async function handleDesignerSoftMode(
  anthropicKey: string,
  userInput: string,
  frameId: string | null
): Promise<SoftResponse> {
  
  const systemPrompt = `You are Soft-LLM helping a designer create skills for a narrative coordination system.

SKILL CATEGORIES (choose the most appropriate):
- format: How responses should be styled/formatted
- gathering: How to collect context and information
- aperture: What scope/focus to apply
- weighting: How to prioritize different factors
- routing: How to direct flow between components
- constraint: Limitations and boundaries
- parsing: How to interpret input
- display: How output should be presented

APPLIES_TO OPTIONS:
- player: Characters taking actions in the narrative
- author: World-building and lore creation
- designer: System modification and skill creation

YOUR TASK:
1. Analyze the user's request
2. Determine if it's a CLEAR artifact request (they want you to create something specific)
3. If CLEAR: Generate a complete SKILL_CREATE document
4. If AMBIGUOUS: Ask clarifying questions or offer options

OUTPUT FORMAT:
If creating an artifact, respond with ONLY the SKILL_CREATE block:

SKILL_CREATE
name: kebab-case-skill-name
category: [one of the categories above]
applies_to: [comma-separated faces]
content: |
  [The actual skill content - instructions for the LLM]

If clarifying, respond conversationally with questions or options.`;

  // Use extended thinking to reason about the request
  const response = await fetch('https://api.anthropic.com/v1/messages', {
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
        budget_tokens: 5000,
      },
      system: systemPrompt,
      messages: [{ 
        role: 'user', 
        content: `${frameId ? `[Frame selected: ${frameId.slice(0, 8)}]` : '[No frame selected - will be saved as draft]'}

User request: ${userInput}`
      }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const claudeResponse = await response.json();
  
  // Extract the text response (skip thinking blocks)
  let generatedText = '';
  for (const block of claudeResponse.content || []) {
    if (block.type === 'text') {
      generatedText = block.text;
      break;
    }
  }

  console.log('[Soft-LLM Designer] Generated:', generatedText.slice(0, 200) + '...');

  // Check if it's a SKILL_CREATE artifact
  if (generatedText.includes('SKILL_CREATE')) {
    const parsed = parseSkillCreateFromResponse(generatedText);
    if (parsed) {
      // Format as full document for liquid
      const document = `SKILL_CREATE
name: ${parsed.name}
category: ${parsed.category}
applies_to: ${parsed.applies_to.join(', ')}
content: |
${parsed.content.split('\n').map(line => '  ' + line).join('\n')}`;

      return {
        type: 'artifact',
        text: `Creating **${parsed.name}** (${parsed.category} skill for ${parsed.applies_to.join(', ')})`,
        document,
      };
    }
  }

  // It's a clarification/options response
  // Check for numbered options
  const optionMatches = generatedText.match(/(?:^|\n)[a-d]\)|(?:^|\n)\d\./gm);
  const hasOptions = optionMatches && optionMatches.length >= 2;

  return {
    type: hasOptions ? 'clarify' : 'refine',
    text: generatedText,
    options: hasOptions ? undefined : undefined, // Could parse options if needed
  };
}

/**
 * Handle soft-mode for player/author faces.
 * Standard refinement without thinking mode.
 */
async function handleStandardSoftMode(
  anthropicKey: string,
  userInput: string,
  face: string,
  frameId: string | null
): Promise<SoftResponse> {
  
  const systemPrompt = face === 'player'
    ? `You are Soft-LLM helping a player refine their character's intentions.
Rewrite their input as clear, actionable text suitable for the narrative.
Keep it concise but evocative. Output only the refined text.`
    : `You are Soft-LLM helping an author craft world content.
Refine their input into clear, atmospheric prose suitable for lore.
Keep it concise but evocative. Output only the refined text.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: userInput }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const claudeResponse = await response.json();
  const generatedText = claudeResponse.content?.[0]?.text || '';

  return {
    type: 'refine',
    text: generatedText,
  };
}

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
    const body = await req.json();

    // Handle list_frame_skills request (for directory view)
    if (body.action === 'list_frame_skills') {
      const skills = await getFrameSkills(supabase, body.frame_id || null);
      return new Response(
        JSON.stringify({ success: true, skills }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle get_skill request (for loading skill to edit)
    if (body.action === 'get_skill') {
      const { data: skill, error } = await supabase
        .from('skills')
        .select('id, name, category, applies_to, content')
        .eq('id', body.skill_id)
        .single();

      if (error || !skill) {
        throw new Error('Skill not found');
      }

      return new Response(
        JSON.stringify({ success: true, skill }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
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

    // SOFT MODE: Handle with specialized soft-LLM
    if (body.mode === 'soft') {
      let softResponse: SoftResponse;
      
      if (entry.face === 'designer') {
        softResponse = await handleDesignerSoftMode(
          anthropicKey,
          entry.text,
          entry.frame_id
        );
      } else {
        softResponse = await handleStandardSoftMode(
          anthropicKey,
          entry.text,
          entry.face,
          entry.frame_id
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          text: softResponse.text,
          soft_type: softResponse.type,
          document: softResponse.document,
          options: softResponse.options,
          metadata: {
            face: entry.face,
            frame_id: entry.frame_id,
            mode: 'soft',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MEDIUM MODE: Standard generation with skill loading
    const skills = await loadSkills(supabase, entry.face, entry.frame_id, entry.user_id);

    console.log('Loaded skills:', {
      face: entry.face,
      frame_id: entry.frame_id,
      skills: Object.entries(skills).map(([cat, s]) => ({
        category: cat,
        name: (s as Skill).name,
      })),
    });

    // Compile and call Claude
    const { systemPrompt, userPrompt } = compilePrompt(skills, entry);

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
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const claudeResponse = await response.json();
    let generatedText = claudeResponse.content?.[0]?.text || '';

    // For designer, check for skill creation
    let createdSkill: Skill | null = null;
    let skillLocation: string | null = null;

    if (entry.face === 'designer' && entry.user_id && entry.user_id !== 'anonymous') {
      const skillRequest = parseSkillCreateFromResponse(generatedText);
      if (skillRequest) {
        const result = await createSkill(supabase, entry.frame_id, entry.user_id, skillRequest);
        createdSkill = result.skill;
        skillLocation = result.location;
        
        if (createdSkill) {
          // Replace LLM response with coordination message
          generatedText = formatDesignerResponse(createdSkill, skillLocation, entry.frame_id);
        }
        console.log('Created skill:', createdSkill, 'in', skillLocation);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        text: generatedText,
        created_skill: createdSkill,
        skill_location: skillLocation,
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
