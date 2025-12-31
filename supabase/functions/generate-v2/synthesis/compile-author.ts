/**
 * Phase 0.7: Author Synthesis Prompt Compiler
 * 
 * Authors create world content: locations, NPCs, items, lore.
 * Their output goes to the content table, not solid narrative.
 */

import type { SynthesisContext, CompiledPrompt } from './types.ts';
import { formatContentForPrompt } from './gather.ts';

/**
 * Compile the synthesis prompt for author face.
 * Outputs structured content that players can interact with.
 */
export function compileAuthorPrompt(context: SynthesisContext): CompiledPrompt {
  
  const systemPrompt = `You are Medium-LLM helping an author create world content for a collaborative narrative.

YOUR ROLE:
Transform the author's description into structured world content that players can interact with.

CONTENT TYPES:
- location: A place characters can be in (description, atmosphere, features)
- npc: A non-player character (description, personality, role, notable traits)
- item: An object that can be interacted with (description, properties, significance)
- event: Something happening in the world (description, scope, timing)
- lore: Background information (description, relevance)
- faction: A group or organization (description, goals, relationships)

OUTPUT FORMAT:
Respond with a JSON object containing:
{
  "type": "<content_type>",
  "name": "<display_name>",
  "description": "<evocative prose description>",
  "details": {
    // type-specific fields
  }
}

For LOCATIONS, include in details:
- atmosphere: string (mood/feeling)
- features: string[] (notable elements)
- connections: string[] (exits/paths)

For NPCs, include in details:
- role: string (their function in the world)
- personality: string (how they behave)
- appearance: string (visual description)
- knowledge: string[] (what they know about)

For ITEMS, include in details:
- properties: string[] (what it does/is)
- location: string (where it's typically found)

COHERENCE:
Make new content fit with existing world content. Reference established locations, NPCs, and items where appropriate.

OUTPUT:
Respond with ONLY the JSON object. No explanation, no markdown code blocks.`;

  // Build context
  const parts: string[] = [];
  
  // Existing world content for coherence
  const existingContent = formatContentForPrompt(context.worldContent);
  if (existingContent !== 'No established world content.') {
    parts.push(`EXISTING WORLD CONTENT:\n${existingContent}`);
  }
  
  // The author's submission
  parts.push(`AUTHOR'S CREATION REQUEST:\n${context.trigger.entry.content}`);
  
  const userPrompt = parts.join('\n\n---\n\n');
  
  return {
    systemPrompt,
    userPrompt,
    maxTokens: 1024,
  };
}

/**
 * Parse author response into structured content.
 */
export function parseAuthorResponse(response: string): {
  type: string;
  name: string;
  data: Record<string, any>;
} | null {
  try {
    // Try to extract JSON from response
    let jsonStr = response.trim();
    
    // Handle markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    const parsed = JSON.parse(jsonStr);
    
    if (!parsed.type || !parsed.name) {
      console.error('Author response missing type or name');
      return null;
    }
    
    return {
      type: parsed.type,
      name: parsed.name,
      data: {
        description: parsed.description,
        ...parsed.details,
      },
    };
  } catch (error) {
    console.error('Failed to parse author response:', error);
    return null;
  }
}
