/**
 * reset-world.ts — reset Thornkeep blocks in Supabase to their authored state.
 *
 * Usage: npx tsx scripts/reset-world.ts
 *
 * Reads the JSON files from blocks/worlds/thornkeep/ and upserts them
 * into the blocks table. Also deletes any player knowledge blocks.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const SUPABASE_URL = 'https://piqxyfmzzywxzqkzmpmm.supabase.co'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_ANON_KEY) {
  console.error('Set VITE_SUPABASE_ANON_KEY environment variable')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const WORLD_ID = 'thornkeep'
const BLOCKS_DIR = join(__dirname, '..', 'blocks', 'worlds', WORLD_ID)

const BLOCK_FILES = ['spatial', 'events', 'characters', 'rules']

async function main() {
  console.log(`Resetting ${WORLD_ID} blocks...`)

  // 1. Upsert world blocks from files
  for (const name of BLOCK_FILES) {
    const path = join(BLOCKS_DIR, `${name}.json`)
    const data = JSON.parse(readFileSync(path, 'utf-8'))
    const id = `${WORLD_ID}:${name}`

    const { error } = await supabase
      .from('blocks')
      .upsert({ id, data, updated_at: new Date().toISOString() })

    if (error) {
      console.error(`  ❌ ${id}: ${error.message}`)
    } else {
      console.log(`  ✅ ${id} reset`)
    }
  }

  // 2. Delete player knowledge blocks
  const { data: playerBlocks } = await supabase
    .from('blocks')
    .select('id')
    .like('id', '%:knowledge')

  if (playerBlocks && playerBlocks.length > 0) {
    for (const block of playerBlocks) {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('id', block.id)

      if (error) {
        console.error(`  ❌ Delete ${block.id}: ${error.message}`)
      } else {
        console.log(`  🗑️  ${block.id} deleted`)
      }
    }
  }

  console.log('Done. World is fresh.')
}

main()
