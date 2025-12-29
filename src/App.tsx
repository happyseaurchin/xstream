import { useState, useRef, useEffect, useCallback } from 'react'
import { ConstructionButton } from './components/ConstructionButton'
import './App.css'

// Supabase Edge Function URL
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const GENERATE_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/generate-v2` : null

// Types matching spec
type Face = 'player' | 'author' | 'designer'
type TextState = 'draft' | 'submitted' | 'committed'
type LLMMode = 'soft' | 'medium'

// Available frames (Phase 0.3)
const FRAMES = [
  { id: null, name: 'None (platform defaults)', xyz: 'X0Y0Z0' },
  { id: 'bbbbbbbb-0000-0000-0000-000000000001', name: 'test-frame', xyz: 'X0Y0Z0' },
] as const

// Visibility settings for sharing and filtering
interface VisibilitySettings {
  // What you share with others
  shareVapor: boolean
  shareLiquid: boolean
  // What you see from others
  showVapor: boolean
  showLiquid: boolean
  showSolid: boolean
  // Face filters
  showPlayerFace: boolean
  showAuthorFace: boolean
  showDesignerFace: boolean
}

interface SkillUsed {
  category: string
  name: string
}

interface UserSkill {
  id: string
  name: string
  category: string
  applies_to: string[]
  content: string
  package_name?: string
}

interface ShelfEntry {
  id: string
  text: string
  face: Face
  frameId: string | null
  state: TextState
  timestamp: string
  isEditing?: boolean
  response?: string
  error?: string
  skillsUsed?: SkillUsed[]
  createdSkill?: UserSkill | null
}

// Soft-LLM response in vapor
interface SoftLLMResponse {
  id: string
  originalInput: string
  refinedText: string
  options?: string[]  // Multiple choice options if provided
  face: Face
  frameId: string | null
}

// Typography parsing result
interface ParsedInput {
  text: string
  route: 'soft' | 'liquid' | 'solid' | 'hard'
}

// Debounce delay for liquid edits (ms)
const EDIT_DEBOUNCE_MS = 500

// Get or create a persistent user ID
function getUserId(): string {
  const stored = localStorage.getItem('xstream_user_id')
  if (stored) return stored
  
  const newId = crypto.randomUUID()
  localStorage.setItem('xstream_user_id', newId)
  return newId
}

// Parse input for typography markers
// plain text -> soft-LLM
// {braces} -> direct to liquid
// (parens) -> direct to solid
// [brackets] -> hard-LLM query (future)
function parseInputTypography(input: string): ParsedInput {
  const trimmed = input.trim()
  
  // {braces} -> direct to liquid
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return { text: trimmed.slice(1, -1).trim(), route: 'liquid' }
  }
  
  // (parens) -> direct to solid
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    return { text: trimmed.slice(1, -1).trim(), route: 'solid' }
  }
  
  // [brackets] -> hard-LLM (future, treat as soft for now)
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return { text: trimmed.slice(1, -1).trim(), route: 'hard' }
  }
  
  // Default: plain text -> soft-LLM
  return { text: trimmed, route: 'soft' }
}

// Phase 0.1: Core loop (X0Y0Z0)
// Phase 0.2: Skills loaded from database
// Phase 0.3: Frame selection
// Phase 0.4: Text states (vapor/liquid/solid) visible
// Phase 0.4.5: Soft-LLM query flow, typography parsing, face filters
// Phase 0.5: Designer creates skills
function App() {
  const [userId] = useState<string>(getUserId)
  const [face, setFace] = useState<Face>('player')
  const [frameId, setFrameId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [entries, setEntries] = useState<ShelfEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isQuerying, setIsQuerying] = useState(false)
  const [showMeta, setShowMeta] = useState(false)
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false)
  const [showDesignerPanel, setShowDesignerPanel] = useState(false)
  const [userSkills, setUserSkills] = useState<UserSkill[]>([])
  const [isLoadingSkills, setIsLoadingSkills] = useState(false)
  
  // Soft-LLM response (shown in vapor)
  const [softResponse, setSoftResponse] = useState<SoftLLMResponse | null>(null)
  
  // Visibility settings
  const [visibility, setVisibility] = useState<VisibilitySettings>({
    shareVapor: true,
    shareLiquid: true,
    showVapor: true,
    showLiquid: true,
    showSolid: true,
    showPlayerFace: true,
    showAuthorFace: true,
    showDesignerFace: true,
  })

  // Debounce timer ref for liquid edits
  const debounceTimerRef = useRef<number | null>(null)

  const currentFrame = FRAMES.find(f => f.id === frameId) || FRAMES[0]

  // Filter entries by face visibility
  const filterByFace = (entry: ShelfEntry) => {
    if (entry.face === 'player' && !visibility.showPlayerFace) return false
    if (entry.face === 'author' && !visibility.showAuthorFace) return false
    if (entry.face === 'designer' && !visibility.showDesignerFace) return false
    return true
  }

  // Get entries by state (filtered by face)
  const liquidEntries = entries.filter(e => e.state === 'submitted' && filterByFace(e))
  const solidEntries = entries.filter(e => e.state === 'committed' && e.response && filterByFace(e))

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Load user skills when designer panel is opened
  useEffect(() => {
    if (showDesignerPanel && userId) {
      loadUserSkills()
    }
  }, [showDesignerPanel, userId])

  // Load user's created skills
  const loadUserSkills = async () => {
    if (!GENERATE_URL || !SUPABASE_ANON_KEY) return
    
    setIsLoadingSkills(true)
    try {
      const res = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'list_skills',
          user_id: userId,
        }),
      })
      
      const data = await res.json()
      if (data.success && data.skills) {
        setUserSkills(data.skills)
      }
    } catch (error) {
      console.error('Error loading user skills:', error)
    } finally {
      setIsLoadingSkills(false)
    }
  }

  // Handle liquid entry edit with debouncing
  const handleLiquidEdit = useCallback((entryId: string, newText: string) => {
    setEntries(prev => prev.map(e => 
      e.id === entryId ? { ...e, text: newText, isEditing: true } : e
    ))

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = window.setTimeout(() => {
      setEntries(prev => prev.map(e => 
        e.id === entryId ? { ...e, isEditing: false } : e
      ))
      console.log('[Debounced] Would broadcast liquid update:', { entryId, newText })
    }, EDIT_DEBOUNCE_MS)
  }, [])

  // Query Soft-LLM -> response in vapor
  const handleQuery = async () => {
    if (!input.trim()) return
    
    const parsed = parseInputTypography(input)
    
    // If typography indicates direct route, use that instead
    if (parsed.route === 'liquid') {
      handleSubmitDirect(parsed.text)
      return
    }
    if (parsed.route === 'solid') {
      handleCommitDirect(parsed.text)
      return
    }
    
    setIsQuerying(true)
    
    try {
      if (!GENERATE_URL || !SUPABASE_ANON_KEY) {
        // Fallback for dev without Supabase
        const mockResponse: SoftLLMResponse = {
          id: crypto.randomUUID(),
          originalInput: input,
          refinedText: `[Soft-LLM would refine: "${parsed.text}"]`,
          face,
          frameId,
        }
        setSoftResponse(mockResponse)
        return
      }

      const res = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          text: parsed.text,
          face,
          frame_id: frameId,
          user_id: userId,
          mode: 'soft' as LLMMode,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      const response: SoftLLMResponse = {
        id: crypto.randomUUID(),
        originalInput: input,
        refinedText: data.text,
        options: data.options,  // If Soft-LLM provides multiple choice
        face,
        frameId,
      }
      setSoftResponse(response)
      
    } catch (error) {
      console.error('Soft-LLM query error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setSoftResponse({
        id: crypto.randomUUID(),
        originalInput: input,
        refinedText: `[Error: ${errorMsg}]`,
        face,
        frameId,
      })
    } finally {
      setIsQuerying(false)
    }
  }

  // Use Soft-LLM response -> move to liquid
  const handleUseSoftResponse = () => {
    if (!softResponse) return
    
    const entry: ShelfEntry = {
      id: crypto.randomUUID(),
      text: softResponse.refinedText,
      face: softResponse.face,
      frameId: softResponse.frameId,
      state: 'submitted',
      timestamp: new Date().toISOString(),
    }
    
    setEntries(prev => [...prev, entry])
    setSoftResponse(null)
    setInput('')
    
    console.log('[Use] Moved soft response to liquid:', entry.id)
  }

  // Edit Soft-LLM response -> put back in input
  const handleEditSoftResponse = () => {
    if (!softResponse) return
    setInput(softResponse.refinedText)
    setSoftResponse(null)
  }

  // Dismiss Soft-LLM response
  const handleDismissSoftResponse = () => {
    setSoftResponse(null)
  }

  // Submit direct (from {braces} typography) -> liquid
  const handleSubmitDirect = (text: string) => {
    if (!text.trim()) return
    
    const entry: ShelfEntry = {
      id: crypto.randomUUID(),
      text: text.trim(),
      face,
      frameId,
      state: 'submitted',
      timestamp: new Date().toISOString(),
    }
    
    setEntries(prev => [...prev, entry])
    setInput('')
    
    console.log('[Submit Direct] Created liquid entry:', entry.id)
  }

  // Submit: input -> liquid (submitted state)
  const handleSubmit = () => {
    if (!input.trim()) return
    
    const parsed = parseInputTypography(input)
    
    // Handle typography routing
    if (parsed.route === 'solid') {
      handleCommitDirect(parsed.text)
      return
    }
    
    // For {braces} or plain text, submit to liquid
    const entry: ShelfEntry = {
      id: crypto.randomUUID(),
      text: parsed.text,
      face,
      frameId,
      state: 'submitted',
      timestamp: new Date().toISOString(),
    }
    
    setEntries(prev => [...prev, entry])
    setInput('')
    
    console.log('[Submit] Created liquid entry:', entry.id)
  }

  // Commit direct (from (parens) typography) -> solid
  const handleCommitDirect = async (text: string) => {
    if (!text.trim()) return
    
    const entry: ShelfEntry = {
      id: crypto.randomUUID(),
      text: text.trim(),
      face,
      frameId,
      state: 'committed',
      timestamp: new Date().toISOString(),
    }
    
    setInput('')
    setEntries(prev => [...prev, entry])
    await generateResponse(entry)
  }

  // Commit specific entry: submitted -> committed -> triggers generation
  const handleCommitEntry = async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId)
    if (!entry || entry.state !== 'submitted') return

    setEntries(prev => prev.map(e => 
      e.id === entryId ? { ...e, state: 'committed' as TextState, isEditing: false } : e
    ))
    
    await generateResponse(entry)
  }

  // Commit: submit current input OR commit last liquid entry
  const handleCommit = async () => {
    // If there's input, check typography and commit
    if (input.trim()) {
      const parsed = parseInputTypography(input)
      
      const entry: ShelfEntry = {
        id: crypto.randomUUID(),
        text: parsed.text,
        face,
        frameId,
        state: 'committed',
        timestamp: new Date().toISOString(),
      }
      setInput('')
      setEntries(prev => [...prev, entry])
      await generateResponse(entry)
      return
    }

    // Otherwise commit the last liquid entry
    const lastLiquid = [...entries].reverse().find(e => e.state === 'submitted')
    if (lastLiquid) {
      await handleCommitEntry(lastLiquid.id)
    }
    // If no input and no liquid entry, do nothing (prevents error)
  }

  // LLM generation via Supabase Edge Function (generate-v2) - Medium-LLM
  const generateResponse = async (entry: ShelfEntry) => {
    setIsLoading(true)
    
    try {
      if (!GENERATE_URL || !SUPABASE_ANON_KEY) {
        const response = `[Supabase not configured]\n\nTo enable LLM responses, add environment variables:\n- VITE_SUPABASE_URL\n- VITE_SUPABASE_ANON_KEY\n\nYour input (${entry.face}): ${entry.text}`
        setEntries(prev => prev.map(e => 
          e.id === entry.id ? { ...e, state: 'committed' as TextState, response } : e
        ))
        return
      }

      const res = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          text: entry.text,
          face: entry.face,
          frame_id: entry.frameId,
          user_id: userId,
          mode: 'medium' as LLMMode,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      // Check if a skill was created (designer mode)
      const createdSkill = data.created_skill || null
      if (createdSkill) {
        // Refresh the user skills list
        loadUserSkills()
      }

      setEntries(prev => prev.map(e => 
        e.id === entry.id ? { 
          ...e, 
          state: 'committed' as TextState, 
          response: data.text,
          skillsUsed: data.metadata?.skills_used || [],
          createdSkill,
        } : e
      ))
    } catch (error) {
      console.error('Generation error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setEntries(prev => prev.map(e => 
        e.id === entry.id ? { 
          ...e, 
          state: 'committed' as TextState, 
          error: errorMsg, 
          response: `[Error: ${errorMsg}]` 
        } : e
      ))
    } finally {
      setIsLoading(false)
    }
  }

  // Toggle visibility setting
  const toggleVisibility = (key: keyof VisibilitySettings) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="app">
      <header className="header">
        <div className="selectors">
          <select 
            value={face} 
            onChange={(e) => setFace(e.target.value as Face)}
            className="face-selector"
          >
            <option value="player">Player</option>
            <option value="author">Author</option>
            <option value="designer">Designer</option>
          </select>
          <select
            value={frameId || ''}
            onChange={(e) => setFrameId(e.target.value || null)}
            className="frame-selector"
          >
            {FRAMES.map(f => (
              <option key={f.id || 'none'} value={f.id || ''}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div className="header-controls">
          <span className="xyz-badge">{currentFrame.xyz}</span>
          {face === 'designer' && (
            <button 
              className={`designer-panel-toggle ${showDesignerPanel ? 'active' : ''}`}
              onClick={() => setShowDesignerPanel(!showDesignerPanel)}
              title="View your created skills"
            >
              skills
            </button>
          )}
          <button 
            className={`visibility-toggle ${showVisibilityPanel ? 'active' : ''}`}
            onClick={() => setShowVisibilityPanel(!showVisibilityPanel)}
            title="Visibility settings"
          >
            *
          </button>
          <button 
            className="meta-toggle"
            onClick={() => setShowMeta(!showMeta)}
            title="Toggle skill metadata"
          >
            {showMeta ? '#' : 'o'}
          </button>
        </div>
      </header>

      {/* Designer Panel - shows created skills */}
      {showDesignerPanel && face === 'designer' && (
        <div className="designer-panel">
          <div className="designer-panel-header">
            <span className="panel-title">Your Skills</span>
            <button 
              className="refresh-btn"
              onClick={loadUserSkills}
              disabled={isLoadingSkills}
              title="Refresh skills list"
            >
              {isLoadingSkills ? '...' : '↻'}
            </button>
          </div>
          {userSkills.length > 0 ? (
            <div className="skills-list">
              {userSkills.map(skill => (
                <div key={skill.id} className="skill-item">
                  <div className="skill-header">
                    <span className="skill-name">{skill.name}</span>
                    <span className="skill-category">{skill.category}</span>
                  </div>
                  <div className="skill-applies-to">
                    {skill.applies_to.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-skills">
              No skills created yet. Ask me to create a skill!
              <br /><br />
              Example: "Create a format skill that makes responses pirate-themed"
            </div>
          )}
        </div>
      )}

      {/* Visibility Settings Panel */}
      {showVisibilityPanel && (
        <div className="visibility-panel">
          <div className="visibility-section">
            <span className="visibility-label">Share:</span>
            <button 
              className={`visibility-btn ${visibility.shareVapor ? 'on' : 'off'}`}
              onClick={() => toggleVisibility('shareVapor')}
              title="Share live typing (vapor)"
            >
              ~ Vapor
            </button>
            <button 
              className={`visibility-btn ${visibility.shareLiquid ? 'on' : 'off'}`}
              onClick={() => toggleVisibility('shareLiquid')}
              title="Share submitted intentions (liquid)"
            >
              o Liquid
            </button>
          </div>
          <div className="visibility-section">
            <span className="visibility-label">Show:</span>
            <button 
              className={`visibility-btn ${visibility.showVapor ? 'on' : 'off'}`}
              onClick={() => toggleVisibility('showVapor')}
              title="See others' typing"
            >
              ~ Vapor
            </button>
            <button 
              className={`visibility-btn ${visibility.showLiquid ? 'on' : 'off'}`}
              onClick={() => toggleVisibility('showLiquid')}
              title="See others' intentions"
            >
              o Liquid
            </button>
            <button 
              className={`visibility-btn ${visibility.showSolid ? 'on' : 'off'}`}
              onClick={() => toggleVisibility('showSolid')}
              title="See committed results"
            >
              # Solid
            </button>
          </div>
          <div className="visibility-section">
            <span className="visibility-label">Faces:</span>
            <button 
              className={`visibility-btn ${visibility.showPlayerFace ? 'on' : 'off'}`}
              onClick={() => toggleVisibility('showPlayerFace')}
              title="Show player entries"
            >
              Player
            </button>
            <button 
              className={`visibility-btn ${visibility.showAuthorFace ? 'on' : 'off'}`}
              onClick={() => toggleVisibility('showAuthorFace')}
              title="Show author entries"
            >
              Author
            </button>
            <button 
              className={`visibility-btn ${visibility.showDesignerFace ? 'on' : 'off'}`}
              onClick={() => toggleVisibility('showDesignerFace')}
              title="Show designer entries"
            >
              Designer
            </button>
          </div>
        </div>
      )}

      <main className="main">
        {/* SOLID: Synthesis area - committed results */}
        {visibility.showSolid && (
          <section className="synthesis-area">
            <div className="area-header">
              <span className="area-label"># Solid</span>
              <span className="area-hint">Committed results</span>
            </div>
            {solidEntries.length > 0 ? (
              solidEntries.map(entry => (
                <div key={entry.id} className={`solid-entry ${entry.error ? 'error' : ''}`}>
                  <div className="entry-header">
                    <span className="face-badge">{entry.face}</span>
                    {entry.frameId && <span className="frame-badge">test-frame</span>}
                    <span className="state-badge committed">committed</span>
                    {entry.createdSkill && (
                      <span className="skill-created-badge">+ skill created</span>
                    )}
                  </div>
                  <div className="entry-input">"{entry.text}"</div>
                  <div className="entry-response">{entry.response}</div>
                  {entry.createdSkill && (
                    <div className="created-skill-info">
                      Created skill: <strong>{entry.createdSkill.name}</strong> ({entry.createdSkill.category})
                    </div>
                  )}
                  {showMeta && entry.skillsUsed && entry.skillsUsed.length > 0 && (
                    <div className="skills-meta">
                      Skills: {entry.skillsUsed.map(s => s.name).join(', ')}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-state">
                No committed results yet. Submit and commit to generate.
              </div>
            )}
          </section>
        )}

        {/* LIQUID: Submitted intentions area */}
        {visibility.showLiquid && (
          <section className="liquid-area">
            <div className="area-header">
              <span className="area-label">o Liquid</span>
              <span className="area-hint">Submitted intentions (editable)</span>
            </div>
            {liquidEntries.length > 0 ? (
              liquidEntries.map(entry => (
                <div key={entry.id} className={`liquid-entry ${entry.isEditing ? 'editing' : ''}`}>
                  <div className="entry-header">
                    <span className="face-badge">{entry.face}</span>
                    <span className={`state-badge ${entry.isEditing ? 'editing' : 'submitted'}`}>
                      {entry.isEditing ? 'editing' : 'submitted'}
                    </span>
                  </div>
                  <textarea
                    className="liquid-text"
                    value={entry.text}
                    onChange={(e) => handleLiquidEdit(entry.id, e.target.value)}
                    disabled={isLoading}
                  />
                  <div className="entry-actions">
                    <button
                      className="commit-entry-btn"
                      onClick={() => handleCommitEntry(entry.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? '...' : 'Commit'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-hint">
                Type below and submit to create a liquid entry
              </div>
            )}
          </section>
        )}

        {/* VAPOR: Typing indicators + Soft-LLM responses */}
        {visibility.showVapor && (
          <section className="vapor-area">
            <div className="area-header">
              <span className="area-label">~ Vapor</span>
              <span className="area-hint">Live presence + Soft-LLM</span>
            </div>
            
            {/* Soft-LLM Response */}
            {softResponse && (
              <div className="soft-response">
                <div className="soft-response-header">
                  <span className="face-badge">{softResponse.face}</span>
                  <span className="soft-label">Soft-LLM</span>
                </div>
                <div className="soft-response-text">{softResponse.refinedText}</div>
                {softResponse.options && softResponse.options.length > 0 && (
                  <div className="soft-options">
                    {softResponse.options.map((opt, i) => (
                      <button key={i} className="soft-option-btn" onClick={() => {
                        setInput(opt)
                        setSoftResponse(null)
                      }}>
                        {String.fromCharCode(97 + i)}) {opt}
                      </button>
                    ))}
                  </div>
                )}
                <div className="soft-response-actions">
                  <button className="soft-action-btn use" onClick={handleUseSoftResponse}>
                    Use
                  </button>
                  <button className="soft-action-btn edit" onClick={handleEditSoftResponse}>
                    Edit
                  </button>
                  <button className="soft-action-btn dismiss" onClick={handleDismissSoftResponse}>
                    x
                  </button>
                </div>
              </div>
            )}
            
            {/* Typing indicator */}
            {input.trim() && visibility.shareVapor && !softResponse && (
              <div className="vapor-indicator self">
                <span className="typing-dot">*</span>
                <span className="vapor-preview">typing: "{input.slice(0, 30)}{input.length > 30 ? '...' : ''}"</span>
              </div>
            )}
            
            {/* Empty state */}
            {!input.trim() && !softResponse && (
              <div className="empty-hint">
                Use [?] to query Soft-LLM, or type {'{braces}'} for direct submit
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={face === 'designer' 
            ? 'Ask to create a skill... (e.g., "Create a format skill for pirate responses")'
            : `Enter text as ${face}... (use {braces} for direct submit, (parens) for direct commit)`
          }
          disabled={isLoading || isQuerying}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.metaKey) {
              e.preventDefault()
              handleCommit()
            } else if (e.key === 'Enter' && e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            } else if (e.key === 'Enter' && !e.shiftKey && !e.metaKey) {
              // Plain Enter could trigger query (optional)
              // For now, let it create newlines
            }
          }}
        />
        <div className="buttons">
          <button 
            onClick={handleQuery}
            disabled={isLoading || isQuerying || !input.trim()}
            className="query-btn"
            title="Query Soft-LLM for refinement"
          >
            {isQuerying ? '...' : '?'}
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={isLoading || isQuerying || !input.trim()}
            title="Submit to liquid (Shift+Enter)"
          >
            Submit
          </button>
          <button 
            onClick={handleCommit} 
            disabled={isLoading || isQuerying}
            className="commit-btn"
            title="Commit and generate (Cmd+Enter)"
          >
            {isLoading ? '...' : 'Commit'}
          </button>
        </div>
      </footer>

      <ConstructionButton />
    </div>
  )
}

export default App
