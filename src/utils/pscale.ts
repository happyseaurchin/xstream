/**
 * Pscale coordinate utilities
 * Pure string operations for coordinate manipulation
 */

import type {
  SemanticTabulation,
  ProximityState,
} from '../types/pscale'

/**
 * Check if a string is a valid pscale coordinate
 * Valid: digits optionally separated by dots (e.g., "1", "13", "13.4", "13.4.2")
 */
export function isValidCoordinate(coord: string): boolean {
  if (!coord || coord.length === 0) return false
  return /^\d+(\.\d+)*$/.test(coord)
}

/**
 * Normalize coordinate to consistent format
 * Removes leading zeros from each segment, trims whitespace
 */
export function normalizeCoordinate(coord: string): string {
  if (!coord) return ''
  return coord
    .trim()
    .split('.')
    .map(segment => String(parseInt(segment, 10) || 0))
    .join('.')
}

/**
 * Calculate shared prefix length between two coordinates
 * This is the core proximity algorithm
 * 
 * Examples:
 *   sharedPrefixLength("13.4.2", "13.4.7") -> 4 (shares "13.4")
 *   sharedPrefixLength("13.4", "13.5") -> 2 (shares "13")
 *   sharedPrefixLength("13", "24") -> 0 (no shared prefix)
 */
export function sharedPrefixLength(coordA: string, coordB: string): number {
  const partsA = coordA.split('.')
  const partsB = coordB.split('.')
  
  let sharedDigits = 0
  const minLength = Math.min(partsA.length, partsB.length)
  
  for (let i = 0; i < minLength; i++) {
    if (partsA[i] === partsB[i]) {
      // Count digits in this segment plus 1 for the separator (except first)
      sharedDigits += partsA[i].length + (i > 0 ? 1 : 0)
    } else {
      break
    }
  }
  
  return sharedDigits
}

/**
 * Determine spatial proximity state from shared prefix length
 */
export function spatialProximity(sharedLength: number): ProximityState {
  if (sharedLength >= 4) return 'close'    // Same room/immediate area
  if (sharedLength >= 2) return 'nearby'   // Same building/region
  return 'distant'                          // Different regions
}

/**
 * Determine combined proximity considering both spatial and temporal coordinates
 */
export function combinedProximity(
  spatialA: string,
  spatialB: string,
  temporalA: string,
  temporalB: string
): ProximityState {
  const spatialShared = sharedPrefixLength(spatialA, spatialB)
  const temporalShared = sharedPrefixLength(temporalA, temporalB)
  
  // Both must be proximate for "close"
  if (spatialShared >= 4 && temporalShared >= 2) return 'close'
  // Either spatially nearby or temporally aligned
  if (spatialShared >= 2 || temporalShared >= 2) return 'nearby'
  return 'distant'
}

/**
 * Decode a coordinate to semantic names using tabulation
 * Returns array of decoded segments
 * 
 * SemanticTabulation format: { "pscaleLevel": { "digit": "label" } }
 */
export function decodeCoordinate(
  coord: string,
  tabulation: SemanticTabulation
): string[] {
  const parts = coord.split('.')
  const decoded: string[] = []
  
  for (let i = 0; i < parts.length; i++) {
    const pscaleKey = String(i) // 0-indexed position corresponds to pscale level
    const digitKey = parts[i]
    
    const pscaleTab = tabulation[pscaleKey]
    if (pscaleTab && pscaleTab[digitKey]) {
      decoded.push(pscaleTab[digitKey])
    } else {
      decoded.push(`[${pscaleKey}:${digitKey}]`) // Unknown mapping
    }
  }
  
  return decoded
}

/**
 * Format tabulation for display
 */
export function formatTabulation(tabulation: SemanticTabulation): string {
  return Object.entries(tabulation)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([pscale, digits]) => {
      const items = Object.entries(digits)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([digit, label]) => `  ${digit}: ${label}`)
        .join('\n')
      return `P${pscale}:\n${items}`
    })
    .join('\n\n')
}

/**
 * Get digit at specific pscale position
 */
export function digitAtPscale(coord: string, pscale: number): number | null {
  const parts = coord.split('.')
  if (pscale >= parts.length) return null
  return parseInt(parts[pscale], 10)
}

/**
 * Set digit at specific pscale position, extending if needed
 */
export function setDigitAtPscale(coord: string, pscale: number, value: number): string {
  const parts = coord.split('.')
  
  // Extend array if pscale is beyond current length
  while (parts.length <= pscale) {
    parts.push('0')
  }
  
  parts[pscale] = String(value)
  return parts.join('.')
}
