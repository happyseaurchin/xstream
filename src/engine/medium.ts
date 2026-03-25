/**
 * medium.ts — Medium-LLM engine (real-world mode).
 *
 * The breath. Synthesises committed intentions into solid output.
 * In real-world mode: not narrative fiction, but coordination synthesis.
 * What emerges when a user's commitment meets the context.
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
  userName: string,
  face: 'player' | 'author' | 'designer'
): Promise<MediumResult> {
  const knowledgeText = knowledge
    ? blockToText(knowledge, 3)
    : 'No accumulated knowledge yet.'

  const system = blockToText(MEDIUM_BLOCK as PscaleBlock, 4)

  const user = `FACE: ${face === 'player' ? 'character' : face}
USER: ${userName}

--- CONTEXT (from Hard-LLM frame) ---
${frame.environment}

--- THIS USER ---
${frame.characterState}

--- OTHER USERS (if any) ---
${frame.proximateCharacters}

--- INTERACTION NORMS ---
${frame.activeRules}

--- ACCUMULATED KNOWLEDGE ---
${knowledgeText}

--- COMMITTED CONTENT ---
${committed}

You are the synthesis engine. ${userName} has committed the above. Synthesise what emerges.

CRITICAL RULES FOR REAL-WORLD MODE:
- Write in SECOND PERSON PRESENT TENSE. "You articulate...", "You connect...", not third person.
- This is REAL engagement, not fiction. Ground everything in actual knowledge.
- Draw on what you know about the real world. If they committed a thought about climate policy, contextualise it with what you actually know.
- If other users are present, show how their contributions relate. If solo, synthesise the user's thinking with relevant world context.
- Two to four sentences. Specific, grounded, useful. No hedging.
- This is what EMERGES from commitment meeting context — not what the user should think, but what naturally follows.
- If the commitment shifts the user's focus significantly, include "locationChange" with a note about the shift.

Respond with JSON:
{
  "solid": "What emerges from this commitment in this context.",
  "knowledgeUpdates": ["Things the system should now register — connections made, context established, insights that emerged."],
  "eventEntry": "One-line summary for the session events log.",
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
