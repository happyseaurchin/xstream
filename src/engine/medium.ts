/**
 * medium.ts — Medium-LLM engine.
 *
 * The breath. Synthesises committed intentions into solid narrative.
 * Reads the frame from Hard and the character's knowledge block.
 * Does NOT read the world characters block directly — only what
 * the character knows and perceives (via the frame).
 *
 * Model: Sonnet (synthesis quality).
 */

import { blockToText } from '../lib/bsp'
import type { PscaleBlock } from '../lib/bsp'
import { callClaude } from '../lib/claude'
import { MEDIUM_BLOCK } from '../blocks/agents'
import type { Frame } from './hard'

export interface MediumResult {
  solid: string
  knowledgeUpdates: string[]
  eventEntry: string
  locationChange?: string
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
  const knowledgeText = knowledge
    ? blockToText(knowledge, 3)
    : 'The character knows nothing yet.'

  const system = blockToText(MEDIUM_BLOCK as PscaleBlock, 4)

  const user = `FACE: ${face}
CHARACTER: ${characterName}

--- THE SCENE (from Hard-LLM frame) ---
${frame.environment}

--- YOUR CHARACTER ---
${frame.characterState}

--- WHO IS NEARBY (as perceived) ---
${frame.proximateCharacters}

--- RULES IN EFFECT ---
${frame.activeRules}

--- WHAT THE CHARACTER KNOWS ---
${knowledgeText}

--- COMMITTED ACTION ---
${committed}

You are the narrative engine. Synthesise what happens when ${characterName} does this.

CRITICAL RULES:
- Write in SECOND PERSON PRESENT TENSE. "You step forward", "You notice", not "He stepped" or "Tubs approached".
- Use sensory detail — sounds, textures, smells, light. This is a lived moment happening NOW.
- Only name characters the player has been introduced to (check the knowledge block). Otherwise describe by appearance: "the broad woman behind the bar", "the thin stranger in the back room".
- Other characters REACT to the action — they are not scenery. Show their responses.
- Two to four sentences. Vivid and specific. No hedging.
- If the action involves moving to a new location, include "locationChange" with the new coordinates.

Respond with JSON:
{
  "solid": "The narrative of what happened.",
  "knowledgeUpdates": ["Things the character now knows that they didn't before — learned through THIS action. Use descriptions, not world-block names."],
  "eventEntry": "One-line summary for the world events log.",
  "locationChange": null
}

ONLY valid JSON. No markdown fences.`

  const response = await callClaude(
    apiKey,
    'claude-sonnet-4-6',
    system,
    user,
    1024,
    'MEDIUM'
  )

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
    locationChange: parsed.locationChange ?? null,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
  }
}
