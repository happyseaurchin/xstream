/**
 * hard.ts — Hard-LLM engine.
 *
 * The spine. Reads world blocks via BSP, produces a frame
 * that Medium and Soft consume. Never faces the user.
 *
 * Triggers: entry, location-change, stale-frame, manual refresh.
 * Model: Sonnet (quality over speed — runs rarely).
 */

import { bsp, blockToText, spindleTexts } from '../lib/bsp'
import type { PscaleBlock } from '../lib/bsp'
import { readBlock } from '../lib/shelf'
import { callClaude } from '../lib/claude'
import { HARD_BLOCK, FACES_BLOCK } from '../blocks/agents'

export interface Frame {
  characterState: string
  proximateCharacters: string
  environment: string
  activeRules: string
  availableActions: string
  raw: string
}

export interface HardResult {
  frame: Frame
  knowledgeUpdates: string[]
  locationChange?: string
}

export type HardTrigger = 'entry' | 'location-change' | 'stale' | 'refresh'

export async function runHard(
  apiKey: string,
  characterName: string,
  coordinates: string,
  worldId: string,
  face: 'player' | 'author' | 'designer',
  trigger: HardTrigger,
  knowledge: PscaleBlock | null
): Promise<HardResult> {
  // 1. Read world blocks from shelf
  const [spatial, events, characters, rules] = await Promise.all([
    readBlock(`${worldId}:spatial`),
    readBlock(`${worldId}:events`),
    readBlock(`${worldId}:characters`),
    readBlock(`${worldId}:rules`),
  ])

  // 2. BSP-extract spindles at character's coordinates
  const spatialSpindle = spatial
    ? spindleTexts(spatial, `0.${coordinates}`).join('\n')
    : 'No spatial data available.'

  const eventsText = events ? blockToText(events, 4) : 'No events recorded.'

  const charactersText = characters
    ? blockToText(characters, 3)
    : 'No characters present.'

  const rulesSpindle = rules
    ? spindleTexts(rules, `0.${coordinates.charAt(0)}`).join('\n')
    : 'No rules defined.'

  // 3. Extract knowledge spindle
  const knowledgeText = knowledge
    ? blockToText(knowledge, 3)
    : 'No knowledge yet.'

  // 4. Get face context
  const faceIndex = face === 'player' ? '1' : face === 'author' ? '2' : '3'
  const faceSpindle = spindleTexts(FACES_BLOCK, `0.${faceIndex}`).join('\n')

  // 5. Compose system prompt from Hard block
  const system = blockToText(HARD_BLOCK, 4)

  // 6. Compose user message
  const user = `TRIGGER: ${trigger}
CHARACTER: ${characterName}
COORDINATES: ${coordinates}
FACE: ${face}

--- FACE CONTEXT ---
${faceSpindle}

--- SPATIAL (at ${coordinates}) ---
${spatialSpindle}

--- EVENTS ---
${eventsText}

--- CHARACTERS ---
${charactersText}

--- RULES (at ${coordinates}) ---
${rulesSpindle}

--- CHARACTER KNOWLEDGE ---
${knowledgeText}

Produce a frame as JSON with these keys:
- characterState: who I am, where I am, what I perceive
- proximateCharacters: who is nearby and what they appear to be doing
- environment: the scene — sights, sounds, smells, atmosphere
- activeRules: what constraints apply here
- availableActions: what I could plausibly do right now

Also return:
- knowledgeUpdates: array of strings — things the character should now know that are not in their knowledge block
- locationChange: string or null — new coordinates if the character has moved

Respond with ONLY valid JSON, no markdown fences.`

  // 7. Call Claude (Sonnet)
  const response = await callClaude(
    apiKey,
    'claude-sonnet-4-20250514',
    system,
    user,
    2048
  )

  // 8. Parse response
  let parsed: any
  try {
    parsed = JSON.parse(response.text)
  } catch {
    // If Claude didn't return clean JSON, try to extract it
    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
  }

  const frame: Frame = {
    characterState: parsed.characterState ?? '',
    proximateCharacters: parsed.proximateCharacters ?? '',
    environment: parsed.environment ?? '',
    activeRules: parsed.activeRules ?? '',
    availableActions: parsed.availableActions ?? '',
    raw: response.text,
  }

  return {
    frame,
    knowledgeUpdates: parsed.knowledgeUpdates ?? [],
    locationChange: parsed.locationChange ?? null,
  }
}
