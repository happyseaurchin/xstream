// Core types for xstream

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
