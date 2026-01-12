import { useEffect, useState, useCallback, useRef } from 'react'
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
  updateProfile: (updates: Partial<Pick<UserProfile, 'displayName' | 'defaultFace' | 'preferences'>>) => Promise<boolean>
}

const AUTH_TIMEOUT_MS = 5000
const SUPABASE_AUTH_KEY = 'sb-piqxyfmzzywxzqkzmpmm-auth-token'

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const sessionLoadedRef = useRef(false)

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return null

    try {
      const { data, error: err } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (err) {
        console.warn('[Auth] Profile load error (may be new user):', err.message)
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

  useEffect(() => {
    mountedRef.current = true
    sessionLoadedRef.current = false

    if (!supabase) {
      console.warn('[Auth] Supabase not configured')
      setIsLoading(false)
      return
    }

    const timeoutId = setTimeout(() => {
      if (mountedRef.current && !sessionLoadedRef.current) {
        console.warn('[Auth] Timeout - clearing potentially corrupt auth storage')
        try {
          localStorage.removeItem(SUPABASE_AUTH_KEY)
        } catch (e) {
          console.warn('[Auth] Could not clear storage:', e)
        }
        setIsLoading(false)
      }
    }, AUTH_TIMEOUT_MS)

    const initAuth = async () => {
      try {
        console.log('[Auth] Getting session...')
        if (!supabase) return
        const { data: { session: s }, error: sessionError } = await supabase.auth.getSession()

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
          setIsLoading(false)
          console.log('[Auth] Session loaded, user:', s?.user?.email ?? 'none')
        }

        if (s?.user && mountedRef.current) {
          const p = await loadProfile(s.user.id)
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        console.log('[Auth] State change:', event)
        if (!mountedRef.current) return

        setSession(s)
        setUser(s?.user ?? null)

        if (s?.user) {
          const p = await loadProfile(s.user.id)
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
    updateProfile,
  }
}
