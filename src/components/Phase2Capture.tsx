import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './Phase2Capture.css'

// Admin whitelist - these emails get full access
const ADMIN_EMAILS = ['david@ecosquared.co.uk']

interface Phase2CaptureProps {
  userEmail: string
  userId: string
  onComplete: () => void
}

interface LLMLink {
  name: string
  url: string
  description: string
}

const LLM_LINKS: LLMLink[] = [
  {
    name: 'ChatGPT',
    url: 'https://chat.openai.com',
    description: 'OpenAI\'s conversational AI'
  },
  {
    name: 'Claude',
    url: 'https://claude.ai',
    description: 'Anthropic\'s AI assistant'
  },
  {
    name: 'Gemini',
    url: 'https://gemini.google.com',
    description: 'Google\'s multimodal AI'
  },
  {
    name: 'Grok',
    url: 'https://grok.x.ai',
    description: 'xAI\'s conversational AI'
  }
]

export function Phase2Capture({ userEmail, userId, onComplete }: Phase2CaptureProps) {
  const [jsonInput, setJsonInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wantsPlaytester, setWantsPlaytester] = useState(false)

  const isAdmin = ADMIN_EMAILS.includes(userEmail)

  const handleSubmit = async () => {
    if (!jsonInput.trim() && !wantsPlaytester) {
      setError('Please paste your LLM invitation JSON or sign up as a playtester')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Parse JSON if provided (just validate, don't require specific structure)
      let parsedJson = null
      if (jsonInput.trim()) {
        try {
          parsedJson = JSON.parse(jsonInput)
        } catch {
          setError('Invalid JSON format. Please check and try again.')
          setIsSubmitting(false)
          return
        }
      }

      // Update user record
      if (!supabase) {
        throw new Error('Supabase not configured')
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          onboarding_phase: 2,
          llm_invitation: parsedJson,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        throw updateError
      }

      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAdminBypass = async () => {
    if (!isAdmin) return

    setIsSubmitting(true)
    try {
      if (!supabase) {
        throw new Error('Supabase not configured')
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          onboarding_phase: 3,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        throw updateError
      }

      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="phase2-page">
      <div className="phase2-container">
        <div className="phase2-header">
          <h1>xstream</h1>
          <p className="phase2-subtitle">Phase 2: Preparation</p>
        </div>

        {/* Phase Timeline */}
        <div className="phase-timeline">
          <div className="phase-item completed">
            <div className="phase-marker">1</div>
            <div className="phase-label">Registration</div>
          </div>
          <div className="phase-connector"></div>
          <div className="phase-item current">
            <div className="phase-marker">2</div>
            <div className="phase-label">Preparation</div>
            <div className="phase-badge">You are here</div>
          </div>
          <div className="phase-connector"></div>
          <div className="phase-item future">
            <div className="phase-marker">3</div>
            <div className="phase-label">Full Access</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="phase2-content">
          <p className="phase2-description">
            While we prepare Phase 3, you can explore the concept with your favourite LLM.
            Paste the invitation JSON from your conversation below.
          </p>

          {/* LLM Links */}
          <div className="llm-links">
            <h3>Start a conversation</h3>
            <div className="llm-grid">
              {LLM_LINKS.map(llm => (
                <a
                  key={llm.name}
                  href={llm.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="llm-link"
                >
                  <span className="llm-name">{llm.name}</span>
                  <span className="llm-desc">{llm.description}</span>
                </a>
              ))}
            </div>
          </div>

          {/* JSON Input */}
          <div className="json-input-section">
            <label htmlFor="json-input">Paste your LLM invitation JSON (optional)</label>
            <textarea
              id="json-input"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='{"invitation": "..."}'
              rows={6}
              disabled={isSubmitting}
            />
          </div>

          {/* Playtester Option */}
          <div className="playtester-option">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={wantsPlaytester}
                onChange={(e) => setWantsPlaytester(e.target.checked)}
                disabled={isSubmitting}
              />
              <span>I'd like to be notified about playtesting opportunities</span>
            </label>
          </div>

          {error && (
            <div className="phase2-error">{error}</div>
          )}

          <button
            className="phase2-submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Continue'}
          </button>

          {/* Admin bypass */}
          {isAdmin && (
            <div className="admin-section">
              <p className="admin-notice">Admin detected: {userEmail}</p>
              <button
                className="admin-bypass"
                onClick={handleAdminBypass}
                disabled={isSubmitting}
              >
                Skip to Full Access (Admin)
              </button>
            </div>
          )}
        </div>

        <div className="phase2-footer">
          <p>You'll be notified when Phase 3 is ready.</p>
        </div>
      </div>
    </div>
  )
}
