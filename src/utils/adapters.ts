// Type adapters: Convert xstream hook data → vapor-flow UI types
// This bridges the existing xstream infrastructure with the new vapor-flow components

import type { SolidEntry } from '../hooks/useSolidSubscription'
import type { LiquidEntry } from '../hooks/useLiquidSubscription'
import type { VaporContent } from '../hooks/useFrameChannel'
import type { 
  SolidBlock, 
  LiquidCard, 
  VapourEntry, 
  Column, 
  Face 
} from '../types/vapor-flow-ui'

/**
 * Convert xstream SolidEntry → vapor-flow SolidBlock
 */
export function solidEntryToBlock(entry: SolidEntry): SolidBlock {
  return {
    id: entry.id,
    // No title in xstream solid entries currently
    content: entry.narrative || '',
    timestamp: new Date(entry.createdAt).getTime(),
  }
}

/**
 * Convert array of SolidEntry → SolidBlock[]
 * Filters out placeholder entries (narrative === null means synthesis in progress)
 */
export function solidEntriesToBlocks(entries: SolidEntry[]): SolidBlock[] {
  return entries
    .filter(e => e.narrative !== null) // Filter out placeholders
    .map(solidEntryToBlock)
}

/**
 * Convert xstream LiquidEntry → vapor-flow LiquidCard
 */
export function liquidEntryToCard(entry: LiquidEntry): LiquidCard {
  return {
    id: entry.id,
    userId: entry.userId,
    userName: entry.userName,
    content: entry.content,
    timestamp: new Date(entry.createdAt).getTime(),
  }
}

/**
 * Convert array of LiquidEntry → LiquidCard[]
 */
export function liquidEntriesToCards(entries: LiquidEntry[]): LiquidCard[] {
  return entries.map(liquidEntryToCard)
}

/**
 * Convert xstream VaporContent → vapor-flow VapourEntry
 * @param vapor - The vapor content from useFrameChannel
 * @param currentUserId - Current user's ID to determine isSelf
 */
export function vaporContentToEntry(
  vapor: VaporContent, 
  currentUserId: string
): VapourEntry {
  return {
    id: `vapor-${vapor.userId}-${vapor.timestamp}`,
    userId: vapor.userId,
    userName: vapor.userName,
    text: vapor.text,
    timestamp: vapor.timestamp,
    isSelf: vapor.userId === currentUserId,
  }
}

/**
 * Convert array of VaporContent → VapourEntry[]
 * @param vapors - Array of vapor content from others
 * @param currentUserId - Current user's ID
 * @param selfVaporText - Current user's vapor text (optional)
 * @param selfUserName - Current user's name
 */
export function vaporContentsToEntries(
  vapors: VaporContent[],
  currentUserId: string,
  selfVaporText?: string,
  selfUserName?: string
): VapourEntry[] {
  const entries: VapourEntry[] = vapors.map(v => vaporContentToEntry(v, currentUserId))
  
  // Add self vapor if present
  if (selfVaporText && selfUserName) {
    entries.push({
      id: `vapor-self-${Date.now()}`,
      userId: currentUserId,
      userName: selfUserName,
      text: selfVaporText,
      timestamp: Date.now(),
      isSelf: true,
    })
  }
  
  return entries
}

/**
 * Build a vapor-flow Column from xstream hook data
 */
export function buildColumn(params: {
  id: string
  face: Face
  frameId: string | null
  frameName?: string
  characterName?: string
  solidEntries: SolidEntry[]
  liquidEntries: LiquidEntry[]
  othersVapor: VaporContent[]
  selfVaporText?: string
  currentUserId: string
  currentUserName: string
  stateCode?: string
  background?: string
}): Column {
  const {
    id,
    face,
    frameId: _frameId, // Reserved for future use
    frameName = 'main-frame',
    characterName,
    solidEntries,
    liquidEntries,
    othersVapor,
    selfVaporText,
    currentUserId,
    currentUserName,
    stateCode = 'X0Y0Z0',
    background,
  } = params

  return {
    id,
    face,
    frame: frameName,
    character: characterName,
    solidBlocks: solidEntriesToBlocks(
      solidEntries.filter(e => e.face === face)
    ),
    liquidCards: liquidEntriesToCards(
      liquidEntries.filter(e => e.face === face)
    ),
    vapourEntries: vaporContentsToEntries(
      othersVapor.filter(v => v.face === face),
      currentUserId,
      selfVaporText,
      currentUserName
    ),
    stateCode,
    background,
  }
}
