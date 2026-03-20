/**
 * shelf.ts — read/write JSON blocks by key.
 *
 * Supabase as a JSON locker. One table, three functions.
 * The shelf table stores pscale blocks as JSONB with a text key.
 */

import { supabase } from './supabase'

export async function readBlock(id: string): Promise<any | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('blocks')
    .select('data')
    .eq('id', id)
    .single()
  if (error) {
    console.warn(`[shelf] readBlock("${id}") failed:`, error.message)
    return null
  }
  return data?.data ?? null
}

export async function writeBlock(id: string, block: any): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('blocks')
    .upsert({ id, data: block, updated_at: new Date().toISOString() })
  if (error) {
    console.error(`[shelf] writeBlock("${id}") failed:`, error.message)
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
    console.warn(`[shelf] readBlocksByPrefix("${prefix}") failed:`, error.message)
    return []
  }
  return data ?? []
}
