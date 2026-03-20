/**
 * hard.ts — Hard-LLM engine.
 *
 * The spine. Reads world blocks via BSP, produces a frame
 * that Medium and Soft consume. Never faces the user.
 *
 * Triggers: entry, location-change, stale-frame, manual refresh.
 * Model: Sonnet (quality over speed — runs rarely).
 */

import { bsp, blockToText, spindleTexts, floorDepth } from '../lib/bsp'
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

  // 2. BSP-extract spindle from spatial at character's coordinates
  // coordinates is e.g. '111' for main room in a floor-3 block
  // Pass directly — no '0.' prefix for accumulation blocks
  const spatialSpindle = spatial
    ? spindleTexts(spatial as PscaleBlock, coordinates).join(' → ')
    : 'No spatial data.'

  // Also get siblings (what's adjacent)
  const spatialResult = spatial ? bsp(spatial as PscaleBlock, coordinates, 'ring') : null
  const adjacentText = spatialResult && spatialResult.mode === 'ring'
    ? spatialResult.siblings.map(s => `${s.digit}: ${s.text || '?'}`).join(', ')
    : 'Unknown'

  // 3. Events — render the full block (it's small)
  const eventsText = events ? blockToText(events as PscaleBlock, 3) : 'No events.'

  // 4. Characters — extract who is nearby based on location
  // Hard sees everything to compute proximity
  const charactersText = characters ? blockToText(characters as PscaleBlock, 3) : 'No characters.'

  // 5. Rules — extract at the top-level location digit
  const topDigit = coordinates.charAt(0)
  const rulesSpindle = rules
    ? spindleTexts(rules as PscaleBlock, `0.${topDigit}`).join('\n')
    : 'No rules.'

  // 6. Knowledge
  const knowledgeText = knowledge ? blockToText(knowledge, 3) : 'No knowledge yet.'

  // 7. Face context
  const faceIndex = face === 'player' ? '1' : face === 'author' ? '2' : '3'
  const faceSpindle = spindleTexts(FACES_BLOCK as PscaleBlock, `0.${faceIndex}`).join('\n')

  // 8. Compose
  const system = blockToText(HARD_BLOCK as PscaleBlock, 4)

  const user = `TRIGGER: ${trigger}
CHARACTER: ${characterName}
COORDINATES: ${coordinates} (floor 3: pscale +2 = village, +1 = building, 0 = room, -1 = detail)
FACE: ${face}

--- SPATIAL SPINDLE (where I am, broad to specific) ---
${spatialSpindle}

--- ADJACENT LOCATIONS ---
${adjacentText}

--- EVENTS (what has happened) ---
${eventsText}

--- ALL CHARACTERS ---
${charactersText}

--- RULES ---
${rulesSpindle}

--- WHAT MY CHARACTER KNOWS ---
${knowledgeText}

--- FACE INSTRUCTIONS ---
${faceSpindle}

Produce a frame as JSON. The frame must describe the world ONLY as experienced by ${characterName}.
Use sensory detail from the spatial spindle. Do not name characters unless they are in the knowledge block.

Keys:
- characterState: who I am, where I am, what I perceive (sensory, atmospheric)
- proximateCharacters: who is visible and what they appear to be doing (use knowledge block for names, otherwise describe by appearance)
- environment: the scene — draw heavily from the spatial spindle. Sights, sounds, smells.
- activeRules: constraints that apply here (from rules block)
- availableActions: what I could plausibly do (specific to this scene, not generic)
- knowledgeUpdates: array of things the character can now perceive that are not in their knowledge block (describe by appearance, not by name, unless introduced)
- locationChange: null unless the character has moved

Respond with ONLY valid JSON, no markdown fences.`

  const response = await callClaude(apiKey, 'claude-sonnet-4-6', system, user, 2048, 'HARD')

  let parsed: any
  try {
    parsed = JSON.parse(response.text)
  } catch {
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
