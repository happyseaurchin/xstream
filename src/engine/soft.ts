/**
 * soft.ts — Soft-LLM engine (real-world mode).
 *
 * The heartbeat. Faces the user directly. Helps shape vapor
 * into liquid through reflection, condensation, and forking.
 *
 * In real-world mode: a genuine thinking partner, not a character.
 *
 * Model: Haiku (fast, cheap — runs frequently).
 */

import { blockToText } from '../lib/bsp'
import type { PscaleBlock } from '../lib/bsp'
import { callClaude } from '../lib/claude'
import { SOFT_BLOCK } from '../blocks/agents'
import type { Frame } from './hard'

export interface SoftResult {
  text: string
  inputTokens: number
  outputTokens: number
}

export async function runSoft(
  apiKey: string,
  vapor: string,
  frame: Frame,
  knowledge: PscaleBlock | null,
  recentSolid: string,
  face: 'player' | 'author' | 'designer'
): Promise<SoftResult> {
  const system = blockToText(SOFT_BLOCK as PscaleBlock, 4)

  const knowledgeText = knowledge
    ? blockToText(knowledge, 3)
    : 'You have just arrived. No accumulated context yet.'

  const user = `FACE: ${face === 'player' ? 'character' : face}

--- CONTEXT ---
${frame.environment}

--- THIS USER ---
${frame.characterState}

--- WHO ELSE IS HERE ---
${frame.proximateCharacters || 'No one else right now.'}

--- WHAT YOU COULD DO ---
${frame.availableActions}

--- WHAT JUST EMERGED ---
${recentSolid || 'Nothing yet — you have just arrived.'}

--- ACCUMULATED KNOWLEDGE ---
${knowledgeText}

--- THE USER SAYS ---
${vapor}

Respond as a thinking partner. Be direct and real — you're not roleplaying.
One to three sentences. If they're vague, help them find the core. If they're clear, help them commit.
Draw on your knowledge of the real world freely. Be brief, grounded, useful.`

  const response = await callClaude(
    apiKey,
    'claude-haiku-4-5-20251001',
    system,
    user,
    512,
    'SOFT'
  )

  return {
    text: response.text,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
  }
}
