import { useState } from 'react'
import type { UseAuthReturn } from '../hooks/useAuth'
import './AuthPage.css'

interface AuthPageProps {
  auth: UseAuthReturn
}

type AuthMode = 'signin' | 'step1-email' | 'step2-code' | 'step3-password'

export function AuthPage({ auth }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('signin')
  
  // Sign in fields
  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  
  // Registration fields
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationId, setVerificationId] = useState('')
  
  const [localError, setLocalError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    await auth.signIn(signInEmail, signInPassword)
  }

  // Step 1: Send verification code
  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!displayName.trim()) {
      setLocalError('Display name is required')
      return
    }
    if (!email.trim()) {
      setLocalError('Email is required')
      return
    }

    const success = await auth.sendVerificationCode(email.trim(), displayName.trim())
    if (success) {
      setMode('step2-code')
    }
  }

  // Step 2: Verify code
  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (code.length !== 6) {
      setLocalError('Please enter the 6-digit code')
      return
    }

    const result = await auth.verifyCode(email, code)
    if (result.success && result.verificationId) {
      setVerificationId(result.verificationId)
      setMode('step3-password')
    }
  }

  // Step 3: Create account
  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters')
      return
    }
    if (!/[A-Z]/.test(password)) {
      setLocalError('Password must contain an uppercase letter')
      return
    }
    if (!/[a-z]/.test(password)) {
      setLocalError('Password must contain a lowercase letter')
      return
    }
    if (!/[0-9]/.test(password)) {
      setLocalError('Password must contain a number')
      return
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    await auth.createVerifiedAccount(email, password, verificationId)
  }

  const handleResendCode = async () => {
    setLocalError(null)
    const success = await auth.sendVerificationCode(email, displayName)
    if (success) {
      setLocalError('Code resent! Check your email.')
    }
  }

  const startRegistration = () => {
    setMode('step1-email')
    setLocalError(null)
    setEmail('')
    setDisplayName('')
    setCode('')
    setPassword('')
    setConfirmPassword('')
    setVerificationId('')
  }

  const error = localError || auth.error

  // Step 2: Code entry
  if (mode === 'step2-code') {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <h1 className="auth-title">xstream</h1>
            <p className="auth-subtitle">Check your email</p>
          </div>

          <form className="auth-form" onSubmit={handleStep2}>
            <p className="verify-info">
              We sent a 6-digit code to <strong>{email}</strong>
            </p>

            <div className="auth-field">
              <label htmlFor="code">Verification Code</label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                disabled={auth.isLoading}
                autoComplete="one-time-code"
                className="otp-input"
                autoFocus
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button
              type="submit"
              className="auth-submit"
              disabled={auth.isLoading || code.length !== 6}
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
            <button type="button" onClick={() => setMode('step1-email')} className="auth-switch-btn">
              ← Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Step 3: Password
  if (mode === 'step3-password') {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <h1 className="auth-title">xstream</h1>
            <p className="auth-subtitle">Create your password</p>
          </div>

          <form className="auth-form" onSubmit={handleStep3}>
            <p className="verify-info">
              Almost done, <strong>{displayName}</strong>!
            </p>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8+ chars, upper, lower, number"
                  disabled={auth.isLoading}
                  autoComplete="new-password"
                  autoFocus
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
                  placeholder="Confirm password"
                  disabled={auth.isLoading}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="password-requirements">
              <span className={password.length >= 8 ? 'met' : ''}>8+ chars</span>
              <span className={/[A-Z]/.test(password) ? 'met' : ''}>uppercase</span>
              <span className={/[a-z]/.test(password) ? 'met' : ''}>lowercase</span>
              <span className={/[0-9]/.test(password) ? 'met' : ''}>number</span>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button
              type="submit"
              className="auth-submit"
              disabled={auth.isLoading}
            >
              {auth.isLoading ? '...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Step 1: Email + Name
  if (mode === 'step1-email') {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <h1 className="auth-title">xstream</h1>
            <p className="auth-subtitle">Create your account</p>
          </div>

          <form className="auth-form" onSubmit={handleStep1}>
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
                autoFocus
              />
            </div>

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
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button
              type="submit"
              className="auth-submit"
              disabled={auth.isLoading}
            >
              {auth.isLoading ? '...' : 'Send Code'}
            </button>
          </form>

          <div className="auth-switch">
            Already have an account?{' '}
            <button type="button" onClick={() => setMode('signin')} className="auth-switch-btn">
              Sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Sign In (default)
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-title">xstream</h1>
          <p className="auth-subtitle">Sign in to continue</p>
        </div>

        <form className="auth-form" onSubmit={handleSignIn}>
          <div className="auth-field">
            <label htmlFor="signInEmail">Email</label>
            <input
              id="signInEmail"
              type="email"
              value={signInEmail}
              onChange={(e) => setSignInEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={auth.isLoading}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label htmlFor="signInPassword">Password</label>
            <div className="password-wrapper">
              <input
                id="signInPassword"
                type={showPassword ? 'text' : 'password'}
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                placeholder="••••••••"
                disabled={auth.isLoading}
                autoComplete="current-password"
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

          <button
            type="submit"
            className="auth-submit"
            disabled={auth.isLoading}
          >
            {auth.isLoading ? '...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-switch">
          Don't have an account?{' '}
          <button type="button" onClick={startRegistration} className="auth-switch-btn">
            Sign up
          </button>
        </div>
      </div>
    </div>
  )
}
