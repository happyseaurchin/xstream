import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  displayName: string
  defaultFace: 'character' | 'author' | 'designer'
  preferences: Record<string, unknown>
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
  verifyOtp: (email: string, token: string) => Promise<boolean>
  resendOtp: (email: string) => Promise<boolean>
  updateProfile: (updates: Partial<Pick<UserProfile, 'displayName' | 'defaultFace' | 'preferences'>>) => Promise<boolean>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load user profile from users table
  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return null
    
    try {
      const { data, error: err } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (err) {
        console.error('[Auth] Profile load error:', err)
        return null
      }
      
      return {
        id: data.id,
        displayName: data.display_name,
        defaultFace: data.default_face,
        preferences: data.preferences,
      } as UserProfile
    } catch (err) {
      console.error('[Auth] Profile load exception:', err)
      return null
    }
  }, [])

  // Initialize auth state
  useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      
      if (s?.user) {
        const p = await loadProfile(s.user.id)
        setProfile(p)
      }
      
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        console.log('[Auth] State change:', event)
        setSession(s)
        setUser(s?.user ?? null)
        
        if (s?.user) {
          const p = await loadProfile(s.user.id)
          setProfile(p)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
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
          data: { display_name: displayName },
          emailRedirectTo: undefined, // Disable magic link, use OTP
        }
      })

      if (err) {
        setError(err.message)
        return false
      }

      // User created, needs OTP verification
      if (data.user && !data.session) {
        return true // Success - show OTP screen
      }

      // Auto-confirmed (unlikely with OTP)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const verifyOtp = useCallback(async (email: string, token: string): Promise<boolean> => {
    if (!supabase) {
      setError('Supabase not configured')
      return false
    }

    setError(null)
    setIsLoading(true)

    try {
      const { error: err } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      })

      if (err) {
        setError(err.message)
        return false
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const resendOtp = useCallback(async (email: string): Promise<boolean> => {
    if (!supabase) {
      setError('Supabase not configured')
      return false
    }

    setError(null)
    setIsLoading(true)

    try {
      const { error: err } = await supabase.auth.resend({
        type: 'signup',
        email,
      })

      if (err) {
        setError(err.message)
        return false
      }

      setError('Code resent! Check your email.')
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resend failed')
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
    if (!supabase) return

    setError(null)
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
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
      const p = await loadProfile(user.id)
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
    verifyOtp,
    resendOtp,
    updateProfile,
  }
}
