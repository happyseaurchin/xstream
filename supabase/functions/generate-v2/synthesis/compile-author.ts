/**
 * Phase 0.10.3: Author Content Synthesis
 * 
 * Author face works like player face:
 * - Gather all author liquid in frame
 * - Synthesize into coherent content description
 * - Output goes to solid.narrative
 * - Hard-LLM handles classification and entity filing
 */

import type { SynthesisContext, CompiledPrompt } from './types.ts';
import { formatLiquidForPrompt, formatContentForPrompt, formatSolidForPrompt } from './gather.ts';
import { applyFormatSkill, applyConstraintSkill, applyApertureSkill } from './skills.ts';

/**
 * Platform default system prompt for author synthesis.
 * Can be modified by format and constraint skills.
 */
const PLATFORM_AUTHOR_PROMPT = `You are Medium-LLM synthesizing author world-building content for a collaborative storytelling system.

YOUR ROLE:
Combine multiple authors' contributions into coherent world content. You are NOT parsing structured documents.
You are weaving together descriptions, details, and ideas into a unified piece of world-building.

SYNTHESIS PRINCIPLES:
1. INCLUDE all authors' contributions in the output
2. WEAVE descriptions together into coherent content
3. RESOLVE contradictions gracefully (layer details, note variations)
4. HONOR existing world content (maintain consistency)
5. MAINTAIN the tone and style of the world
6. KEEP IT CONCISE - this is one piece of content, not an encyclopedia entry (50-200 words typically)
7. PRESERVE evocative details - sensory descriptions, atmosphere, distinctive features

CONTENT TYPES (for your awareness, not for output):
Authors may be describing:
- Locations: places, rooms, buildings, regions
- Characters/NPCs: people, creatures with personality
- Items: objects, artifacts, equipment
- Events: things that happened or will happen
- Lore: background information, legends, rules

You don't need to classify - just synthesize. Hard-LLM will handle classification.

WHEN AUTHORS DESCRIBE DIFFERENT THINGS:
- If they're describing related things, weave them together
- If they're describing unrelated things, synthesize each coherently
- If they're adding to the same thing, layer the details

TONE:
- Evocative, atmospheric prose
- Present tense for descriptions
- No meta-commentary or author voice
- Match the world's established tone

OUTPUT:
Write ONLY the synthesized content. No explanations, no classifications, no questions.`;

/**
 * Compile the synthesis prompt for author face.
 * Mirrors compile-player structure.
 */
export function compileAuthorPrompt(context: SynthesisContext): CompiledPrompt {
  
  // Start with platform default
  let systemPrompt = PLATFORM_AUTHOR_PROMPT;
  
  // Apply format skill (modifies output style)
  systemPrompt = applyFormatSkill(systemPrompt, context.skills.format);
  
  // Apply constraint skill (adds rules)
  systemPrompt = applyConstraintSkill(systemPrompt, context.skills.constraint);
  
  // Build the user prompt with all context
  const parts: string[] = [];
  
  // Frame context
  parts.push(`FRAME: ${context.frame.name}`);
  
  // Existing world content - what's already established
  const existingContent = formatContentForPrompt(context.worldContent);
  if (existingContent !== 'No established world content.') {
    parts.push(`EXISTING WORLD CONTENT (maintain consistency):\n${existingContent}`);
  }
  
  // Recent author solid - what's been recently created
  const recentSolid = formatSolidForPrompt(
    context.recentSolid.filter(s => s.face === 'author')
  );
  if (recentSolid !== 'This is the beginning of the narrative.') {
    parts.push(`RECENT AUTHOR CONTENT (don't repeat):\n${recentSolid}`);
  }
  
  // All author liquid - the submissions to synthesize
  const authorLiquid = context.allLiquid.filter(e => e.face === 'author');
  parts.push(`AUTHOR SUBMISSIONS TO SYNTHESIZE:\n${formatLiquidForPrompt(authorLiquid)}`);
  
  // Highlight the triggering submission
  parts.push(`\nTRIGGERING COMMIT (from ${context.trigger.userName}):\n${context.trigger.entry.content}`);
  
  const userPrompt = parts.join('\n\n---\n\n');
  
  // Apply aperture skill to token limit
  const maxTokens = applyApertureSkill(512, context.skills.aperture);
  
  return {
    systemPrompt,
    userPrompt,
    maxTokens,
  };
}

// REMOVED: parseAuthorResponse() - Hard-LLM handles classification
