// ============================================================
// PSCALE COORDINATE UTILITIES
// Phase 0.8: Hard-LLM & Narrative Aperture
// ============================================================

import type {
  PscaleCoordinate,
  ProximityState,
  SemanticTabulation,
  Aperture,
  ContentEntry
} from '../types/pscale';

// ============================================================
// COORDINATE VALIDATION
// ============================================================

/**
 * Coordinate format: digits + optional (decimal + digits)
 * Valid: "1.", "13.", "13.4", "13.42", "0.", "0.1"
 * Invalid: ".4", "13..4", "1a.4", "", "."
 */
const COORDINATE_PATTERN = /^[0-9]+\.?[0-9]*$/;

/**
 * Validate a pscale coordinate string.
 */
export function isValidCoordinate(coord: string): boolean {
  if (!coord || !COORDINATE_PATTERN.test(coord)) return false;
  if (coord.startsWith('.')) return false;  // Must have integer part
  return true;
}

/**
 * Normalize a coordinate to always include decimal point.
 * "13" → "13.", "13.4" → "13.4"
 */
export function normalizeCoordinate(coord: string): string {
  if (!isValidCoordinate(coord)) {
    throw new Error(`Invalid coordinate: ${coord}`);
  }
  return coord.includes('.') ? coord : coord + '.';
}

// ============================================================
// PREFIX OVERLAP ALGORITHM
// ============================================================

/**
 * Calculate shared prefix length between two coordinates.
 * Counts matching digits from left, stopping at first mismatch.
 * Decimal point must match but doesn't count toward length.
 * 
 * Examples:
 *   sharedPrefixLength("13.4", "13.2") → 2  (digits "1" and "3" match)
 *   sharedPrefixLength("13.4", "14.")  → 1  (only "1" matches)
 *   sharedPrefixLength("13.4", "21.")  → 0  (no match)
 *   sharedPrefixLength("13.42", "13.4") → 3 (digits "1", "3", "4" match)
 */
export function sharedPrefixLength(coordA: string, coordB: string): number {
  // Normalize: ensure decimal point present
  const a = normalizeCoordinate(coordA);
  const b = normalizeCoordinate(coordB);
  
  let shared = 0;
  const minLen = Math.min(a.length, b.length);
  
  for (let i = 0; i < minLen; i++) {
    if (a[i] !== b[i]) break;
    if (a[i] !== '.') shared++;  // Don't count decimal
  }
  
  return shared;
}

/**
 * Determine proximity state based on coordinate overlap.
 * 
 * ≥2 digits → close (same room or immediate vicinity)
 * 1 digit → nearby (same building or adjacent)
 * 0 digits → distant (same cosmology, no overlap)
 */
export function spatialProximity(coordA: string, coordB: string): ProximityState {
  const shared = sharedPrefixLength(coordA, coordB);
  if (shared >= 2) return 'close';
  if (shared >= 1) return 'nearby';
  return 'distant';
}

/**
 * Determine combined proximity from both spatial and temporal coordinates.
 * Returns the "worse" of the two (e.g., close spatially but distant temporally → distant).
 */
export function combinedProximity(
  a: { spatial: string; temporal: string },
  b: { spatial: string; temporal: string }
): ProximityState {
  const spatialState = spatialProximity(a.spatial, b.spatial);
  const temporalState = spatialProximity(a.temporal, b.temporal);
  
  // Return the worse of the two
  const rank: Record<ProximityState, number> = { 
    close: 0, 
    nearby: 1, 
    distant: 2, 
    far: 3 
  };
  
  const worst = Math.max(rank[spatialState], rank[temporalState]);
  const states: ProximityState[] = ['close', 'nearby', 'distant', 'far'];
  return states[worst];
}

// ============================================================
// SEMANTIC DECODING
// ============================================================

/**
 * Decode a coordinate string using a semantic tabulation.
 * Returns array of semantic names, one per digit.
 * 
 * Example:
 *   decodeCoordinate("13.4", { "+1": { "1": "keep" }, "0": { "3": "kitchen" }, "-1": { "4": "fireplace" } })
 *   → ["keep", "kitchen", "fireplace"]
 */
export function decodeCoordinate(
  coord: string,
  tabulation: SemanticTabulation
): string[] {
  const normalized = normalizeCoordinate(coord);
  const [intPart, decPart] = normalized.split('.');
  const result: string[] = [];
  
  // Positive pscale (left of decimal)
  // Rightmost digit is pscale 0, leftmost is highest
  for (let i = 0; i < intPart.length; i++) {
    const pscale = intPart.length - 1 - i;  // Rightmost is pscale 0
    const digit = intPart[i];
    
    // Try with + prefix first, then without
    const name = tabulation[`+${pscale}`]?.[digit] 
              || tabulation[`${pscale}`]?.[digit];
    if (name) result.push(name);
  }
  
  // Negative pscale (right of decimal)
  if (decPart) {
    for (let i = 0; i < decPart.length; i++) {
      const pscale = -(i + 1);
      const digit = decPart[i];
      const name = tabulation[`${pscale}`]?.[digit];
      if (name) result.push(name);
    }
  }
  
  return result;
}

/**
 * Format a tabulation for display in prompts.
 * 
 * Output format:
 *   Pscale +2: 1="kingdom"
 *   Pscale +1: 1="keep", 2="tower", 3="village"
 *   Pscale 0: 1="great-hall", 2="armory", 3="kitchen"
 *   Pscale -1: 1="throne", 2="fireplace", 3="table"
 */
export function formatTabulation(tabulation: SemanticTabulation): string {
  const lines: string[] = [];
  
  // Sort by pscale level descending (+2, +1, 0, -1, -2...)
  const levels = Object.keys(tabulation).sort((a, b) => {
    const numA = parseInt(a.replace('+', ''));
    const numB = parseInt(b.replace('+', ''));
    return numB - numA;
  });
  
  for (const level of levels) {
    const entries = tabulation[level];
    const entryStrs = Object.entries(entries)
      .map(([digit, name]) => `${digit}="${name}"`)
      .join(', ');
    lines.push(`Pscale ${level}: ${entryStrs}`);
  }
  
  return lines.join('\n');
}

// ============================================================
// APERTURE OPERATIONS
// ============================================================

/**
 * Calculate aperture (attention scope) from an action's pscale level.
 * Aperture extends 2 levels in each direction from the action.
 * 
 * Example:
 *   calculateAperture(-1) → { floor: -3, ceiling: +1 }
 *   (action at furniture level sees from cellular to building)
 */
export function calculateAperture(actionPscale: number): Aperture {
  return {
    floor: actionPscale - 2,
    ceiling: actionPscale + 2
  };
}

/**
 * Check if an aperture range overlaps with another range.
 */
export function aperturesOverlap(a: Aperture, b: Aperture): boolean {
  return a.floor <= b.ceiling && a.ceiling >= b.floor;
}

/**
 * Check if content is relevant given character position and aperture.
 * 
 * Content is relevant when:
 * 1. Character's spatial coordinate shares prefix with content's spatial
 * 2. Character's aperture overlaps with content's pscale range
 */
export function isContentRelevant(
  characterSpatial: string,
  characterAperture: Aperture,
  contentSpatial: string | undefined | null,
  contentFloor: number | undefined | null,
  contentCeiling: number | undefined | null
): boolean {
  // Spatial relevance: prefix overlap
  const spatialMatch = contentSpatial 
    ? sharedPrefixLength(characterSpatial, contentSpatial) > 0
    : true;  // Content without spatial is always spatially relevant
  
  // Aperture relevance: ranges overlap
  const cFloor = contentFloor ?? -10;   // Default: very detailed
  const cCeiling = contentCeiling ?? 10; // Default: very broad
  const apertureMatch = 
    cFloor <= characterAperture.ceiling && 
    cCeiling >= characterAperture.floor;
  
  return spatialMatch && apertureMatch;
}

/**
 * Filter content entries by relevance to character position and aperture.
 */
export function filterRelevantContent(
  characterSpatial: string,
  aperture: Aperture,
  content: ContentEntry[]
): ContentEntry[] {
  return content.filter(entry => 
    isContentRelevant(
      characterSpatial,
      aperture,
      entry.spatial,
      entry.pscale_floor,
      entry.pscale_ceiling
    )
  );
}

// ============================================================
// PROXIMITY GROUPING
// ============================================================

/**
 * Group characters by proximity to a reference character.
 * Returns lists of character IDs in each proximity state.
 */
export function groupByProximity(
  referenceCharacterId: string,
  referenceSpatial: string,
  others: Array<{ character_id: string; spatial: string }>
): { close: string[]; nearby: string[]; distant: string[] } {
  const close: string[] = [];
  const nearby: string[] = [];
  const distant: string[] = [];
  
  for (const other of others) {
    if (other.character_id === referenceCharacterId) continue;
    
    const proximity = spatialProximity(referenceSpatial, other.spatial);
    
    switch (proximity) {
      case 'close':
        close.push(other.character_id);
        break;
      case 'nearby':
        nearby.push(other.character_id);
        break;
      case 'distant':
        distant.push(other.character_id);
        break;
    }
  }
  
  return { close, nearby, distant };
}

// ============================================================
// COORDINATE MANIPULATION
// ============================================================

/**
 * Get the pscale level of a specific position in a coordinate.
 * 
 * In "13.4":
 *   - Position 0 (digit "1") is pscale +1
 *   - Position 1 (digit "3") is pscale 0
 *   - Position 2 (.) is the decimal
 *   - Position 3 (digit "4") is pscale -1
 */
export function pscaleAtPosition(coord: string, position: number): number | null {
  const normalized = normalizeCoordinate(coord);
  const decimalPos = normalized.indexOf('.');
  
  if (position < 0 || position >= normalized.length) return null;
  if (normalized[position] === '.') return null;
  
  if (position < decimalPos) {
    // Before decimal: pscale is (decimalPos - 1 - position)
    return decimalPos - 1 - position;
  } else {
    // After decimal: pscale is -(position - decimalPos)
    return -(position - decimalPos);
  }
}

/**
 * Get the digit value at a specific pscale level.
 */
export function digitAtPscale(coord: string, pscale: number): string | null {
  const normalized = normalizeCoordinate(coord);
  const decimalPos = normalized.indexOf('.');
  
  let position: number;
  if (pscale >= 0) {
    position = decimalPos - 1 - pscale;
  } else {
    position = decimalPos + (-pscale);
  }
  
  if (position < 0 || position >= normalized.length) return null;
  if (normalized[position] === '.') return null;
  
  return normalized[position];
}

/**
 * Set the digit at a specific pscale level, returning new coordinate.
 * Note: May need to pad with zeros for higher pscale levels.
 */
export function setDigitAtPscale(
  coord: string, 
  pscale: number, 
  digit: string
): string {
  if (!/^[0-9]$/.test(digit)) {
    throw new Error(`Invalid digit: ${digit}`);
  }
  
  const normalized = normalizeCoordinate(coord);
  const [intPart, decPart = ''] = normalized.split('.');
  
  if (pscale >= 0) {
    // Positive pscale: modify integer part
    // May need to pad left with zeros
    const neededLength = pscale + 1;
    let paddedInt = intPart.padStart(neededLength, '0');
    const pos = paddedInt.length - 1 - pscale;
    paddedInt = paddedInt.slice(0, pos) + digit + paddedInt.slice(pos + 1);
    return paddedInt + '.' + decPart;
  } else {
    // Negative pscale: modify decimal part
    const pos = (-pscale) - 1;
    const neededLength = pos + 1;
    let paddedDec = decPart.padEnd(neededLength, '0');
    paddedDec = paddedDec.slice(0, pos) + digit + paddedDec.slice(pos + 1);
    return intPart + '.' + paddedDec;
  }
}
