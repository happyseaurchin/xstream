/**
 * shelf.ts — read/write JSON blocks by key, with logging.
 *
 * Supabase as a JSON locker. One table, three functions.
 * Every read/write is logged to console with the full block data.
 */

import { supabase } from './supabase'

export async function readBlock(id: string): Promise<any | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('blocks')
    .select('data')
    .eq('id', id)
    .maybeSingle()
  if (error) {
    console.warn(`📦 [shelf] READ "${id}" — error:`, error.message)
    return null
  }
  if (!data) {
    console.log(`📦 [shelf] READ "${id}" — not found`)
    return null
  }
  console.group(`📦 [shelf] READ "${id}"`)
  console.log(data.data)
  console.groupEnd()
  return data.data ?? null
}

export async function writeBlock(id: string, block: any): Promise<void> {
  if (!supabase) return
  console.group(`📦 [shelf] WRITE "${id}"`)
  console.log(block)
  console.groupEnd()
  const { error } = await supabase
    .from('blocks')
    .upsert({ id, data: block, updated_at: new Date().toISOString() })
  if (error) {
    console.error(`📦 [shelf] WRITE "${id}" — error:`, error.message)
  }
}

export async function readBlocksByPrefix(
  prefix: string
): Promise<Array<{ id: string; data: any }>> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('blocks')
    .select('id, data')
    .like('id', `${prefix}%`)
  if (error) {
    console.warn(`📦 [shelf] READ prefix "${prefix}" — error:`, error.message)
    return []
  }
  console.log(`📦 [shelf] READ prefix "${prefix}" — ${data?.length ?? 0} results`)
  return data ?? []
}
