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
type SolidView = 'log' | 'dir'

// Available frames (Phase 0.3)
const FRAMES = [
  { id: null, name: 'None (platform defaults)', xyz: 'X0Y0Z0' },
  { id: 'bbbbbbbb-0000-0000-0000-000000000001', name: 'test-frame', xyz: 'X0Y0Z0' },
] as const

// Visibility settings for sharing and filtering
interface VisibilitySettings {
  shareVapor: boolean
  shareLiquid: boolean
  showVapor: boolean
  showLiquid: boolean
  showSolid: boolean
  showPlayerFace: boolean
  showAuthorFace: boolean
  showDesignerFace: boolean
}

interface SkillUsed {
  category: string
  name: string
}

interface FrameSkill {
  id: string
  name: string
  category: string
  applies_to: string[]
  content: string
  package_name?: string
  package_level?: string
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
  createdSkill?: FrameSkill | null
}

interface SoftLLMResponse {
  id: string
  originalInput: string
  refinedText: string
  options?: string[]
  face: Face
  frameId: string | null
}

interface ParsedInput {
  text: string
  route: 'soft' | 'liquid' | 'solid' | 'hard'
}

// Placeholder directory items for player/author
interface CharacterItem {
  id: string
  name: string
  status: string
}

interface WorldItem {
  id: string
  name: string
  type: string
}

const EDIT_DEBOUNCE_MS = 500

function getUserId(): string {
  const stored = localStorage.getItem('xstream_user_id')
  if (stored) return stored
  
  const newId = crypto.randomUUID()
  localStorage.setItem('xstream_user_id', newId)
  return newId
}

function parseInputTypography(input: string): ParsedInput {
  const trimmed = input.trim()
  
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return { text: trimmed.slice(1, -1).trim(), route: 'liquid' }
  }
  
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    return { text: trimmed.slice(1, -1).trim(), route: 'solid' }
  }
  
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return { text: trimmed.slice(1, -1).trim(), route: 'hard' }
  }
  
  return { text: trimmed, route: 'soft' }
}

// Phase 0.5.5: Solid panel navigation + frame-scoped skills
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
  
  // Solid panel state
  const [solidView, setSolidView] = useState<SolidView>('log')
  const [frameSkills, setFrameSkills] = useState<FrameSkill[]>([])
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false)
  
  // Placeholder directory data
  const [characters] = useState<CharacterItem[]>([
    { id: '1', name: 'Hero', status: 'active' },
    { id: '2', name: 'Companion', status: 'nearby' },
  ])
  const [worldItems] = useState<WorldItem[]>([
    { id: '1', name: 'Tavern District', type: 'location' },
    { id: '2', name: 'Mysterious Stranger', type: 'npc' },
  ])
  
  const [softResponse, setSoftResponse] = useState<SoftLLMResponse | null>(null)
  
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

  const debounceTimerRef = useRef<number | null>(null)

  const currentFrame = FRAMES.find(f => f.id === frameId) || FRAMES[0]

  const filterByFace = (entry: ShelfEntry) => {
    if (entry.face === 'player' && !visibility.showPlayerFace) return false
    if (entry.face === 'author' && !visibility.showAuthorFace) return false
    if (entry.face === 'designer' && !visibility.showDesignerFace) return false
    return true
  }

  const liquidEntries = entries.filter(e => e.state === 'submitted' && filterByFace(e))
  const solidEntries = entries.filter(e => e.state === 'committed' && e.response && filterByFace(e))
  
  // Check if there's any vapor/liquid content to clear
  const hasVaporOrLiquid = input.trim() || softResponse || liquidEntries.length > 0

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Load frame skills when switching to directory view or changing frame
  useEffect(() => {
    if (solidView === 'dir' && face === 'designer') {
      loadFrameSkills()
    }
  }, [solidView, frameId, face])

  // Load skills for current frame (directory view)
  const loadFrameSkills = async () => {
    if (!GENERATE_URL || !SUPABASE_ANON_KEY) return
    
    setIsLoadingDirectory(true)
    try {
      const res = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'list_frame_skills',
          frame_id: frameId,
        }),
      })
      
      const data = await res.json()
      if (data.success && data.skills) {
        setFrameSkills(data.skills)
      }
    } catch (error) {
      console.error('Error loading frame skills:', error)
    } finally {
      setIsLoadingDirectory(false)
    }
  }

  // Load skill content into liquid for editing
  const handleSkillClick = async (skill: FrameSkill) => {
    // Format skill as editable content
    const skillText = `SKILL_CREATE
name: ${skill.name}
category: ${skill.category}
applies_to: ${skill.applies_to.join(', ')}
content: |
${skill.content.split('\n').map(line => '  ' + line).join('\n')}`
    
    // Create a liquid entry with this content
    const entry: ShelfEntry = {
      id: crypto.randomUUID(),
      text: skillText,
      face: 'designer',
      frameId,
      state: 'submitted',
      timestamp: new Date().toISOString(),
    }
    
    setEntries(prev => [...prev, entry])
    setSolidView('log') // Switch back to log to see the liquid entry
    console.log('[Directory] Loaded skill to liquid:', skill.name)
  }

  // Dismiss a liquid entry
  const handleDismissEntry = (entryId: string) => {
    setEntries(prev => prev.filter(e => e.id !== entryId))
  }

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
    }, EDIT_DEBOUNCE_MS)
  }, [])

  const handleQuery = async () => {
    if (!input.trim()) return
    
    const parsed = parseInputTypography(input)
    
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
        options: data.options,
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
  }

  const handleEditSoftResponse = () => {
    if (!softResponse) return
    setInput(softResponse.refinedText)
    setSoftResponse(null)
  }

  const handleDismissSoftResponse = () => {
    setSoftResponse(null)
  }

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
  }

  const handleSubmit = () => {
    if (!input.trim()) return
    
    const parsed = parseInputTypography(input)
    
    if (parsed.route === 'solid') {
      handleCommitDirect(parsed.text)
      return
    }
    
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
  }

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

  const handleCommitEntry = async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId)
    if (!entry || entry.state !== 'submitted') return

    setEntries(prev => prev.map(e => 
      e.id === entryId ? { ...e, state: 'committed' as TextState, isEditing: false } : e
    ))
    
    await generateResponse(entry)
  }

  const handleCommit = async () => {
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

    const lastLiquid = [...entries].reverse().find(e => e.state === 'submitted')
    if (lastLiquid) {
      await handleCommitEntry(lastLiquid.id)
    }
  }

  // Clear vapor and liquid, keep solid
  const handleClear = () => {
    setInput('')
    setSoftResponse(null)
    setEntries(prev => prev.filter(e => e.state === 'committed'))
  }

  const generateResponse = async (entry: ShelfEntry) => {
    setIsLoading(true)
    
    try {
      if (!GENERATE_URL || !SUPABASE_ANON_KEY) {
        const response = `[Supabase not configured]\n\nYour input (${entry.face}): ${entry.text}`
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

      const createdSkill = data.created_skill || null
      if (createdSkill && solidView === 'dir') {
        loadFrameSkills() // Refresh directory
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

  const toggleVisibility = (key: keyof VisibilitySettings) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Render directory based on face
  const renderDirectory = () => {
    if (isLoadingDirectory) {
      return <div className="directory-loading">Loading...</div>
    }

    switch (face) {
      case 'designer':
        return (
          <div className="directory-list">
            {frameSkills.length > 0 ? (
              frameSkills.map(skill => (
                <div 
                  key={skill.id} 
                  className={`directory-item skill-item ${skill.package_level}`}
                  onClick={() => handleSkillClick(skill)}
                >
                  <div className="dir-item-header">
                    <span className="dir-item-name">{skill.name}</span>
                    <span className={`dir-item-level ${skill.package_level}`}>
                      {skill.package_level}
                    </span>
                  </div>
                  <div className="dir-item-meta">
                    <span className="dir-item-category">{skill.category}</span>
                    <span className="dir-item-faces">{skill.applies_to.join(', ')}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="directory-empty">
                No skills in this frame yet.
                {!frameId && ' Select a frame to see frame-specific skills.'}
              </div>
            )}
          </div>
        )
      
      case 'player':
        return (
          <div className="directory-list">
            <div className="directory-section-label">Characters in Frame</div>
            {characters.map(char => (
              <div key={char.id} className="directory-item character-item">
                <span className="dir-item-name">{char.name}</span>
                <span className="dir-item-status">{char.status}</span>
              </div>
            ))}
            <div className="directory-placeholder">
              (Character directory - placeholder)
            </div>
          </div>
        )
      
      case 'author':
        return (
          <div className="directory-list">
            <div className="directory-section-label">World Elements</div>
            {worldItems.map(item => (
              <div key={item.id} className="directory-item world-item">
                <span className="dir-item-name">{item.name}</span>
                <span className="dir-item-type">{item.type}</span>
              </div>
            ))}
            <div className="directory-placeholder">
              (World directory - placeholder)
            </div>
          </div>
        )
    }
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

      {/* Visibility Settings Panel */}
      {showVisibilityPanel && (
        <div className="visibility-panel">
          <div className="visibility-section">
            <span className="visibility-label">Share:</span>
            <button 
              className={`visibility-btn ${visibility.shareVapor ? 'on' : 'off'}`}
              onClick={() => toggleVisibility('shareVapor')}
            >
              ~ Vapor
            </button>
            <button 
              className={`visibility-btn ${visibility.shareLiquid ? 'on' : 'off'}`}
              onClick={() => toggleVisibility('shareLiquid')}
            >
              o Liquid
            </button>
          </div>
          <div className="visibility-section">
            <span className="visibility-label">Show:</span>
            <button 
              className={`visibility-btn ${visibility.showVapor ? 'on' : 'off'}`}
              onClick={() => toggleVisibility('showVapor')}
            >
              ~ Vapor
            </button>
            <button 
              className={`visibility-btn ${visibility.showLiquid ? 'on' : 'off'}`}
              onClick={() => toggleVisibility('showLiquid')}
            >
              o Liquid
            </button>
            <button 
              className={`visibility-btn ${visibility.showSolid ? 'on' : 'off'}`}
              onClick={() => toggleVisibility('showSolid')}
            >
              # Solid
            </button>
          </div>
          <div className="visibility-section">
            <span className="visibility-label">Faces:</span>
            <button 
              className={`visibility-btn ${visibility.showPlayerFace ? 'on' : 'off'}`}
              onClick={() => toggleVisibility('showPlayerFace')}
            >
              Player
            </button>
            <button 
              className={`visibility-btn ${visibility.showAuthorFace ? 'on' : 'off'}`}
              onClick={() => toggleVisibility('showAuthorFace')}
            >
              Author
            </button>
            <button 
              className={`visibility-btn ${visibility.showDesignerFace ? 'on' : 'off'}`}
              onClick={() => toggleVisibility('showDesignerFace')}
            >
              Designer
            </button>
          </div>
        </div>
      )}

      <main className="main">
        {/* SOLID: Synthesis area with log/directory toggle */}
        {visibility.showSolid && (
          <section className="synthesis-area">
            <div className="area-header">
              <span className="area-label"># Solid</span>
              <div className="solid-view-toggle">
                <button 
                  className={`view-btn ${solidView === 'log' ? 'active' : ''}`}
                  onClick={() => setSolidView('log')}
                >
                  log
                </button>
                <button 
                  className={`view-btn ${solidView === 'dir' ? 'active' : ''}`}
                  onClick={() => setSolidView('dir')}
                >
                  dir
                </button>
              </div>
            </div>
            
            {solidView === 'log' ? (
              // Log view - committed entries
              solidEntries.length > 0 ? (
                solidEntries.map(entry => (
                  <div key={entry.id} className={`solid-entry ${entry.error ? 'error' : ''}`}>
                    <div className="entry-header">
                      <span className="face-badge">{entry.face}</span>
                      {entry.frameId && <span className="frame-badge">test-frame</span>}
                      <span className="state-badge committed">committed</span>
                      {entry.createdSkill && (
                        <span className="skill-created-badge">+ skill</span>
                      )}
                    </div>
                    <div className="entry-input">"{entry.text.slice(0, 100)}{entry.text.length > 100 ? '...' : ''}"</div>
                    <div className="entry-response">{entry.response}</div>
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
              )
            ) : (
              // Directory view
              renderDirectory()
            )}
          </section>
        )}

        {/* LIQUID: Submitted intentions area */}
        {visibility.showLiquid && (
          <section className="liquid-area">
            <div className="area-header">
              <span className="area-label">o Liquid</span>
              <span className="area-hint">Editable intentions</span>
            </div>
            {liquidEntries.length > 0 ? (
              liquidEntries.map(entry => (
                <div key={entry.id} className={`liquid-entry ${entry.isEditing ? 'editing' : ''}`}>
                  <div className="entry-header">
                    <span className="face-badge">{entry.face}</span>
                    <span className={`state-badge ${entry.isEditing ? 'editing' : 'submitted'}`}>
                      {entry.isEditing ? 'editing' : 'submitted'}
                    </span>
                    <button
                      className="dismiss-entry-btn"
                      onClick={() => handleDismissEntry(entry.id)}
                      title="Dismiss"
                    >
                      x
                    </button>
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
                Type below and submit to create an entry
              </div>
            )}
          </section>
        )}

        {/* VAPOR: Typing indicators + Soft-LLM responses */}
        {visibility.showVapor && (
          <section className="vapor-area">
            <div className="area-header">
              <span className="area-label">~ Vapor</span>
              <span className="area-hint">Live + Soft-LLM</span>
            </div>
            
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
            
            {input.trim() && visibility.shareVapor && !softResponse && (
              <div className="vapor-indicator self">
                <span className="typing-dot">*</span>
                <span className="vapor-preview">typing: "{input.slice(0, 30)}{input.length > 30 ? '...' : ''}"</span>
              </div>
            )}
            
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
            ? 'Create a skill... (e.g., "Create a format skill for pirate responses")'
            : `Enter text as ${face}...`
          }
          disabled={isLoading || isQuerying}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.metaKey) {
              e.preventDefault()
              handleCommit()
            } else if (e.key === 'Enter' && e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
        />
        <div className="buttons">
          <button 
            onClick={handleQuery}
            disabled={isLoading || isQuerying || !input.trim()}
            className="query-btn"
            title="Query Soft-LLM"
          >
            {isQuerying ? '...' : '?'}
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={isLoading || isQuerying || !input.trim()}
            title="Submit (Shift+Enter)"
          >
            Submit
          </button>
          <button 
            onClick={handleCommit} 
            disabled={isLoading || isQuerying}
            className="commit-btn"
            title="Commit (Cmd+Enter)"
          >
            {isLoading ? '...' : 'Commit'}
          </button>
          {hasVaporOrLiquid && (
            <button 
              onClick={handleClear}
              className="clear-btn"
              title="Clear vapor and liquid"
            >
              Clear
            </button>
          )}
        </div>
      </footer>

      <ConstructionButton />
    </div>
  )
}

export default App
