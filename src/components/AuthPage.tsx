import { useState } from 'react'
import type { UseAuthReturn } from '../hooks/useAuth'
import './AuthPage.css'

interface AuthPageProps {
  auth: UseAuthReturn
}

type AuthMode = 'signin' | 'signup' | 'verify'

export function AuthPage({ auth }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match')
        return
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters')
        return
      }
      if (!displayName.trim()) {
        setLocalError('Display name is required')
        return
      }
      const success = await auth.signUp(email, password, displayName.trim())
      if (success) {
        setPendingEmail(email)
        setMode('verify')
      }
    } else if (mode === 'verify') {
      if (otpCode.length !== 6) {
        setLocalError('Please enter the 6-digit code')
        return
      }
      await auth.verifyOtp(pendingEmail, otpCode)
    } else {
      await auth.signIn(email, password)
    }
  }

  const handleResendCode = async () => {
    setLocalError(null)
    await auth.resendOtp(pendingEmail)
  }

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    setLocalError(null)
  }

  const error = localError || auth.error

  // Verification screen
  if (mode === 'verify') {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <h1 className="auth-title">xstream</h1>
            <p className="auth-subtitle">Check your email</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <p className="verify-info">
              We sent a 6-digit code to <strong>{pendingEmail}</strong>
            </p>

            <div className="auth-field">
              <label htmlFor="otpCode">Verification Code</label>
              <input
                id="otpCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                disabled={auth.isLoading}
                autoComplete="one-time-code"
                className="otp-input"
              />
            </div>

            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={auth.isLoading || otpCode.length !== 6}
            >
              {auth.isLoading ? '...' : 'Verify'}
            </button>

            <button
              type="button"
              className="resend-btn"
              onClick={handleResendCode}
              disabled={auth.isLoading}
            >
              Resend code
            </button>
          </form>

          <div className="auth-switch">
            <button type="button" onClick={() => setMode('signup')} className="auth-switch-btn">
              ← Back to signup
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-title">xstream</h1>
          <p className="auth-subtitle">
            {mode === 'signin' ? 'Sign in to continue' : 'Create your account'}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="auth-field">
              <label htmlFor="displayName">Display Name</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How others will see you"
                disabled={auth.isLoading}
                autoComplete="name"
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={auth.isLoading}
              autoComplete="email"
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
                placeholder="••••••••"
                disabled={auth.isLoading}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
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

          {mode === 'signup' && (
            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={auth.isLoading}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? '👁' : '👁‍🗨'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={auth.isLoading}
          >
            {auth.isLoading ? '...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'signin' ? (
            <>
              Don't have an account?{' '}
              <button type="button" onClick={switchMode} className="auth-switch-btn">
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" onClick={switchMode} className="auth-switch-btn">
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
