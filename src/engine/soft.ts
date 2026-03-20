/**
 * soft.ts — Soft-LLM engine.
 *
 * The heartbeat. Faces the user directly. Helps shape vapor
 * into liquid through reflection, condensation, and forking.
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
    : 'You have just arrived. You know nothing about this place yet.'

  const user = `FACE: ${face}

--- THE SCENE ---
${frame.environment}

--- YOUR CHARACTER ---
${frame.characterState}

--- WHO YOU SEE ---
${frame.proximateCharacters}

--- WHAT YOU COULD DO ---
${frame.availableActions}

--- WHAT JUST HAPPENED ---
${recentSolid || 'Nothing yet — you have just arrived.'}

--- WHAT YOU KNOW ---
${knowledgeText}

--- THE PLAYER SAYS ---
${vapor}

Respond as a thought partner, in second person ("you"). Be vivid and brief — one to three sentences. Draw on the scene's atmosphere. If they seem unsure, offer two or three concrete options grounded in what they can perceive. Never name characters unless they appear in the knowledge block.`

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
