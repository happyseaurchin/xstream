/**
 * soft.ts — Soft-LLM engine.
 *
 * The heartbeat. Faces the user directly. Helps shape vapor
 * into liquid through reflection, condensation, and forking.
 *
 * Triggers: user types (ASK), user requests clarification.
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
  // 1. System prompt from Soft block
  const system = blockToText(SOFT_BLOCK, 4)

  // 2. Knowledge context
  const knowledgeText = knowledge
    ? blockToText(knowledge, 3)
    : 'No knowledge yet.'

  // 3. Compose user message — frame extract + knowledge + vapor
  const user = `FACE: ${face}

--- WHAT YOU KNOW (character state) ---
${frame.characterState}

--- WHAT IS POSSIBLE ---
${frame.availableActions}

--- WHAT JUST HAPPENED ---
${recentSolid || 'Nothing yet — you have just arrived.'}

--- WHAT THE CHARACTER KNOWS ---
${knowledgeText}

--- NEARBY ---
${frame.proximateCharacters}

--- VAPOR (what the user is thinking/asking) ---
${vapor}

Respond in character. Be brief — shorter than the user's input.
Help shape their intention. Do not produce solid narrative.`

  // 4. Call Claude (Haiku — fast and cheap)
  const response = await callClaude(
    apiKey,
    'claude-haiku-4-5-20251001',
    system,
    user,
    512
  )

  return {
    text: response.text,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
  }
}
