/**
 * shelf.ts — read/write JSON blocks. Pure localStorage.
 *
 * No server. No database. Blocks live in the browser.
 * Reset = clear localStorage and reseed from bundled world files.
 * Back up = export to file. Restore = import from file.
 */

import { logShelf, logEvent } from './logger'

const PREFIX = 'xstream:'

export async function readBlock(id: string): Promise<any | null> {
  const raw = localStorage.getItem(PREFIX + id)
  if (!raw) {
    logEvent('shelf', `READ "${id}" — not found`)
    return null
  }
  const data = JSON.parse(raw)
  logShelf('READ', id, data)
  return data
}

export async function writeBlock(id: string, block: any): Promise<void> {
  logShelf('WRITE', id, block)
  localStorage.setItem(PREFIX + id, JSON.stringify(block))
}

export async function readBlocksByPrefix(
  prefix: string
): Promise<Array<{ id: string; data: any }>> {
  const results: Array<{ id: string; data: any }> = []
  const fullPrefix = PREFIX + prefix
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(fullPrefix)) {
      const id = key.slice(PREFIX.length)
      const data = JSON.parse(localStorage.getItem(key)!)
      results.push({ id, data })
    }
  }
  logEvent('shelf', `READ prefix "${prefix}" — ${results.length} results`)
  return results
}

export function deleteBlock(id: string): void {
  localStorage.removeItem(PREFIX + id)
  logEvent('shelf', `DELETE "${id}"`)
}

export function clearAllBlocks(): void {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(PREFIX)) keys.push(key)
  }
  keys.forEach(k => localStorage.removeItem(k))
  logEvent('shelf', `CLEARED ${keys.length} blocks`)
}

export function exportAllBlocks(): string {
  const blocks: Record<string, any> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(PREFIX)) {
      blocks[key.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(key)!)
    }
  }
  return JSON.stringify(blocks, null, 2)
}

export function importBlocks(json: string): void {
  const blocks = JSON.parse(json)
  for (const [id, data] of Object.entries(blocks)) {
    localStorage.setItem(PREFIX + id, JSON.stringify(data))
  }
  logEvent('shelf', `IMPORTED ${Object.keys(blocks).length} blocks`)
}
