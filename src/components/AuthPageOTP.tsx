import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './AuthPage.css'

type AuthStep = 'email' | 'verify' | 'complete' | 'signin'

interface AuthPageOTPProps {
  onSuccess: () => void
}

export function AuthPageOTP({ onSuccess }: AuthPageOTPProps) {
  const [step, setStep] = useState<AuthStep>('email')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Step 1: Send OTP to email
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (!supabase) {
        throw new Error('Supabase not configured')
      }

      // Check if user already exists by trying to sign in with OTP
      // shouldCreateUser: true means it will create if doesn't exist
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        }
      })

      if (otpError) {
        throw otpError
      }

      setStep('verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code')
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Verify OTP code
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpCode.trim() || otpCode.length < 6) {
      setError('Please enter the verification code')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (!supabase) {
        throw new Error('Supabase not configured')
      }

      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: 'email'
      })

      if (verifyError) {
        throw verifyError
      }

      // Check if user has a password set (existing user)
      // If they just verified and have no password, they're new
      if (data.user) {
        // Check if user profile exists
        const { data: profile } = await supabase
          .from('users')
          .select('id, display_name')
          .eq('id', data.user.id)
          .single()

        if (profile?.display_name) {
          // Existing user - they're logged in
          onSuccess()
        } else {
          // New user - need to set password and display name
          setStep('complete')
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid or expired code'
      if (message.includes('expired') || message.includes('invalid')) {
        setError('Code expired or invalid. Please request a new one.')
      } else {
        setError(message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Step 3: Complete registration with password
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!displayName.trim()) {
      setError('Please enter a display name')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (!supabase) {
        throw new Error('Supabase not configured')
      }

      // Update user with password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        throw updateError
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            display_name: displayName.trim(),
            default_face: 'character',
            preferences: {},
            onboarding_phase: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
          // Don't throw - user is still registered
        }
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete registration')
    } finally {
      setIsLoading(false)
    }
  }

  // Regular sign in with email/password
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !password) {
      setError('Please enter email and password')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (!supabase) {
        throw new Error('Supabase not configured')
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      })

      if (signInError) {
        throw signInError
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setIsLoading(true)
    setError(null)
    setOtpCode('')

    try {
      if (!supabase) {
        throw new Error('Supabase not configured')
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        }
      })

      if (otpError) {
        throw otpError
      }

      setError('New code sent! Check your email.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-title">xstream</h1>
          <p className="auth-subtitle">
            {step === 'email' && 'Enter your email to get started'}
            {step === 'verify' && 'Check your email for a verification code'}
            {step === 'complete' && 'Complete your registration'}
            {step === 'signin' && 'Sign in to your account'}
          </p>
        </div>

        {/* Step 1: Email Entry */}
        {step === 'email' && (
          <form className="auth-form" onSubmit={handleSendOTP}>
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isLoading}
                autoComplete="email"
                autoFocus
                required
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-submit" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Continue'}
            </button>

            <div className="auth-switch">
              Already have an account?{' '}
              <button type="button" onClick={() => setStep('signin')} className="auth-switch-btn">
                Sign in with password
              </button>
            </div>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'verify' && (
          <form className="auth-form" onSubmit={handleVerifyOTP}>
            <p className="auth-info">
              We sent a 6-digit code to <strong>{email}</strong>
            </p>

            <div className="auth-field">
              <label htmlFor="otp">Verification Code</label>
              <input
                id="otp"
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="12345678"
                disabled={isLoading}
                autoComplete="one-time-code"
                autoFocus
                maxLength={8}
                style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.5rem' }}
                required
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-submit" disabled={isLoading || otpCode.length < 6}>
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>

            <div className="auth-switch">
              Didn't receive a code?{' '}
              <button type="button" onClick={handleResendOTP} className="auth-switch-btn" disabled={isLoading}>
                Resend
              </button>
              {' | '}
              <button type="button" onClick={() => { setStep('email'); setOtpCode(''); setError(null); }} className="auth-switch-btn">
                Change email
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Complete Registration */}
        {step === 'complete' && (
          <form className="auth-form" onSubmit={handleCompleteRegistration}>
            <p className="auth-info">
              Email verified! Now set up your account.
            </p>

            <div className="auth-field">
              <label htmlFor="displayName">Display Name</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How others will see you"
                disabled={isLoading}
                autoComplete="name"
                autoFocus
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  disabled={isLoading}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? '👁' : '👁‍🗨'}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-wrapper">
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  disabled={isLoading}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-submit" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        {/* Sign In with Password */}
        {step === 'signin' && (
          <form className="auth-form" onSubmit={handleSignIn}>
            <div className="auth-field">
              <label htmlFor="signinEmail">Email</label>
              <input
                id="signinEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isLoading}
                autoComplete="email"
                autoFocus
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="signinPassword">Password</label>
              <div className="password-wrapper">
                <input
                  id="signinPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  disabled={isLoading}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? '👁' : '👁‍🗨'}
                </button>
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="auth-switch">
              New here?{' '}
              <button type="button" onClick={() => { setStep('email'); setPassword(''); setError(null); }} className="auth-switch-btn">
                Create an account
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
