// Core types for xstream (Plex 1)

// ===========================================
// Pscale Coordinates
// ===========================================

/** Pscale coordinate string: "348.1" = hierarchical position */
export type PscaleCoord = string

/** Three-dimensional pscale position */
export interface Coordinates {
  t: PscaleCoord  // temporal
  s: PscaleCoord  // spatial
  i: PscaleCoord  // identity
}

/** Shelf state: phase of content commitment */
export type Shelf = 'vapor' | 'liquid' | 'solid'

// ===========================================
// Content: The single entity type
// ===========================================

/** Database row from content table */
export interface ContentRow {
  id: string
  t: PscaleCoord
  s: PscaleCoord
  i: PscaleCoord
  shelf: Shelf
  text: string
  created_at: string
  created_by: string | null
}

/** Content for display (with computed fields) */
export interface Content extends ContentRow {
  isSelf?: boolean
  userName?: string
}

// ===========================================
// Legacy types (for existing components)
// ===========================================

export type Face = 'character' | 'author' | 'designer'
export type Theme = 'dark' | 'light' | 'cyber' | 'soft'

export type SoftType = 'artifact' | 'clarify' | 'refine' | 'action' | 'info'

export interface SoftLLMResponse {
  id: string
  originalInput: string
  text: string
  softType: SoftType
  options?: string[]
  face: Face
}

export interface VapourEntry {
  id: string
  userId: string
  userName: string
  text: string
  timestamp: number
  isSelf?: boolean
}

export interface LiquidCard {
  id: string
  userId: string
  userName: string
  content: string
  timestamp: number
}

export interface SolidBlock {
  id: string
  title?: string
  content: string
  timestamp: number
}
