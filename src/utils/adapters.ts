/**
 * Data Adapters for UI Integration
 * 
 * Converts between working App.tsx data types and vapor-flow UI component types.
 * This allows the new UI components to render existing data without modifying
 * either the hooks or the components.
 * 
 * Created: 2026-01-06
 * Phase: 0.11 UI Integration
 */

import type { SolidEntry } from '../hooks/useSolidSubscription'
import type { LiquidEntry } from '../hooks/useLiquidSubscription'
import type { VaporContent } from '../hooks/useFrameChannel'
import type { ShelfEntry } from '../types'
import type { SolidBlock, LiquidCard, VapourEntry } from '../types/xstream'

// ============================================================================
// SOLID ZONE ADAPTERS
// ============================================================================

/**
 * Convert database SolidEntry to UI SolidBlock
 * 
 * Source: useSolidSubscription → dbSolidEntries
 * Target: SolidZone → blocks prop
 * 
 * Note: vapor-flow style omits title for clean narrative presentation
 */
export function adaptSolidEntry(entry: SolidEntry): SolidBlock {
  return {
    id: entry.id,
    // No title - vapor-flow style shows clean narrative blocks
    content: entry.narrative || '(synthesizing...)',
    timestamp: new Date(entry.createdAt).getTime(),
  }
}

/**
 * Convert array of SolidEntry to SolidBlock[]
 */
export function adaptSolidEntries(entries: SolidEntry[]): SolidBlock[] {
  return entries.map(adaptSolidEntry)
}

// ============================================================================
// LIQUID ZONE ADAPTERS
// ============================================================================

/**
 * Convert local ShelfEntry (submitted state) to UI LiquidCard
 * 
 * Source: App.tsx → entries.filter(submitted)
 * Target: LiquidZone → cards prop (for own entries)
 */
export function adaptShelfEntry(entry: ShelfEntry, userName: string): LiquidCard {
  return {
    id: entry.id,
    userId: 'self', // Local entries are always self
    userName: userName,
    content: entry.text,
    timestamp: new Date(entry.timestamp).getTime(),
    isExpanded: false,
  }
}

/**
 * Convert array of ShelfEntry to LiquidCard[]
 */
export function adaptShelfEntries(entries: ShelfEntry[], userName: string): LiquidCard[] {
  return entries.map(e => adaptShelfEntry(e, userName))
}

/**
 * Convert database LiquidEntry to UI LiquidCard
 * 
 * Source: useLiquidSubscription → dbLiquidEntries (others' entries)
 * Target: LiquidZone → cards prop (for others' entries)
 */
export function adaptLiquidEntry(entry: LiquidEntry): LiquidCard {
  return {
    id: entry.id,
    userId: entry.userId,
    userName: entry.userName,
    content: entry.content,
    timestamp: new Date(entry.updatedAt).getTime(),
    isExpanded: false,
  }
}

/**
 * Convert array of LiquidEntry to LiquidCard[]
 */
export function adaptLiquidEntries(entries: LiquidEntry[]): LiquidCard[] {
  return entries.map(adaptLiquidEntry)
}

// ============================================================================
// VAPOR ZONE ADAPTERS
// ============================================================================

/**
 * Convert VaporContent (from realtime channel) to UI VapourEntry
 * 
 * Source: useFrameChannel → othersVapor
 * Target: VapourZone → entries prop
 */
export function adaptVaporContent(vapor: VaporContent): VapourEntry {
  return {
    id: `vapor-${vapor.userId}-${vapor.timestamp}`,
    userId: vapor.userId,
    userName: vapor.userName,
    text: vapor.text,
    timestamp: vapor.timestamp,
    isSelf: false, // VaporContent is always from others
  }
}

/**
 * Convert array of VaporContent to VapourEntry[]
 */
export function adaptVaporContents(vapors: VaporContent[]): VapourEntry[] {
  return vapors.map(adaptVaporContent)
}

/**
 * Create a VapourEntry for the current user's input
 * 
 * Source: App.tsx → input state
 * Target: VapourZone → entries prop (self entry)
 */
export function createSelfVapourEntry(
  input: string,
  userId: string,
  userName: string
): VapourEntry | null {
  if (!input.trim()) return null
  
  return {
    id: `vapor-self-${Date.now()}`,
    userId: userId,
    userName: userName,
    text: input,
    timestamp: Date.now(),
    isSelf: true,
  }
}

// ============================================================================
// COMBINED ADAPTERS (for convenience)
// ============================================================================

/**
 * Combine self input and others' vapor into single VapourEntry array
 */
export function combineVapourEntries(
  selfInput: string,
  selfUserId: string,
  selfUserName: string,
  othersVapor: VaporContent[]
): VapourEntry[] {
  const entries: VapourEntry[] = []
  
  // Add self entry if there's input
  const selfEntry = createSelfVapourEntry(selfInput, selfUserId, selfUserName)
  if (selfEntry) {
    entries.push(selfEntry)
  }
  
  // Add others' entries
  entries.push(...adaptVaporContents(othersVapor))
  
  return entries
}

/**
 * Combine self liquid entries and others' liquid entries into single LiquidCard array
 */
export function combineLiquidCards(
  selfEntries: ShelfEntry[],
  selfUserName: string,
  othersEntries: LiquidEntry[]
): LiquidCard[] {
  const selfCards = adaptShelfEntries(selfEntries, selfUserName)
  const othersCards = adaptLiquidEntries(othersEntries)
  
  // Self entries first, then others
  return [...selfCards, ...othersCards]
}
