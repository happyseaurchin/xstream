/**
 * Phase 0.10.3: Edge Function Entry Point
 * 
 * Handles soft mode (vapor→liquid) and medium mode (liquid→solid) for all faces.
 * Author face: Natural prose synthesis, Hard-LLM handles classification
 * Character face: ACTION/INFO_REQUEST/CLARIFY classification
 * Designer face: SKILL_CREATE structured format
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleMediumMode } from "./synthesis/handler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShelfEntry {
  id: string;
  user_id: string;
  frame_id: string | null;
  text: string;
  face: 'player' | 'character' | 'author' | 'designer';
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
  type: 'artifact' | 'clarify' | 'action' | 'info';
  text: string;
  document?: string;  // For artifact type - structured documents (designer only)
  options?: string[]; // For clarify type
  liquid_id?: string; // For info type - the liquid entry created
}

/**
 * Ensure user exists in database.
 */
async function ensureUserExists(supabase: any, userId: string): Promise<void> {
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
 */
async function getOrCreateFramePackage(supabase: any, frameId: string, userId: string): Promise<string> {
  await ensureUserExists(supabase, userId);

  const { data: existingLink } = await supabase
    .from('frame_packages')
    .select(`package_id, packages!inner(id, level)`)
    .eq('frame_id', frameId)
    .eq('packages.level', 'frame')
    .single();

  if (existingLink?.package_id) {
    return existingLink.package_id;
  }

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

  await supabase.from('frame_packages').insert({
    frame_id: frameId,
    package_id: packageId,
    priority: 100,
  });

  return packageId;
}

/**
 * Get or create user's personal package.
 */
async function getOrCreateUserPackage(supabase: any, userId: string): Promise<string> {
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
  await supabase.from('packages').insert({
    id: packageId,
    name: `user-${userId.slice(0, 8)}-drafts`,
    signature: `user-${userId.slice(0, 8)}`,
    level: 'user',
    description: 'Personal skill drafts',
    created_by: userId,
  });

  await supabase.from('user_packages').insert({
    user_id: userId,
    package_id: packageId,
    is_default: true,
  });

  return packageId;
}

/**
 * Parse skill creation request from LLM response.
 */
function parseSkillCreateFromResponse(response: string): SkillCreateRequest | null {
  const skillMatch = response.match(/SKILL_CREATE\s*\n([\s\S]*?)(?:\n```|$)/);
  if (!skillMatch) return null;

  const block = skillMatch[1];
  const nameMatch = block.match(/name:\s*(.+)/);
  const categoryMatch = block.match(/category:\s*(.+)/);
  const appliesToMatch = block.match(/applies_to:\s*(.+)/);
  const contentMatch = block.match(/content:\s*\|?\s*\n([\s\S]*)/);

  if (!nameMatch || !categoryMatch || !contentMatch) return null;

  const name = nameMatch[1].trim();
  const category = categoryMatch[1].trim();
  const appliesTo = appliesToMatch 
    ? appliesToMatch[1].split(',').map(s => s.trim())
    : ['player', 'author', 'designer'];
  const content = contentMatch[1].trim();

  const validCategories = ['gathering', 'aperture', 'weighting', 'format', 'routing', 'constraint', 'parsing', 'display', 'hard'];
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
 * Create a skill in the frame's package.
 */
async function createSkill(
  supabase: any,
  frameId: string | null,
  userId: string,
  skill: SkillCreateRequest
): Promise<{ skill: Skill | null; location: string }> {
  const packageId = frameId 
    ? await getOrCreateFramePackage(supabase, frameId, userId)
    : await getOrCreateUserPackage(supabase, userId);
  const location = frameId ? 'frame' : 'drafts';

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
    skill: { ...data, package_level: location },
    location,
  };
}

/**
 * Load skills for a given face and optional frame.
 */
async function loadSkills(
  supabase: any,
  face: string,
  frameId: string | null,
  userId: string | null = null
): Promise<SkillSet> {
  const skillSet: SkillSet = {};

  // Platform skills
  const { data: platformSkills } = await supabase
    .from('skills')
    .select(`id, name, category, applies_to, content, packages!inner(name, level)`)
    .eq('packages.level', 'platform')
    .contains('applies_to', [face]);

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

  // Frame skills
  if (frameId) {
    const { data: framePackages } = await supabase
      .from('frame_packages')
      .select('package_id, priority')
      .eq('frame_id', frameId)
      .order('priority', { ascending: true });

    if (framePackages?.length > 0) {
      const packageIds = framePackages.map((fp: any) => fp.package_id);
      const { data: frameSkills } = await supabase
        .from('skills')
        .select(`id, name, category, applies_to, content, package_id, packages!inner(name, level)`)
        .in('package_id', packageIds)
        .contains('applies_to', [face]);

      const priorityMap = new Map(framePackages.map((fp: any) => [fp.package_id, fp.priority]));
      const sortedSkills = (frameSkills || []).sort((a: any, b: any) => 
        (priorityMap.get(a.package_id) || 0) - (priorityMap.get(b.package_id) || 0)
      );

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

  // User skills
  if (userId) {
    const { data: userPackages } = await supabase
      .from('user_packages')
      .select('package_id')
      .eq('user_id', userId);

    if (userPackages?.length > 0) {
      const packageIds = userPackages.map((up: any) => up.package_id);
      const { data: userSkills } = await supabase
        .from('skills')
        .select(`id, name, category, applies_to, content, packages!inner(name, level)`)
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
 */
async function getFrameSkills(supabase: any, frameId: string | null): Promise<Skill[]> {
  const skills: Skill[] = [];

  const { data: platformSkills } = await supabase
    .from('skills')
    .select(`id, name, category, applies_to, content, packages!inner(name, level)`)
    .eq('packages.level', 'platform');

  for (const skill of platformSkills || []) {
    skills.push({ ...skill, package_name: skill.packages?.name, package_level: 'platform' });
  }

  if (frameId) {
    const { data: framePackages } = await supabase
      .from('frame_packages')
      .select('package_id')
      .eq('frame_id', frameId);

    if (framePackages?.length > 0) {
      const packageIds = framePackages.map((fp: any) => fp.package_id);
      const { data: frameSkills } = await supabase
        .from('skills')
        .select(`id, name, category, applies_to, content, packages!inner(name, level)`)
        .in('package_id', packageIds);

      for (const skill of frameSkills || []) {
        skills.push({ ...skill, package_name: skill.packages?.name, package_level: skill.packages?.level });
      }
    }
  }

  return skills;
}

/**
 * Compile prompt using loaded skills.
 */
function compilePrompt(skills: SkillSet, entry: ShelfEntry): { systemPrompt: string; userPrompt: string } {
  let systemPrompt = skills.format?.content || `You are helping a ${entry.face} in a narrative coordination system.`;
  if (skills.guard) {
    systemPrompt += '\n\n---\n\n' + skills.guard.content;
  }
  return { systemPrompt, userPrompt: entry.text };
}

/**
 * Format designer response.
 */
function formatDesignerResponse(skill: Skill, location: string, frameId: string | null): string {
  const frameName = frameId ? `frame ${frameId.slice(0, 8)}` : 'your drafts';
  return `**${skill.name}** added to ${frameName}.\n\nCategory: ${skill.category}\nApplies to: ${skill.applies_to.join(', ')}\n\n${location === 'frame' 
    ? `This skill is now active for all users in this frame.` 
    : `This skill is saved as a draft. Select a frame to publish it.`}`;
}

/**
 * Handle soft-mode for designer face.
 * Designer keeps structured SKILL_CREATE format (skills need structure).
 */
async function handleDesignerSoftMode(
  anthropicKey: string,
  userInput: string,
  frameId: string | null
): Promise<SoftResponse> {
  const systemPrompt = `You are Soft-LLM helping a designer create skills for a narrative coordination system.

SKILL CATEGORIES:
- format: Response styling/formatting
- gathering: Context collection
- aperture: Scope/focus control
- weighting: Priority determination
- routing: Flow direction
- constraint: Limitations/boundaries
- parsing: Input interpretation
- display: Output presentation
- hard: Background coordination tasks (for Hard-LLM)

APPLIES_TO OPTIONS: player, author, designer

YOUR TASK:
1. Analyze the user's request
2. If CLEAR: Generate a complete SKILL_CREATE document
3. If AMBIGUOUS: Ask clarifying questions

OUTPUT FORMAT for artifacts:
SKILL_CREATE
name: kebab-case-skill-name
category: [category]
applies_to: [comma-separated faces]
content: |
  [Skill instructions for the LLM]

If clarifying, respond conversationally.`;

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
      thinking: { type: 'enabled', budget_tokens: 5000 },
      system: systemPrompt,
      messages: [{ role: 'user', content: `${frameId ? `[Frame: ${frameId.slice(0, 8)}]` : '[No frame]'}\n\n${userInput}` }],
    }),
  });

  if (!response.ok) throw new Error(`Claude API error: ${response.status}`);
  const claudeResponse = await response.json();
  
  let generatedText = '';
  for (const block of claudeResponse.content || []) {
    if (block.type === 'text') { generatedText = block.text; break; }
  }

  console.log('[Soft-LLM Designer] Generated:', generatedText.slice(0, 200) + '...');

  if (generatedText.includes('SKILL_CREATE')) {
    const parsed = parseSkillCreateFromResponse(generatedText);
    if (parsed) {
      const document = `SKILL_CREATE\nname: ${parsed.name}\ncategory: ${parsed.category}\napplies_to: ${parsed.applies_to.join(', ')}\ncontent: |\n${parsed.content.split('\n').map(line => '  ' + line).join('\n')}`;
      return { type: 'artifact', text: '', document };
    }
  }

  return { type: 'clarify', text: generatedText };
}

/**
 * Phase 0.10.3: Handle soft-mode for author face.
 * 
 * NO MORE STRUCTURED WORLD_CREATE FORMAT.
 * Author writes natural content descriptions.
 * Medium-LLM synthesizes, Hard-LLM classifies and files.
 */
async function handleAuthorSoftMode(
  anthropicKey: string,
  userInput: string,
  frameId: string | null
): Promise<SoftResponse> {
  const systemPrompt = `You are Soft-LLM helping an author create world content for a collaborative narrative.

YOUR ROLE:
Help the author refine their content description. You are NOT generating structured documents.
You help them articulate what they want to create in natural, evocative prose.

WHAT AUTHORS CREATE:
- Locations (places, buildings, regions)
- Characters/NPCs (people, creatures)
- Items (objects, artifacts)
- Events (things that happened/will happen)
- Lore (background information, legends)

YOUR TASK:
1. If the input is CLEAR and descriptive → Return type 'action' with refined prose
2. If the input is VAGUE → Ask clarifying questions (type 'clarify')
3. If they're just chatting → Respond helpfully (type 'clarify')

RESPONSE RULES:
- For clear content: Output ONLY the refined description, nothing else
- Keep it evocative and concise (50-200 words typically)
- Include sensory details, atmosphere, distinctive features
- No meta-commentary, no "here's your description", just the description
- Match the tone appropriate for the content

OUTPUT FORMAT:
For clear content, respond with EXACTLY:
ACTION
content: [the refined content description]

For clarification, respond conversationally.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      thinking: { type: 'enabled', budget_tokens: 4000 },
      system: systemPrompt,
      messages: [{ role: 'user', content: `${frameId ? `[Frame: ${frameId.slice(0, 8)}]` : '[No frame]'}\n\n${userInput}` }],
    }),
  });

  if (!response.ok) throw new Error(`Claude API error: ${response.status}`);
  const claudeResponse = await response.json();
  
  let generatedText = '';
  for (const block of claudeResponse.content || []) {
    if (block.type === 'text') { generatedText = block.text; break; }
  }

  console.log('[Soft-LLM Author] Generated:', generatedText.slice(0, 200) + '...');

  // Parse ACTION response
  if (generatedText.includes('ACTION')) {
    const contentMatch = generatedText.match(/content:\s*(.+)/s);
    let content = contentMatch ? contentMatch[1].trim() : generatedText;
    // Clean up - take first continuous block
    content = content.split('\n\n')[0].trim();
    
    return { type: 'action', text: content };
  }

  // Clarification response
  return { type: 'clarify', text: generatedText };
}

/**
 * Phase 0.10.3: Handle soft-mode for character face.
 * 
 * NO MORE HARD-CODED CHARACTER CREATION DETECTION.
 * Just classify as ACTION/INFO_REQUEST/CLARIFY.
 * Hard-LLM handles entity recognition and filing.
 */
async function handleCharacterSoftMode(
  supabase: any,
  anthropicKey: string,
  userInput: string,
  frameId: string | null,
  userId: string,
  userName: string
): Promise<SoftResponse> {
  const systemPrompt = `You are Soft-LLM facilitating a player's relationship with their character in a narrative world.

YOUR ROLE:
Classify the player's input and respond appropriately. You facilitate action, you don't explain.

CLASSIFICATION:
1. ACTION - Player wants their character to DO something
   Examples: "I grab the sword", "I talk to the bartender", "I order a drink"
   
2. INFO_REQUEST - Player wants to PERCEIVE/OBSERVE something
   Examples: "Where am I?", "What do I see?", "Do I recognize this person?"
   
3. CLARIFY - Input is unclear or you need more information
   Examples: Ambiguous pronouns, unclear intentions

OUTPUT FORMAT:
For ACTION:
ACTION
intention: [refined character intention - concise, evocative, first person]

For INFO_REQUEST:
INFO_REQUEST
intention: [what the character is doing - e.g., "I look around"]

For CLARIFY:
CLARIFY
question: [your clarifying question]

RULES:
- No explanations, no meta-commentary
- Keep intentions brief and character-voiced
- For INFO_REQUEST, the intention should be observable by others`;

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
      thinking: { type: 'enabled', budget_tokens: 3000 },
      system: systemPrompt,
      messages: [{ role: 'user', content: userInput }],
    }),
  });

  if (!response.ok) throw new Error(`Claude API error: ${response.status}`);
  const claudeResponse = await response.json();
  
  let generatedText = '';
  for (const block of claudeResponse.content || []) {
    if (block.type === 'text') { generatedText = block.text; break; }
  }

  console.log('[Soft-LLM Character] Classification:', generatedText);

  // Parse ACTION
  if (generatedText.includes('ACTION')) {
    const intentionMatch = generatedText.match(/intention:\s*(.+)/s);
    let intention = intentionMatch ? intentionMatch[1].trim() : userInput;
    intention = intention.split('\n')[0].trim();
    return { type: 'action', text: intention };
  }
  
  // Parse INFO_REQUEST
  if (generatedText.includes('INFO_REQUEST')) {
    const intentionMatch = generatedText.match(/intention:\s*(.+)/s);
    let intention = intentionMatch ? intentionMatch[1].trim() : 'I observe my surroundings';
    intention = intention.split('\n')[0].trim();
    
    if (!frameId) {
      return { type: 'clarify', text: 'You need to be in a frame to observe your surroundings.' };
    }
    
    // Create liquid and call medium-LLM in informational mode
    const liquidId = crypto.randomUUID();
    const { error: liquidError } = await supabase
      .from('liquid')
      .insert({
        id: liquidId,
        frame_id: frameId,
        user_id: userId,
        user_name: userName,
        face: 'character',
        content: intention,
        committed: true,
      });
    
    if (liquidError) {
      console.error('Error creating liquid for info request:', liquidError);
      throw new Error('Failed to create liquid entry');
    }
    
    console.log('[Soft-LLM Character] Created info request liquid:', liquidId);
    
    const infoResult = await handleMediumMode(
      supabase,
      anthropicKey,
      liquidId,
      null,
      true  // informational - skip solid storage
    );
    
    if (!infoResult.success) {
      throw new Error(infoResult.error || 'Info request synthesis failed');
    }
    
    return {
      type: 'info',
      text: infoResult.result?.narrative || 'You observe your surroundings.',
      liquid_id: liquidId,
    };
  }
  
  // Parse CLARIFY
  if (generatedText.includes('CLARIFY')) {
    const questionMatch = generatedText.match(/question:\s*(.+)/s);
    let question = questionMatch ? questionMatch[1].trim() : 'Could you clarify what you want to do?';
    question = question.split('\n')[0].trim();
    return { type: 'clarify', text: question };
  }
  
  // Fallback to action
  return { type: 'action', text: userInput };
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
    const body = await req.json();

    // Handle list_frame_skills request
    if (body.action === 'list_frame_skills') {
      const skills = await getFrameSkills(supabase, body.frame_id || null);
      return new Response(
        JSON.stringify({ success: true, skills }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle get_skill request
    if (body.action === 'get_skill') {
      const { data: skill, error } = await supabase
        .from('skills')
        .select('id, name, category, applies_to, content')
        .eq('id', body.skill_id)
        .single();

      if (error || !skill) throw new Error('Skill not found');
      return new Response(
        JSON.stringify({ success: true, skill }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MEDIUM MODE: Synthesis
    if (body.mode === 'medium') {
      if (!body.liquid_id) throw new Error('medium mode requires liquid_id');
      
      console.log('[Router] Medium mode - starting synthesis for liquid:', body.liquid_id);
      
      const result = await handleMediumMode(
        supabase,
        anthropicKey,
        body.liquid_id,
        getOrCreateFramePackage,
        false
      );
      
      if (!result.success) throw new Error(result.error || 'Synthesis failed');
      
      return new Response(
        JSON.stringify({ success: true, mode: 'medium', result: result.result, stored: result.stored }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request for soft/legacy modes
    let entry: ShelfEntry;

    if (body.shelf_entry_id) {
      const { data, error } = await supabase
        .from('shelf')
        .select('*')
        .eq('id', body.shelf_entry_id)
        .single();

      if (error || !data) throw new Error(`Shelf entry not found: ${body.shelf_entry_id}`);
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

    // SOFT MODE: Per-face handling
    if (body.mode === 'soft') {
      let softResponse: SoftResponse;
      
      if (entry.face === 'designer') {
        softResponse = await handleDesignerSoftMode(anthropicKey, entry.text, entry.frame_id);
      } else if (entry.face === 'author') {
        softResponse = await handleAuthorSoftMode(anthropicKey, entry.text, entry.frame_id);
      } else {
        softResponse = await handleCharacterSoftMode(
          supabase,
          anthropicKey,
          entry.text,
          entry.frame_id,
          entry.user_id,
          body.user_name || `user-${entry.user_id.slice(0, 8)}`
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          text: softResponse.text,
          soft_type: softResponse.type,
          document: softResponse.document,
          options: softResponse.options,
          liquid_id: softResponse.liquid_id,
          metadata: { face: entry.face, frame_id: entry.frame_id, mode: 'soft' },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LEGACY MODE: Standard generation
    const skills = await loadSkills(supabase, entry.face, entry.frame_id, entry.user_id);
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

    if (!response.ok) throw new Error(`Claude API error: ${response.status}`);
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
          generatedText = formatDesignerResponse(createdSkill, skillLocation, entry.frame_id);
        }
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
          skills_used: Object.entries(skills).map(([cat, s]) => ({ category: cat, name: (s as Skill).name })),
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
