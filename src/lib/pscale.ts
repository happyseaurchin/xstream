/**
 * Pscale coordinate utilities
 *
 * Coordinates are hierarchical digit strings where:
 * - Each position = pscale level (power of 10)
 * - Each digit = semantic ID at that level
 * - Decimal separates positive (outer) from negative (inner)
 */

import type { PscaleCoord, Coordinates } from '../types'

/**
 * Calculate shared prefix length between two coordinates.
 * Used for proximity calculation.
 */
export function sharedPrefixLength(a: PscaleCoord, b: PscaleCoord): number {
  // Normalize: ensure decimal present
  const normA = a.includes('.') ? a : a + '.'
  const normB = b.includes('.') ? b : b + '.'

  let shared = 0
  const minLen = Math.min(normA.length, normB.length)

  for (let i = 0; i < minLen; i++) {
    if (normA[i] !== normB[i]) break
    if (normA[i] !== '.') shared++
  }

  return shared
}

export type ProximityState = 'close' | 'nearby' | 'distant' | 'far'

/**
 * Determine proximity state between two coordinates.
 */
export function proximity(a: PscaleCoord, b: PscaleCoord): ProximityState {
  const shared = sharedPrefixLength(a, b)
  if (shared >= 2) return 'close'
  if (shared >= 1) return 'nearby'
  return 'distant'
}

/**
 * Check if two full coordinate sets are proximate.
 * Returns the worst proximity across all dimensions.
 */
export function areProximate(a: Coordinates, b: Coordinates): ProximityState {
  const tProx = proximity(a.t, b.t)
  const sProx = proximity(a.s, b.s)
  // Identity proximity matters less for content visibility

  const rank: Record<ProximityState, number> = {
    close: 0, nearby: 1, distant: 2, far: 3
  }

  const worst = Math.max(rank[tProx], rank[sProx])
  return Object.entries(rank).find(([, v]) => v === worst)![0] as ProximityState
}

/**
 * Check if coordinate matches a prefix pattern.
 * Used for proximity queries.
 */
export function matchesPrefix(coord: PscaleCoord, prefix: string): boolean {
  return coord.startsWith(prefix)
}

/**
 * Get SQL LIKE pattern for proximity query.
 * Returns pattern that matches coordinate and its children.
 */
export function prefixPattern(coord: PscaleCoord): string {
  // Remove trailing dot if present, then add %
  const base = coord.endsWith('.') ? coord.slice(0, -1) : coord
  return base + '%'
}

/**
 * Check if a coordinate is in the meta-layer (0.x)
 */
export function isMeta(coord: PscaleCoord): boolean {
  return coord.startsWith('0.')
}

/**
 * Get the pscale level of the rightmost significant digit.
 * Examples:
 *   "300" → 2 (10²)
 *   "321" → 0 (10⁰)
 *   "0.3" → -1 (10⁻¹)
 */
export function pscaleLevel(coord: PscaleCoord): number {
  if (!coord.includes('.')) {
    // No decimal: pscale = position from right - 1
    return coord.length - coord.replace(/0+$/, '').length
  }

  const [intPart, decPart] = coord.split('.')
  if (decPart && decPart.length > 0) {
    // Has decimal part: negative pscale
    return -decPart.length
  }

  // Decimal but no fractional: use integer part
  return intPart.length - intPart.replace(/0+$/, '').length
}
