import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

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
  // 3-step registration
  sendVerificationCode: (email: string, displayName: string) => Promise<boolean>
  verifyCode: (email: string, code: string) => Promise<{ success: boolean; verificationId?: string; displayName?: string }>
  createVerifiedAccount: (email: string, password: string, verificationId: string) => Promise<boolean>
  // Standard auth
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
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

  // Step 1: Send verification code
  const sendVerificationCode = useCallback(async (email: string, displayName: string): Promise<boolean> => {
    if (!SUPABASE_URL) {
      setError('Supabase not configured')
      return false
    }

    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-verification-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, display_name: displayName }),
      })
      
      const data = await res.json()
      
      if (!data.success) {
        setError(data.error || 'Failed to send code')
        return false
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Step 2: Verify code
  const verifyCode = useCallback(async (email: string, code: string): Promise<{ success: boolean; verificationId?: string; displayName?: string }> => {
    if (!SUPABASE_URL) {
      setError('Supabase not configured')
      return { success: false }
    }

    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      
      const data = await res.json()
      
      if (!data.success) {
        setError(data.error || 'Invalid code')
        return { success: false }
      }

      return { 
        success: true, 
        verificationId: data.verification_id,
        displayName: data.display_name 
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
      return { success: false }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Step 3: Create account with verified email
  const createVerifiedAccount = useCallback(async (email: string, password: string, verificationId: string): Promise<boolean> => {
    if (!SUPABASE_URL || !supabase) {
      setError('Supabase not configured')
      return false
    }

    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-verified-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, verification_id: verificationId }),
      })
      
      const data = await res.json()
      
      if (!data.success) {
        setError(data.error || 'Account creation failed')
        return false
      }

      // If we got a session back, set it
      if (data.session) {
        await supabase.auth.setSession(data.session)
      } else {
        // Auto-login didn't work, sign in manually
        await supabase.auth.signInWithPassword({ email, password })
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Account creation failed')
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
    sendVerificationCode,
    verifyCode,
    createVerifiedAccount,
    signIn,
    signOut,
    updateProfile,
  }
}
