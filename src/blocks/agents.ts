/**
 * agents.ts — export agent and face block definitions.
 *
 * These are bundled in the app, not fetched at runtime.
 * Each block is a self-describing pscale JSON structure
 * that the LLM reads as its own identity.
 */

import type { PscaleBlock } from '../lib/bsp'

import hardBlock from '../../blocks/agents/hard.json'
import mediumBlock from '../../blocks/agents/medium.json'
import softBlock from '../../blocks/agents/soft.json'
import facesBlock from '../../blocks/agents/faces.json'
import knowledgeTemplate from '../../blocks/templates/knowledge.json'

export const HARD_BLOCK = hardBlock as unknown as PscaleBlock
export const MEDIUM_BLOCK = mediumBlock as unknown as PscaleBlock
export const SOFT_BLOCK = softBlock as unknown as PscaleBlock
export const FACES_BLOCK = facesBlock as unknown as PscaleBlock
export const KNOWLEDGE_TEMPLATE = knowledgeTemplate as unknown as PscaleBlock
