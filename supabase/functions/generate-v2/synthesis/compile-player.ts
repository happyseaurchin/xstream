/**
 * Phase 0.7 + 0.9.3: Character Synthesis Prompt Compiler
 * 
 * KEY INSIGHT: 30% match conditions, 70% future intentions
 * 
 * The narrative should primarily enable what players are TRYING to do,
 * not just react to what has happened.
 */

import type { SynthesisContext, CompiledPrompt } from './types.ts';
import { formatLiquidForPrompt, formatContentForPrompt, formatSolidForPrompt } from './gather.ts';
import { applyFormatSkill, applyConstraintSkill, applyApertureSkill } from './skills.ts';

/**
 * Platform default system prompt for character synthesis.
 * Can be modified by format and constraint skills.
 */
const PLATFORM_CHARACTER_PROMPT = `You are Medium-LLM, the narrative synthesis engine for a collaborative storytelling system.

YOUR ROLE:
Synthesize multiple character intentions into coherent narrative. You are NOT a referee or simulator.
You are a story coordinator who makes everyone's actions matter.

CRITICAL ORIENTATION (30/70 RULE):
- 30% of your output should match established conditions (world state, character positions, recent events)
- 70% of your output should ENABLE character intentions (what they're trying to do)

NARRATIVE SYNTHESIS PRINCIPLES:
1. INCLUDE everyone's committed actions in the output
2. WEAVE actions together into one coherent moment
3. ENABLE intentions - make attempts happen with interesting outcomes
4. HONOR established world content (locations, NPCs, items)
5. MAINTAIN continuity with recent narrative
6. KEEP IT BRIEF - this is one beat in an ongoing story (20-100 words typically)
7. PRESERVE quoted dialogue - if a character writes "I say 'Hello friend'", include the exact quote
8. USE CHARACTER NAMES - refer to characters by their in-world names, not user names

WHEN ACTIONS CONFLICT:
- Both actions happen, with interesting interplay
- Let the narrative create tension, not block anyone

TONE:
- Present tense, active voice
- Evocative but concise
- No meta-commentary or GM voice

OUTPUT:
Write ONLY the narrative text. No explanations, no options, no questions.`;

/**
 * Compile the synthesis prompt for character face.
 * Applies skills to modify the base prompt.
 */
export function compilePlayerPrompt(context: SynthesisContext): CompiledPrompt {
  
  // Start with platform default
  let systemPrompt = PLATFORM_CHARACTER_PROMPT;
  
  // Apply format skill (modifies output style)
  systemPrompt = applyFormatSkill(systemPrompt, context.skills.format);
  
  // Apply constraint skill (adds rules)
  systemPrompt = applyConstraintSkill(systemPrompt, context.skills.constraint);
  
  // Get character name map from context (set by gather.ts)
  const characterNameMap = (context as any)._characterNameMap as Map<string, string> | undefined;
  
  // Build the user prompt with all context
  const parts: string[] = [];
  
  // Recent narrative (for continuity)
  const recentNarrative = formatSolidForPrompt(context.recentSolid);
  if (recentNarrative !== 'This is the beginning of the narrative.') {
    parts.push(`RECENT NARRATIVE:\n${recentNarrative}`);
  }
  
  // World content (locations, NPCs, items)
  const worldContext = formatContentForPrompt(context.worldContent);
  if (worldContext !== 'No established world content.') {
    parts.push(`WORLD CONTENT:\n${worldContext}`);
  }
  
  // All character actions (the core input) - filter for 'character' face (was 'player')
  const characterLiquid = context.allLiquid.filter(e => e.face === 'character');
  parts.push(`CHARACTER ACTIONS TO SYNTHESIZE:\n${formatLiquidForPrompt(characterLiquid, characterNameMap)}`);
  
  // Highlight the triggering action - use character name if available
  const triggerEntry = context.trigger.entry as any;
  const triggerCharacterName = triggerEntry.character_id && characterNameMap?.has(triggerEntry.character_id)
    ? characterNameMap.get(triggerEntry.character_id)!
    : context.trigger.userName;
  
  parts.push(`\nTRIGGERING COMMIT (from ${triggerCharacterName}):\n${context.trigger.entry.content}`);
  
  const userPrompt = parts.join('\n\n---\n\n');
  
  // Apply aperture skill to token limit
  const maxTokens = applyApertureSkill(512, context.skills.aperture);
  
  return {
    systemPrompt,
    userPrompt,
    maxTokens,
  };
}
