import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  displayName: string
  defaultFace: 'character' | 'author' | 'designer'
  preferences: Record<string, unknown>
  onboardingPhase: number
}

export interface UseAuthReturn {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  isLoading: boolean
  error: string | null
  signUp: (email: string, password: string, displayName: string) => Promise<boolean>
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Pick<UserProfile, 'displayName' | 'defaultFace' | 'preferences'>>) => Promise<boolean>
}

// Auth initialization timeout (ms) - prevents frozen loading screen
const AUTH_TIMEOUT_MS = 5000

// Supabase storage key pattern (includes project ID)
const SUPABASE_AUTH_KEY = 'sb-piqxyfmzzywxzqkzmpmm-auth-token'

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const sessionLoadedRef = useRef(false)

  // Load user profile from users table, create if doesn't exist
  const loadProfile = useCallback(async (userId: string, userEmail?: string) => {
    if (!supabase) return null

    try {
      const { data, error: err } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (err) {
        // User doesn't exist in users table yet - create a default profile
        console.warn('[Auth] Profile not found, creating default profile for:', userId)

        const defaultProfile = {
          id: userId,
          display_name: userEmail?.split('@')[0] || 'User',
          default_face: 'character',
          preferences: {},
          onboarding_phase: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data: newProfile, error: createErr } = await supabase
          .from('users')
          .upsert(defaultProfile)
          .select()
          .single()

        if (createErr) {
          console.error('[Auth] Failed to create profile:', createErr.message)
          // Return a minimal profile so the UI doesn't hang
          return {
            id: userId,
            displayName: userEmail?.split('@')[0] || 'User',
            defaultFace: 'character' as const,
            preferences: {},
            onboardingPhase: 1,
          } as UserProfile
        }

        return {
          id: newProfile.id,
          displayName: newProfile.display_name,
          defaultFace: newProfile.default_face,
          preferences: newProfile.preferences,
          onboardingPhase: newProfile.onboarding_phase ?? 1,
        } as UserProfile
      }

      return {
        id: data.id,
        displayName: data.display_name,
        defaultFace: data.default_face,
        preferences: data.preferences,
        onboardingPhase: data.onboarding_phase ?? 1,
      } as UserProfile
    } catch (err) {
      console.error('[Auth] Profile load exception:', err)
      // Return a minimal profile so the UI doesn't hang
      return {
        id: userId,
        displayName: userEmail?.split('@')[0] || 'User',
        defaultFace: 'character' as const,
        preferences: {},
        onboardingPhase: 1,
      } as UserProfile
    }
  }, [])

  // Initialize auth state
  useEffect(() => {
    mountedRef.current = true
    sessionLoadedRef.current = false
    
    if (!supabase) {
      console.warn('[Auth] Supabase not configured')
      setIsLoading(false)
      return
    }

    // Safety timeout - prevents frozen loading screen
    // If getSession() hangs (corrupt token, network issue), clear storage and show login
    const timeoutId = setTimeout(() => {
      if (mountedRef.current && !sessionLoadedRef.current) {
        console.warn('[Auth] Timeout - clearing potentially corrupt auth storage')
        try {
          // Clear Supabase auth storage to prevent persistent hang
          localStorage.removeItem(SUPABASE_AUTH_KEY)
        } catch (e) {
          console.warn('[Auth] Could not clear storage:', e)
        }
        setIsLoading(false)
      }
    }, AUTH_TIMEOUT_MS)

    // Get initial session
    const initAuth = async () => {
      try {
        console.log('[Auth] Getting session...')
        // Phase 0.10.3.2: Add null check for supabase
        if (!supabase) return
        const { data: { session: s }, error: sessionError } = await supabase.auth.getSession()
        
        // Mark session as loaded (prevents timeout from clearing storage)
        sessionLoadedRef.current = true
        clearTimeout(timeoutId)
        
        if (sessionError) {
          console.error('[Auth] Session error:', sessionError)
          if (mountedRef.current) {
            setIsLoading(false)
          }
          return
        }
        
        if (mountedRef.current) {
          setSession(s)
          setUser(s?.user ?? null)
          // Set loading false BEFORE profile loads - profile is non-blocking
          setIsLoading(false)
          console.log('[Auth] Session loaded, user:', s?.user?.email ?? 'none')
        }
        
        // Load profile in background (non-blocking)
        if (s?.user && mountedRef.current) {
          const p = await loadProfile(s.user.id, s.user.email)
          if (mountedRef.current) {
            setProfile(p)
          }
        }
      } catch (err) {
        console.error('[Auth] Init exception:', err)
        sessionLoadedRef.current = true
        clearTimeout(timeoutId)
        if (mountedRef.current) {
          setIsLoading(false)
        }
      }
    }
    
    initAuth()

    // Listen for auth changes
    // Phase 0.10.3.2: Add null check for supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        console.log('[Auth] State change:', event)
        if (!mountedRef.current) return

        // Mark session as loaded - onAuthStateChange can fire before getSession returns
        if (!sessionLoadedRef.current) {
          sessionLoadedRef.current = true
          clearTimeout(timeoutId)
        }

        setSession(s)
        setUser(s?.user ?? null)
        setIsLoading(false)
        
        if (s?.user) {
          // Load profile in background
          const p = await loadProfile(s.user.id, s.user.email)
          if (mountedRef.current) {
            setProfile(p)
          }
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      mountedRef.current = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const signUp = useCallback(async (email: string, password: string, displayName: string): Promise<boolean> => {
    if (!supabase) {
      setError('Supabase not configured')
      return false
    }

    setError(null)
    setIsLoading(true)

    try {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName }
        }
      })

      if (err) {
        setError(err.message)
        return false
      }

      if (data.user && !data.session) {
        // Email confirmation required - user needs to click link in email
        setError('Check your email to confirm your account')
        return false
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    if (!supabase) {
      setError('Supabase not configured')
      return false
    }

    setError(null)
    setIsLoading(true)

    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (err) {
        setError(err.message)
        return false
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) {
      console.log('[Auth] signOut: no supabase client')
      return
    }

    console.log('[Auth] signOut called, clearing state immediately')
    setError(null)

    // Clear local state FIRST - don't wait for network
    setUser(null)
    setProfile(null)
    setSession(null)

    // Force clear localStorage IMMEDIATELY
    try {
      localStorage.removeItem(SUPABASE_AUTH_KEY)
      console.log('[Auth] Cleared auth storage')
    } catch (e) {
      console.warn('[Auth] Could not clear storage:', e)
    }

    // Now try to tell Supabase (with timeout so it doesn't hang forever)
    try {
      console.log('[Auth] Calling supabase.auth.signOut...')
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('signOut timeout')), 3000)
      )
      const signOutPromise = supabase.auth.signOut()

      const result = await Promise.race([signOutPromise, timeoutPromise]) as { error: Error | null }

      if (result?.error) {
        console.error('[Auth] signOut error:', result.error)
      } else {
        console.log('[Auth] signOut successful')
      }
    } catch (err) {
      console.warn('[Auth] signOut failed or timed out:', err)
      // Already cleared local state, so user is logged out locally
    }
  }, [])

  const updateProfile = useCallback(async (
    updates: Partial<Pick<UserProfile, 'displayName' | 'defaultFace' | 'preferences'>>
  ): Promise<boolean> => {
    if (!supabase || !user) {
      setError('Not authenticated')
      return false
    }

    try {
      const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName
      if (updates.defaultFace !== undefined) dbUpdates.default_face = updates.defaultFace
      if (updates.preferences !== undefined) dbUpdates.preferences = updates.preferences

      const { error: err } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', user.id)

      if (err) {
        setError(err.message)
        return false
      }

      // Reload profile
      const p = await loadProfile(user.id, user.email)
      setProfile(p)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
      return false
    }
  }, [user, loadProfile])

  return {
    user,
    profile,
    session,
    isLoading,
    error,
    signUp,
    signIn,
    signOut,
    updateProfile,
  }
}
