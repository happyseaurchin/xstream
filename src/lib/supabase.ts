import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Running in offline mode.')
}

// Singleton pattern to prevent multiple GoTrueClient instances
// This can happen with React Strict Mode or Vite HMR
let supabaseInstance: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }
  
  if (!supabaseInstance) {
    console.log('[Supabase] Creating client instance')
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  }
  
  return supabaseInstance
}

export const supabase = getSupabaseClient()

// Types matching Supabase schema
export interface User {
  id: string
  name: string | null
  created_at: string
  updated_at: string
}

export interface Frame {
  id: string
  name: string
  description: string | null
  cosmology_id: string | null
  pscale_floor: number
  pscale_ceiling: number
  x_persistence: boolean
  y_temporality: boolean
  z_mutability: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ShelfEntry {
  id: string
  user_id: string
  frame_id: string
  text: string
  face: 'player' | 'author' | 'designer'
  state: 'draft' | 'submitted' | 'committed'
  pscale_aperture: number | null
  lamina: Record<string, unknown>
  ephemeral: boolean
  created_at: string
  updated_at: string
}

// XYZ Configuration helper
export interface XYZConfig {
  x: boolean  // persistence: false=ephemeral, true=persisted
  y: boolean  // temporality: false=bleeding edge, true=block universe
  z: boolean  // mutability: false=fixed world, true=mutable
}

export function getXYZLabel(config: XYZConfig): string {
  const x = config.x ? '1' : '0'
  const y = config.y ? '1' : '0'
  const z = config.z ? '1' : '0'
  return `X${x}Y${y}Z${z}`
}

export function getXYZDescription(config: XYZConfig): string {
  const parts: string[] = []
  parts.push(config.x ? 'persistent' : 'ephemeral')
  parts.push(config.y ? 'block universe' : 'bleeding edge')
  parts.push(config.z ? 'mutable world' : 'fixed world')
  return parts.join(', ')
}
