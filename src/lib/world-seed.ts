/**
 * world-seed.ts — bundle world blocks and seed localStorage on first run.
 *
 * Imports the authored JSON files directly (Vite bundles them).
 * On first run, writes them to localStorage. On reset, overwrites.
 */

import spatial from '../../blocks/worlds/thornkeep/spatial.json'
import events from '../../blocks/worlds/thornkeep/events.json'
import characters from '../../blocks/worlds/thornkeep/characters.json'
import rules from '../../blocks/worlds/thornkeep/rules.json'
import { clearAllBlocks } from './shelf'

const WORLD = 'thornkeep'

const SEED_BLOCKS: Record<string, any> = {
  [`${WORLD}:spatial`]: spatial,
  [`${WORLD}:events`]: events,
  [`${WORLD}:characters`]: characters,
  [`${WORLD}:rules`]: rules,
}

const PREFIX = 'xstream:'
const SEEDED_KEY = 'xstream:_seeded'

function writeBlockDirect(id: string, data: any) {
  localStorage.setItem(PREFIX + id, JSON.stringify(data))
}

/** Seed world blocks if not already present. */
export function seedIfNeeded(): void {
  if (localStorage.getItem(SEEDED_KEY)) return
  console.log('🌱 First run — seeding world blocks...')
  for (const [id, data] of Object.entries(SEED_BLOCKS)) {
    writeBlockDirect(id, data)
    console.log(`  ✅ ${id}`)
  }
  localStorage.setItem(SEEDED_KEY, new Date().toISOString())
  console.log('🌊 World ready.')
}

/** Reset everything — clear all blocks, reseed from authored files. */
export function resetWorld(): void {
  clearAllBlocks()
  localStorage.removeItem(SEEDED_KEY)
  console.log('🗑️ Cleared. Reseeding...')
  for (const [id, data] of Object.entries(SEED_BLOCKS)) {
    writeBlockDirect(id, data)
    console.log(`  ✅ ${id}`)
  }
  localStorage.setItem(SEEDED_KEY, new Date().toISOString())
  console.log('🌊 World reset. Fresh start.')
}

// Available from console
if (typeof window !== 'undefined') {
  (window as any).resetWorld = resetWorld
}
