/**
 * reset-world.ts — wipe all blocks and re-upload from JSON files.
 *
 * Usage: npm run reset
 *
 * 1. Deletes ALL rows from the blocks table
 * 2. Uploads each JSON file from blocks/worlds/thornkeep/
 *
 * Reads VITE_SUPABASE_ANON_KEY from .env.local (create it if missing).
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Load .env.local manually (tsx doesn't auto-load it)
const envPath = join(__dirname, '..', '.env.local')
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) process.env[match[1].trim()] = match[2].trim()
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://piqxyfmzzywxzqkzmpmm.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_KEY) {
  console.error(`
  No anon key found. Create .env.local with:

    VITE_SUPABASE_URL=https://piqxyfmzzywxzqkzmpmm.supabase.co
    VITE_SUPABASE_ANON_KEY=your-key-here

  (Get the key from Supabase dashboard → Settings → API)
  `)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const WORLD = 'thornkeep'
const DIR = join(__dirname, '..', 'blocks', 'worlds', WORLD)
const FILES = ['spatial', 'events', 'characters', 'rules']

async function main() {
  // 1. Delete everything
  const { error: delErr } = await supabase.from('blocks').delete().neq('id', '')
  if (delErr) {
    console.error('Failed to clear:', delErr.message)
    process.exit(1)
  }
  console.log('🗑️  Cleared all blocks.')

  // 2. Upload originals from disk
  for (const name of FILES) {
    const data = JSON.parse(readFileSync(join(DIR, `${name}.json`), 'utf-8'))
    const { error } = await supabase
      .from('blocks')
      .insert({ id: `${WORLD}:${name}`, data, updated_at: new Date().toISOString() })

    if (error) console.error(`  ❌ ${name}: ${error.message}`)
    else console.log(`  ✅ ${WORLD}:${name}`)
  }

  console.log('\n🌊 World reset. Fresh start.')
}

main()
