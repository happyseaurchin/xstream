/**
 * shelf.ts — read/write JSON blocks by key, with logging.
 */

import { supabase } from './supabase'
import { logShelf, logEvent } from './logger'

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
    logEvent('shelf', `READ "${id}" — not found`)
    return null
  }
  logShelf('READ', id, data.data)
  return data.data ?? null
}

export async function writeBlock(id: string, block: any): Promise<void> {
  if (!supabase) return
  logShelf('WRITE', id, block)
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
  logEvent('shelf', `READ prefix "${prefix}" — ${data?.length ?? 0} results`)
  return data ?? []
}
