import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Running in offline mode.')
}

// Singleton pattern to prevent multiple GoTrueClient instances
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
