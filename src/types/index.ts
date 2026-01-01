// Core types for xstream

export type Face = 'player' | 'author' | 'designer'
export type TextState = 'draft' | 'submitted' | 'committed'
export type LLMMode = 'soft' | 'medium'
export type SolidView = 'log' | 'dir'
export type SoftType = 'artifact' | 'clarify' | 'refine' | 'action' | 'info'

// Frame definition
export interface Frame {
  id: string | null
  name: string
  xyz: string
}

// Visibility settings for sharing and filtering
export interface VisibilitySettings {
  shareVapor: boolean
  shareLiquid: boolean
  showVapor: boolean
  showLiquid: boolean
  showSolid: boolean
}

export interface SkillUsed {
  category: string
  name: string
}

export interface FrameSkill {
  id: string
  name: string
  category: string
  applies_to: string[]
  content: string
  package_name?: string
  package_level?: string
}

export interface ShelfEntry {
  id: string
  text: string
  face: Face
  frameId: string | null
  state: TextState
  timestamp: string
  isEditing?: boolean
  response?: string
  error?: string
  skillsUsed?: SkillUsed[]
  createdSkill?: FrameSkill | null
  // Parsed artifact metadata (for directory display)
  artifactName?: string
  artifactType?: string
}

export interface SoftLLMResponse {
  id: string
  originalInput: string
  text: string
  softType: SoftType
  document?: string
  options?: string[]
  face: Face
  frameId: string | null
}

export interface ParsedInput {
  text: string
  route: 'soft' | 'liquid' | 'solid' | 'hard'
}

// Parsed artifact from shelf entry
export interface ParsedArtifact {
  name: string
  type: string // category for skills, 'character' for players, element type for authors
  level: 'user' // shelf entries are always user-level
}

// Re-export hook types for convenience
export type { LiquidEntry } from '../hooks/useLiquidSubscription'
export type { SolidEntry } from '../hooks/useSolidSubscription'

// Re-export pscale types (Phase 0.8)
export * from './pscale'
