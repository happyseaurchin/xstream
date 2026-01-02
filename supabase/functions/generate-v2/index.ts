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
  document?: string;  // For artifact type - the full SKILL_CREATE or WORLD_CREATE document
  options?: string[]; // For clarify type
  liquid_id?: string; // For info type - the liquid entry created
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
 * Load a specific skill by name (for routing skills like character-generation)
 */
async function loadSkillByName(
  supabase: any,
  skillName: string,
  face: string,
  frameId: string | null
): Promise<Skill | null> {
  // Try frame-specific first, then platform
  if (frameId) {
    const { data: framePackages } = await supabase
      .from('frame_packages')
      .select('package_id')
      .eq('frame_id', frameId);

    if (framePackages?.length > 0) {
      const packageIds = framePackages.map((fp: any) => fp.package_id);
      const { data: skill } = await supabase
        .from('skills')
        .select('id, name, category, applies_to, content')
        .eq('name', skillName)
        .in('package_id', packageIds)
        .contains('applies_to', [face])
        .single();

      if (skill) return skill;
    }
  }

  // Fall back to platform
  const { data: platformSkill } = await supabase
    .from('skills')
    .select(`
      id, name, category, applies_to, content,
      packages!inner(level)
    `)
    .eq('name', skillName)
    .eq('packages.level', 'platform')
    .contains('applies_to', [face])
    .single();

  return platformSkill || null;
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
        text: '', // No summary text - artifact goes to liquid
        document,
      };
    }
  }

  // It's a clarification/options response
  return {
    type: 'clarify',
    text: generatedText,
  };
}

/**
 * Handle soft-mode for author face.
 * Uses extended thinking to classify intent - creates WORLD_CREATE artifacts for content.
 */
async function handleAuthorSoftMode(
  anthropicKey: string,
  userInput: string,
  frameId: string | null
): Promise<SoftResponse> {
  
  const systemPrompt = `You are Soft-LLM helping an author create world content for a narrative coordination system.

CONTENT TYPES (choose the most appropriate):
- location: Places, rooms, buildings, regions, geographic features
- npc: Non-player characters, people, creatures with agency
- item: Objects, artifacts, equipment, tools
- faction: Groups, organizations, cultures, societies
- event: Historical events, scheduled occurrences, temporal markers
- lore: Background information, legends, rules of the world

YOUR TASK:
1. Analyze the user's request
2. Determine if it's a CLEAR content creation request
3. If CLEAR: Generate a complete WORLD_CREATE document
4. If AMBIGUOUS: Ask clarifying questions or help them develop the idea

OUTPUT FORMAT:
If creating content, respond with ONLY the WORLD_CREATE block:

WORLD_CREATE
type: [one of the content types above]
name: [the name of the content]
description: |
  [Rich, evocative description suitable for narrative use.
   Include sensory details, atmosphere, and distinctive features.
   For NPCs: personality, appearance, mannerisms, motivations.
   For locations: sights, sounds, smells, atmosphere.
   For items: appearance, properties, significance.]

If the input is vague or needs development, respond conversationally to help them clarify.
If they're just chatting or asking questions, respond helpfully without creating content.`;

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
        content: `${frameId ? `[Frame selected: ${frameId.slice(0, 8)}]` : '[No frame selected]'}

Author request: ${userInput}`
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

  console.log('[Soft-LLM Author] Generated:', generatedText.slice(0, 200) + '...');

  // Check if it's a WORLD_CREATE artifact
  if (generatedText.includes('WORLD_CREATE')) {
    const parsed = parseWorldCreateFromResponse(generatedText);
    if (parsed) {
      // Format as full document for liquid
      const document = `WORLD_CREATE
type: ${parsed.type}
name: ${parsed.name}
description: |
${parsed.description.split('\n').map(line => '  ' + line).join('\n')}`;

      return {
        type: 'artifact',
        text: '', // No summary text - artifact goes to liquid
        document,
      };
    }
  }

  // It's a clarification/development response
  return {
    type: 'clarify',
    text: generatedText,
  };
}

/**
 * Parse world content creation request from LLM response.
 * Looks for WORLD_CREATE block in response.
 */
function parseWorldCreateFromResponse(response: string): { type: string; name: string; description: string } | null {
  const worldMatch = response.match(/WORLD_CREATE\s*\n([\s\S]*?)(?:\n```|$)/);
  if (!worldMatch) return null;

  const block = worldMatch[1];
  
  const typeMatch = block.match(/type:\s*(.+)/);
  const nameMatch = block.match(/name:\s*(.+)/);
  const descMatch = block.match(/description:\s*\|?\s*\n([\s\S]*)/);

  if (!typeMatch || !nameMatch || !descMatch) {
    return null;
  }

  const type = typeMatch[1].trim();
  const name = nameMatch[1].trim();
  const description = descMatch[1].trim();

  const validTypes = ['location', 'npc', 'item', 'faction', 'event', 'lore'];
  if (!validTypes.includes(type)) {
    console.warn(`Invalid content type: ${type}`);
    return null;
  }

  return { type, name, description };
}

/**
 * Handle soft-mode for character face.
 * Classifies input as ACTION, INFO_REQUEST, or triggers routing skills.
 * 
 * Key principle: Intent detection is minimal. Actual generation uses skills from database.
 */
async function handleCharacterSoftMode(
  supabase: any,
  anthropicKey: string,
  userInput: string,
  frameId: string | null,
  userId: string,
  userName: string
): Promise<SoftResponse> {
  
  // Check if this looks like a character creation request
  // This is the ONLY hard-coded intent detection - everything else comes from skills
  const characterCreationPattern = /\b(create|make|new|play as|be a|become)\b.*\b(character|persona|role)\b/i;
  const isCharacterCreation = characterCreationPattern.test(userInput) || 
    userInput.toLowerCase().includes('i want to play') ||
    userInput.toLowerCase().includes('i want to be');

  if (isCharacterCreation) {
    // Load the character-generation skill from database
    const characterSkill = await loadSkillByName(supabase, 'character-generation', 'character', frameId);
    
    if (characterSkill) {
      console.log('[Soft-LLM Character] Found character-generation skill, delegating...');
      
      // Use the skill content as the system prompt
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          thinking: {
            type: 'enabled',
            budget_tokens: 4000,
          },
          system: characterSkill.content,
          messages: [{ role: 'user', content: userInput }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
      }

      const claudeResponse = await response.json();
      let generatedText = '';
      for (const block of claudeResponse.content || []) {
        if (block.type === 'text') {
          generatedText = block.text;
          break;
        }
      }

      console.log('[Soft-LLM Character] Skill generated:', generatedText.slice(0, 200) + '...');

      // The skill should output a CHARACTER_CREATE document that goes to liquid
      // User can review and commit, which triggers medium-LLM to store it
      return {
        type: 'artifact',
        text: '',
        document: generatedText,
      };
    } else {
      console.log('[Soft-LLM Character] No character-generation skill found, providing guidance');
      return {
        type: 'clarify',
        text: 'Character creation is not yet configured for this frame. A designer needs to add the character-generation skill.',
      };
    }
  }

  // Standard character face handling (ACTION, INFO_REQUEST, CLARIFY)
  const systemPrompt = `You are Soft-LLM facilitating a player's relationship with their character in a narrative world.

YOUR ROLE:
Classify the player's input and respond appropriately. You facilitate action, you don't explain.

CLASSIFICATION:
1. ACTION - Player wants their character to DO something that affects the world
   Examples: "I grab the sword", "I talk to the bartender", "I sneak past", "I order a drink"
   
2. INFO_REQUEST - Player wants to PERCEIVE/OBSERVE/REMEMBER something
   Examples: "Where am I?", "What do I see?", "Do I recognize this person?", "What's around me?"
   
3. CLARIFY - Input is unclear, incomplete, or you need more information
   Examples: Ambiguous pronouns, unclear intentions, contradictory requests

OUTPUT FORMAT:
Respond with ONLY a classification block:

For ACTION:
ACTION
intention: [refined character intention - concise, evocative, first person]

For INFO_REQUEST:
INFO_REQUEST
intention: [what the character is doing - e.g., "I look around", "I study the room"]

For CLARIFY:
CLARIFY
question: [your clarifying question to the player]

IMPORTANT:
- No explanations, no summaries, no meta-commentary
- Keep intentions brief and character-voiced
- For INFO_REQUEST, the intention should be observable by others (e.g., "looking around")`;

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
      thinking: {
        type: 'enabled',
        budget_tokens: 3000,
      },
      system: systemPrompt,
      messages: [{ role: 'user', content: userInput }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const claudeResponse = await response.json();
  
  let generatedText = '';
  for (const block of claudeResponse.content || []) {
    if (block.type === 'text') {
      generatedText = block.text;
      break;
    }
  }

  console.log('[Soft-LLM Character] Classification:', generatedText);

  // Parse the classification
  if (generatedText.includes('ACTION')) {
    const intentionMatch = generatedText.match(/intention:\s*(.+)/s);
    let intention = intentionMatch ? intentionMatch[1].trim() : userInput;
    // Clean up any trailing content
    intention = intention.split('\n')[0].trim();
    
    return {
      type: 'action',
      text: intention,
    };
  }
  
  if (generatedText.includes('INFO_REQUEST')) {
    const intentionMatch = generatedText.match(/intention:\s*(.+)/s);
    let intention = intentionMatch ? intentionMatch[1].trim() : 'I observe my surroundings';
    intention = intention.split('\n')[0].trim();
    
    if (!frameId) {
      return {
        type: 'clarify',
        text: 'You need to be in a frame to observe your surroundings.',
      };
    }
    
    // Create liquid entry for the observable intention
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
        committed: true, // Auto-commit info requests
      });
    
    if (liquidError) {
      console.error('Error creating liquid for info request:', liquidError);
      throw new Error('Failed to create liquid entry');
    }
    
    console.log('[Soft-LLM Character] Created info request liquid:', liquidId);
    
    // Call medium-LLM in informational mode (returns response, skips solid)
    const infoResult = await handleMediumMode(
      supabase,
      anthropicKey,
      liquidId,
      null, // getOrCreateFramePackage not needed for info requests
      true  // informational flag - skip solid storage
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
  
  if (generatedText.includes('CLARIFY')) {
    const questionMatch = generatedText.match(/question:\s*(.+)/s);
    let question = questionMatch ? questionMatch[1].trim() : 'Could you clarify what you want to do?';
    question = question.split('\n')[0].trim();
    
    return {
      type: 'clarify',
      text: question,
    };
  }
  
  // Fallback to action
  return {
    type: 'action',
    text: userInput,
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

    // ========================================
    // MEDIUM MODE: Phase 0.7 Synthesis
    // Triggered when user commits liquid entry
    // ========================================
    if (body.mode === 'medium') {
      if (!body.liquid_id) {
        throw new Error('medium mode requires liquid_id');
      }
      
      console.log('[Router] Medium mode - starting synthesis for liquid:', body.liquid_id);
      
      const result = await handleMediumMode(
        supabase,
        anthropicKey,
        body.liquid_id,
        getOrCreateFramePackage,
        false // not informational - store to solid
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Synthesis failed');
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          mode: 'medium',
          result: result.result,
          stored: result.stored,
        }),
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

    // SOFT MODE: Handle with specialized soft-LLM per face
    if (body.mode === 'soft') {
      let softResponse: SoftResponse;
      
      if (entry.face === 'designer') {
        softResponse = await handleDesignerSoftMode(
          anthropicKey,
          entry.text,
          entry.frame_id
        );
      } else if (entry.face === 'author') {
        softResponse = await handleAuthorSoftMode(
          anthropicKey,
          entry.text,
          entry.frame_id
        );
      } else {
        // Character face (or legacy 'player') - uses skills for special intents
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
          metadata: {
            face: entry.face,
            frame_id: entry.frame_id,
            mode: 'soft',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LEGACY MODE: Standard generation with skill loading
    // (This was the default before phase 0.7)
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
