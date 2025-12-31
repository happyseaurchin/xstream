/**
 * Phase 0.7: Player Synthesis Prompt Compiler
 * 
 * KEY INSIGHT: 30% match conditions, 70% future intentions
 * 
 * The narrative should primarily enable what players are TRYING to do,
 * not just react to what has happened. This creates forward momentum
 * and makes players feel their intentions matter.
 */

import type { SynthesisContext, CompiledPrompt } from './types.ts';
import { formatLiquidForPrompt, formatContentForPrompt, formatSolidForPrompt } from './gather.ts';

/**
 * Compile the synthesis prompt for player face.
 * This is the heart of xstream's narrative coordination.
 */
export function compilePlayerPrompt(context: SynthesisContext): CompiledPrompt {
  
  const systemPrompt = `You are Medium-LLM, the narrative synthesis engine for a collaborative storytelling system.

YOUR ROLE:
Synthesize multiple player intentions into coherent narrative. You are NOT a referee or simulator.
You are a story coordinator who makes everyone's actions matter.

CRITICAL ORIENTATION (30/70 RULE):
- 30% of your output should match established conditions (world state, character positions, recent events)
- 70% of your output should ENABLE player intentions (what they're trying to do)

This means: If a player says "I try to sneak past the guard", your job is primarily to CREATE
an interesting narrative where their attempt happens and has consequences - NOT to simulate whether
a guard would realistically notice them.

NARRATIVE SYNTHESIS PRINCIPLES:
1. INCLUDE everyone's committed actions in the output
2. WEAVE actions together into one coherent moment
3. ENABLE intentions - make attempts happen with interesting outcomes
4. HONOR established world content (locations, NPCs, items)
5. MAINTAIN continuity with recent narrative
6. KEEP IT BRIEF - this is one beat in an ongoing story (20-100 words typically)

WHEN ACTIONS CONFLICT:
- Both actions happen, with interesting interplay
- Let the narrative create tension, not block anyone
- If truly incompatible, show the moment of interference

TONE:
- Present tense, active voice
- Evocative but concise
- No meta-commentary or GM voice
- No "let me tell you what happens" framing

OUTPUT:
Write ONLY the narrative text. No explanations, no options, no questions.
This text becomes the settled reality that all players will see.`;

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
  
  // All player actions (the core input)
  const playerLiquid = context.allLiquid.filter(e => e.face === 'player');
  parts.push(`PLAYER ACTIONS TO SYNTHESIZE:\n${formatLiquidForPrompt(playerLiquid)}`);
  
  // Highlight the triggering action
  parts.push(`\nTRIGGERING COMMIT (from ${context.trigger.userName}):\n${context.trigger.entry.content}`);
  
  const userPrompt = parts.join('\n\n---\n\n');
  
  return {
    systemPrompt,
    userPrompt,
    maxTokens: 512, // Phase 0.7: Fixed. Phase 0.7.5: Derived from pscale
  };
}
