/**
 * medium.ts — Medium-LLM engine.
 *
 * The breath. Synthesises committed intentions into solid narrative.
 * Reads the frame from Hard, committed content from nearby characters,
 * and produces what actually happened.
 *
 * Triggers: player commits liquid, synthesis window closes.
 * Model: Sonnet (synthesis quality).
 */

import { blockToText } from '../lib/bsp'
import type { PscaleBlock } from '../lib/bsp'
import { readBlock } from '../lib/shelf'
import { callClaude } from '../lib/claude'
import { MEDIUM_BLOCK } from '../blocks/agents'
import type { Frame } from './hard'

export interface MediumResult {
  solid: string
  knowledgeUpdates: string[]
  eventEntry: string
  inputTokens: number
  outputTokens: number
}

export async function runMedium(
  apiKey: string,
  committed: string,
  frame: Frame,
  knowledge: PscaleBlock | null,
  worldId: string,
  characterName: string,
  face: 'player' | 'author' | 'designer'
): Promise<MediumResult> {
  // 1. Read characters block to find nearby committed content
  const characters = await readBlock(`${worldId}:characters`)
  const nearbyText = characters
    ? blockToText(characters, 3)
    : 'No other characters nearby.'

  // 2. Knowledge context
  const knowledgeText = knowledge
    ? blockToText(knowledge, 3)
    : 'No knowledge yet.'

  // 3. System prompt from Medium block
  const system = blockToText(MEDIUM_BLOCK, 4)

  // 4. Compose user message
  const user = `FACE: ${face}
CHARACTER: ${characterName}

--- FRAME (world state from Hard-LLM) ---
Character state: ${frame.characterState}
Environment: ${frame.environment}
Proximate characters: ${frame.proximateCharacters}
Active rules: ${frame.activeRules}
Available actions: ${frame.availableActions}

--- COMMITTED ACTION ---
${committed}

--- NEARBY CHARACTERS ---
${nearbyText}

--- CHARACTER KNOWLEDGE ---
${knowledgeText}

Synthesise what happens. Produce:
1. "solid" — narrative of what occurred (past tense, determined, 2-4 sentences)
2. "knowledgeUpdates" — array of strings the character learned from this experience
3. "eventEntry" — a one-line summary for the events log

Respond with ONLY valid JSON, no markdown fences.`

  // 5. Call Claude (Sonnet)
  const response = await callClaude(
    apiKey,
    'claude-sonnet-4-20250514',
    system,
    user,
    1024
  )

  // 6. Parse response
  let parsed: any
  try {
    parsed = JSON.parse(response.text)
  } catch {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
  }

  return {
    solid: parsed.solid ?? response.text,
    knowledgeUpdates: parsed.knowledgeUpdates ?? [],
    eventEntry: parsed.eventEntry ?? '',
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
  }
}
