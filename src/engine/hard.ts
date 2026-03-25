/**
 * hard.ts — Hard-LLM engine (real-world mode).
 *
 * The spine. Reads user context and world blocks, draws on
 * its own knowledge of the real world, produces a frame
 * that Medium and Soft consume. Never faces the user.
 *
 * Key difference from fantasy: the LLM's training data IS the world.
 * Spatial blocks provide structure; the LLM fills content.
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

export type HardTrigger = 'entry' | 'context-shift' | 'new-proximity' | 'refresh'

export async function runHard(
  apiKey: string,
  userName: string,
  coordinates: string,
  worldId: string,
  face: 'player' | 'author' | 'designer',
  trigger: HardTrigger,
  knowledge: PscaleBlock | null,
  userContext?: string
): Promise<HardResult> {
  // 1. Read world blocks from shelf
  const [spatial, events, characters, rules] = await Promise.all([
    readBlock(`${worldId}:spatial`),
    readBlock(`${worldId}:events`),
    readBlock(`${worldId}:characters`),
    readBlock(`${worldId}:rules`),
  ])

  // 2. Spatial — extract structure at coordinates
  const spatialSpindle = spatial
    ? spindleTexts(spatial as PscaleBlock, coordinates).join(' → ')
    : 'No spatial data — user location unresolved.'

  const spatialResult = spatial ? bsp(spatial as PscaleBlock, coordinates, 'ring') : null
  const adjacentText = spatialResult && spatialResult.mode === 'ring'
    ? spatialResult.siblings.map(s => `${s.digit}: ${s.text || '?'}`).join(', ')
    : 'Unknown'

  // 3. Events — full block (small)
  const eventsText = events ? blockToText(events as PscaleBlock, 3) : 'No session events yet.'

  // 4. Characters — who else is here
  const charactersText = characters ? blockToText(characters as PscaleBlock, 3) : 'No other users.'

  // 5. Rules — interaction norms
  const rulesText = rules ? blockToText(rules as PscaleBlock, 3) : 'Default norms apply.'

  // 6. Knowledge
  const knowledgeText = knowledge ? blockToText(knowledge, 3) : 'No accumulated knowledge yet.'

  // 7. Face context
  const faceIndex = face === 'player' ? '1' : face === 'author' ? '2' : '3'
  const faceSpindle = spindleTexts(FACES_BLOCK as PscaleBlock, `0.${faceIndex}`).join('\n')

  // 8. Compose
  const system = blockToText(HARD_BLOCK as PscaleBlock, 4)

  const user = `TRIGGER: ${trigger}
USER: ${userName}
COORDINATES: ${coordinates}
FACE: ${face === 'player' ? 'character' : face}

--- USER'S CONTEXT (what they told us) ---
${userContext || 'No context provided yet. The user has just arrived.'}

--- SPATIAL STRUCTURE ---
${spatialSpindle}

--- ADJACENT CONTEXTS ---
${adjacentText}

--- SESSION EVENTS ---
${eventsText}

--- ALL USERS ---
${charactersText}

--- INTERACTION NORMS ---
${rulesText}

--- USER'S ACCUMULATED KNOWLEDGE ---
${knowledgeText}

--- FACE INSTRUCTIONS ---
${faceSpindle}

Produce a frame as JSON. The frame describes the world as relevant to ${userName}.

CRITICAL: You are operating in REAL-WORLD mode. You know the real world from your training data.
If the user mentions a city, topic, profession, or situation — you know about it. Use that knowledge.
Do not limit yourself to what is in the blocks. The blocks provide structure and session history.
YOUR KNOWLEDGE provides the world content.

If other users are listed in the characters block, compute their relevance to this user
(shared interests, shared location, temporal overlap). If no other users exist, that's fine —
frame for a solo user engaging their own thinking.

Keys:
- characterState: who this person is, what they're focused on, their situation as you understand it
- proximateCharacters: other users who are relevant (if any), what they're working on, how it relates
- environment: the real-world context relevant to this user's focus — what you know about their topic, location, situation
- activeRules: which interaction norms apply (from rules block)
- availableActions: what the user could do — engage others, deepen thinking, shift focus, produce content, explore connections
- knowledgeUpdates: array of contextual insights the system should register (things inferred from what the user provided)
- locationChange: null unless the user has moved context

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
