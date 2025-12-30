import type { Face, ParsedInput, ParsedArtifact } from '../types'

/**
 * Parse input typography to determine routing
 * - {braces} → liquid (direct submit)
 * - (parens) → solid (direct commit)
 * - [brackets] → hard (future: hard-LLM)
 * - plain → soft (soft-LLM query)
 */
export function parseInputTypography(input: string): ParsedInput {
  const trimmed = input.trim()
  
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return { text: trimmed.slice(1, -1).trim(), route: 'liquid' }
  }
  
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    return { text: trimmed.slice(1, -1).trim(), route: 'solid' }
  }
  
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return { text: trimmed.slice(1, -1).trim(), route: 'hard' }
  }
  
  return { text: trimmed, route: 'soft' }
}

/**
 * Parse CHARACTER_CREATE document from text
 */
export function parseCharacterFromText(text: string): ParsedArtifact | null {
  if (!text.includes('CHARACTER_CREATE')) return null
  
  const nameMatch = text.match(/name:\s*(.+)/i)
  const conceptMatch = text.match(/concept:\s*(.+)/i)
  
  if (!nameMatch) return null
  
  return {
    name: nameMatch[1].trim(),
    type: conceptMatch ? conceptMatch[1].trim().slice(0, 40) : 'character',
    level: 'user',
  }
}

/**
 * Parse WORLD_CREATE document from text
 */
export function parseWorldFromText(text: string): ParsedArtifact | null {
  if (!text.includes('WORLD_CREATE')) return null
  
  const nameMatch = text.match(/name:\s*(.+)/i)
  const typeMatch = text.match(/type:\s*(.+)/i)
  
  if (!nameMatch) return null
  
  return {
    name: nameMatch[1].trim(),
    type: typeMatch ? typeMatch[1].trim() : 'element',
    level: 'user',
  }
}

/**
 * Parse SKILL_CREATE document from text
 */
export function parseSkillFromText(text: string): ParsedArtifact | null {
  if (!text.includes('SKILL_CREATE')) return null
  
  const nameMatch = text.match(/name:\s*(.+)/i)
  const categoryMatch = text.match(/category:\s*(.+)/i)
  
  if (!nameMatch) return null
  
  return {
    name: nameMatch[1].trim(),
    type: categoryMatch ? categoryMatch[1].trim() : 'skill',
    level: 'user',
  }
}

/**
 * Parse any artifact from text based on face
 */
export function parseArtifactFromText(text: string, face: Face): ParsedArtifact | null {
  switch (face) {
    case 'player':
      return parseCharacterFromText(text)
    case 'author':
      return parseWorldFromText(text)
    case 'designer':
      return parseSkillFromText(text)
    default:
      return null
  }
}

/**
 * Get user ID from localStorage, creating if needed
 */
export function getUserId(): string {
  const stored = localStorage.getItem('xstream_user_id')
  if (stored) return stored
  
  const newId = crypto.randomUUID()
  localStorage.setItem('xstream_user_id', newId)
  return newId
}
