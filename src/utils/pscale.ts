// ============================================================
// PSCALE COORDINATE UTILITIES
// Pure string operations — no decision logic
// Decision-making belongs in Hard-LLM skills
// ============================================================

import type {
  PscaleCoordinate,
  ProximityState,
  SemanticTabulation
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
  if (coord.startsWith('.')) return false;
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
  const a = normalizeCoordinate(coordA);
  const b = normalizeCoordinate(coordB);
  
  let shared = 0;
  const minLen = Math.min(a.length, b.length);
  
  for (let i = 0; i < minLen; i++) {
    if (a[i] !== b[i]) break;
    if (a[i] !== '.') shared++;
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
    const pscale = intPart.length - 1 - i;
    const digit = intPart[i];
    
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
 */
export function formatTabulation(tabulation: SemanticTabulation): string {
  const lines: string[] = [];
  
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
// COORDINATE MANIPULATION
// ============================================================

/**
 * Get the pscale level of a specific position in a coordinate.
 */
export function pscaleAtPosition(coord: string, position: number): number | null {
  const normalized = normalizeCoordinate(coord);
  const decimalPos = normalized.indexOf('.');
  
  if (position < 0 || position >= normalized.length) return null;
  if (normalized[position] === '.') return null;
  
  if (position < decimalPos) {
    return decimalPos - 1 - position;
  } else {
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
    const neededLength = pscale + 1;
    let paddedInt = intPart.padStart(neededLength, '0');
    const pos = paddedInt.length - 1 - pscale;
    paddedInt = paddedInt.slice(0, pos) + digit + paddedInt.slice(pos + 1);
    return paddedInt + '.' + decPart;
  } else {
    const pos = (-pscale) - 1;
    const neededLength = pos + 1;
    let paddedDec = decPart.padEnd(neededLength, '0');
    paddedDec = paddedDec.slice(0, pos) + digit + paddedDec.slice(pos + 1);
    return intPart + '.' + paddedDec;
  }
}
