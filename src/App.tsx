import { useState, useRef, useEffect, useCallback } from 'react'
import { ConstructionButton } from './components/ConstructionButton'
import { useFrameChannel, getDisplayName, setDisplayName } from './hooks/useFrameChannel'
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
type SoftType = 'artifact' | 'clarify' | 'refine'

// Available frames (Phase 0.3)
const FRAMES = [
  { id: null, name: 'None (platform defaults)', xyz: 'X0Y0Z0' },
  { id: 'bbbbbbbb-0000-0000-0000-000000000001', name: 'test-frame', xyz: 'X0Y0Z0' },
] as const

// Visibility settings for sharing and filtering (face filtering removed - handled by face selector)
interface VisibilitySettings {
  shareVapor: boolean
  shareLiquid: boolean
  showVapor: boolean
  showLiquid: boolean
  showSolid: boolean
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
  // Parsed artifact metadata (for directory display)
  artifactName?: string
  artifactType?: string
}

interface SoftLLMResponse {
  id: string
  originalInput: string
  text: string
  softType: SoftType
  document?: string
  options?: string[]
  face: Face
  frameId: string | null
}

interface ParsedInput {
  text: string
  route: 'soft' | 'liquid' | 'solid' | 'hard'
}

// Parsed artifact from shelf entry
interface ParsedArtifact {
  name: string
  type: string // category for skills, 'character' for players, element type for authors
  level: 'user' // shelf entries are always user-level
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

// Parse CHARACTER_CREATE from text
function parseCharacterFromText(text: string): ParsedArtifact | null {
  if (!text.includes('CHARACTER_CREATE')) return null
  
  const nameMatch = text.match(/name:\s*(.+)/i)
  const conceptMatch = text.match(/concept:\s*(.+)/i)
  
  if (!nameMatch) return null
  
  return {
    name: nameMatch[1].trim(),
    type: conceptMatch ? conceptMatch[1].trim().slice(0, 40) : 'character',
    level: 'user',
  }
}

// Parse WORLD_CREATE from text
function parseWorldFromText(text: string): ParsedArtifact | null {
  if (!text.includes('WORLD_CREATE')) return null
  
  const nameMatch = text.match(/name:\s*(.+)/i)
  const typeMatch = text.match(/type:\s*(.+)/i)
  
  if (!nameMatch) return null
  
  return {
    name: nameMatch[1].trim(),
    type: typeMatch ? typeMatch[1].trim() : 'element',
    level: 'user',
  }
}

// Parse SKILL_CREATE from text
function parseSkillFromText(text: string): ParsedArtifact | null {
  if (!text.includes('SKILL_CREATE')) return null
  
  const nameMatch = text.match(/name:\s*(.+)/i)
  const categoryMatch = text.match(/category:\s*(.+)/i)
  
  if (!nameMatch) return null
  
  return {
    name: nameMatch[1].trim(),
    type: categoryMatch ? categoryMatch[1].trim() : 'skill',
    level: 'user',
  }
}

// Parse any artifact from text based on face
function parseArtifactFromText(text: string, face: Face): ParsedArtifact | null {
  switch (face) {
    case 'player':
      return parseCharacterFromText(text)
    case 'author':
      return parseWorldFromText(text)
    case 'designer':
      return parseSkillFromText(text)
    default:
      return null
  }
}

// Phase 0.6: Multi-user Foundation
function App() {
  const [userId] = useState<string>(getUserId)
  const [userName, setUserName] = useState<string>(getDisplayName)
  const [face, setFace] = useState<Face>('player')
  const [frameId, setFrameId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [entries, setEntries] = useState<ShelfEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isQuerying, setIsQuerying] = useState(false)
  const [showMeta, setShowMeta] = useState(false)
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false)
  const [showNameEdit, setShowNameEdit] = useState(false)
  const [editingName, setEditingName] = useState('')
  
  // Solid panel state
  const [solidView, setSolidView] = useState<SolidView>('log')
  const [frameSkills, setFrameSkills] = useState<FrameSkill[]>([])
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false)
  
  const [softResponse, setSoftResponse] = useState<SoftLLMResponse | null>(null)
  
  const [visibility, setVisibility] = useState<VisibilitySettings>({
    shareVapor: true,
    shareLiquid: true,
    showVapor: true,
    showLiquid: true,
    showSolid: true,
  })

  const debounceTimerRef = useRef<number | null>(null)

  // Phase 0.6: Multi-user presence
  const { presentUsers, isConnected, broadcastTyping, error: channelError } = useFrameChannel({
    frameId,
    userId,
    userName,
    face,
  })

  const currentFrame = FRAMES.find(f => f.id === frameId) || FRAMES[0]

  // Face selector filters all views - entries for current face only
  const liquidEntries = entries.filter(e => e.face === face)
  const solidEntries = entries.filter(e => e.state === 'committed' && e.response && e.face === face)
  
  // Directory entries: committed entries with parseable artifacts for current face
  const directoryEntries = entries.filter(e => {
    if (e.state !== 'committed') return false
    if (e.face !== face) return false
    // For designer, we use frameSkills from database instead
    if (face === 'designer') return false
    // Check if entry contains a valid artifact
    const artifact = parseArtifactFromText(e.text, face)
    return artifact !== null
  })
  
  const hasVaporOrLiquid = input.trim() || softResponse || liquidEntries.length > 0

  // Broadcast typing state when input changes
  useEffect(() => {
    if (input.trim()) {
      broadcastTyping(true)
    } else {
      broadcastTyping(false)
    }
  }, [input, broadcastTyping])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (solidView === 'dir' && face === 'designer') {
      loadFrameSkills()
    }
  }, [solidView, frameId, face])

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

  // Load shelf entry back to liquid for editing
  const handleShelfEntryClick = (entry: ShelfEntry) => {
    const newEntry: ShelfEntry = {
      id: crypto.randomUUID(),
      text: entry.text,
      face: entry.face,
      frameId,
      state: 'submitted',
      timestamp: new Date().toISOString(),
    }
    
    setEntries(prev => [...prev, newEntry])
    setSolidView('log')
    console.log(`[Directory] Loaded entry to liquid:`, entry.artifactName || 'unnamed')
  }

  // Load skill from database to liquid
  const handleSkillClick = (skill: FrameSkill) => {
    const document = `SKILL_CREATE
name: ${skill.name}
category: ${skill.category}
applies_to: ${skill.applies_to.join(', ')}
content: |
${skill.content.split('\n').map(line => '  ' + line).join('\n')}`
    
    const entry: ShelfEntry = {
      id: crypto.randomUUID(),
      text: document,
      face: 'designer',
      frameId,
      state: 'submitted',
      timestamp: new Date().toISOString(),
    }
    
    setEntries(prev => [...prev, entry])
    setSolidView('log')
    console.log('[Directory] Loaded skill to liquid:', skill.name)
  }

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
          text: `[Soft-LLM would refine: "${parsed.text}"]`,
          softType: 'refine',
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

      const softType: SoftType = data.soft_type || 'refine'
      
      if (softType === 'artifact' && data.document) {
        // Parse artifact metadata for display
        const artifact = parseArtifactFromText(data.document, face)
        
        const entry: ShelfEntry = {
          id: crypto.randomUUID(),
          text: data.document,
          face,
          frameId,
          state: 'submitted',
          timestamp: new Date().toISOString(),
          artifactName: artifact?.name,
          artifactType: artifact?.type,
        }
        setEntries(prev => [...prev, entry])
        setInput('')
        
        // Keep vapor visible - user can dismiss or replace with new query
        setSoftResponse({
          id: crypto.randomUUID(),
          originalInput: input,
          text: data.text,
          softType: 'artifact',
          face,
          frameId,
        })
        
        console.log('[Soft-LLM] Artifact created in liquid:', artifact?.name || 'unnamed')
      } else {
        const response: SoftLLMResponse = {
          id: crypto.randomUUID(),
          originalInput: input,
          text: data.text,
          softType,
          options: data.options,
          face,
          frameId,
        }
        setSoftResponse(response)
      }
      
    } catch (error) {
      console.error('Soft-LLM query error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setSoftResponse({
        id: crypto.randomUUID(),
        originalInput: input,
        text: `[Error: ${errorMsg}]`,
        softType: 'refine',
        face,
        frameId,
      })
    } finally {
      setIsQuerying(false)
    }
  }

  const handleVaporClick = () => {
    if (!softResponse || softResponse.softType === 'artifact') return
    setInput(softResponse.text)
    setSoftResponse(null)
  }

  const handleDismissSoftResponse = () => {
    setSoftResponse(null)
  }

  const handleSubmitDirect = (text: string) => {
    if (!text.trim()) return
    
    const artifact = parseArtifactFromText(text, face)
    
    const entry: ShelfEntry = {
      id: crypto.randomUUID(),
      text: text.trim(),
      face,
      frameId,
      state: 'submitted',
      timestamp: new Date().toISOString(),
      artifactName: artifact?.name,
      artifactType: artifact?.type,
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
    
    const artifact = parseArtifactFromText(parsed.text, face)
    
    const entry: ShelfEntry = {
      id: crypto.randomUUID(),
      text: parsed.text,
      face,
      frameId,
      state: 'submitted',
      timestamp: new Date().toISOString(),
      artifactName: artifact?.name,
      artifactType: artifact?.type,
    }
    
    setEntries(prev => [...prev, entry])
    setInput('')
  }

  const handleCommitDirect = async (text: string) => {
    if (!text.trim()) return
    
    const artifact = parseArtifactFromText(text, face)
    
    const entry: ShelfEntry = {
      id: crypto.randomUUID(),
      text: text.trim(),
      face,
      frameId,
      state: 'committed',
      timestamp: new Date().toISOString(),
      artifactName: artifact?.name,
      artifactType: artifact?.type,
    }
    
    setInput('')
    setEntries(prev => [...prev, entry])
    await generateResponse(entry)
  }

  const handleCommitEntry = async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId)
    if (!entry || entry.state !== 'submitted') return

    // Parse artifact metadata before committing
    const artifact = parseArtifactFromText(entry.text, entry.face)

    // Update state to committed but keep entry visible in liquid
    setEntries(prev => prev.map(e => 
      e.id === entryId ? { 
        ...e, 
        state: 'committed' as TextState, 
        isEditing: false,
        artifactName: artifact?.name,
        artifactType: artifact?.type,
      } : e
    ))
    
    await generateResponse(entry)
  }

  const handleCommit = async () => {
    if (input.trim()) {
      const parsed = parseInputTypography(input)
      const artifact = parseArtifactFromText(parsed.text, face)
      
      const entry: ShelfEntry = {
        id: crypto.randomUUID(),
        text: parsed.text,
        face,
        frameId,
        state: 'committed',
        timestamp: new Date().toISOString(),
        artifactName: artifact?.name,
        artifactType: artifact?.type,
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

  const handleClear = () => {
    setInput('')
    setSoftResponse(null)
    // Clear only non-committed entries for current face
    setEntries(prev => prev.filter(e => e.face !== face || e.state === 'committed'))
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
        loadFrameSkills()
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

  const handleNameSubmit = () => {
    if (editingName.trim()) {
      setDisplayName(editingName.trim())
      setUserName(editingName.trim())
    }
    setShowNameEdit(false)
  }

  // Render directory based on face
  const renderDirectory = () => {
    if (isLoadingDirectory && face === 'designer') {
      return <div className="directory-loading">Loading...</div>
    }

    // Designer: use frameSkills from database
    if (face === 'designer') {
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
                    {skill.package_level === 'platform' && ' 🔒'}
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
    }

    // Player/Author: use committed shelf entries
    const label = face === 'player' ? 'Characters' : 'World Elements'
    
    return (
      <div className="directory-list">
        <div className="directory-section-label">{label}</div>
        {directoryEntries.length > 0 ? (
          directoryEntries.map(entry => {
            const artifact = parseArtifactFromText(entry.text, face)
            if (!artifact) return null
            
            return (
              <div 
                key={entry.id} 
                className={`directory-item ${face}-item user`}
                onClick={() => handleShelfEntryClick(entry)}
              >
                <div className="dir-item-header">
                  <span className="dir-item-name">{artifact.name}</span>
                  <span className="dir-item-level user">user</span>
                </div>
                <div className="dir-item-meta">
                  <span className="dir-item-type">{artifact.type}</span>
                </div>
              </div>
            )
          })
        ) : (
          <div className="directory-empty">
            No {label.toLowerCase()} created yet.
            <br />
            Use [?] to create one, or type a {face === 'player' ? 'CHARACTER_CREATE' : 'WORLD_CREATE'} document.
          </div>
        )}
      </div>
    )
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
          {/* Presence indicator */}
          <div className="presence-indicator">
            {frameId && (
              <>
                <span 
                  className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}
                  title={isConnected ? 'Connected' : channelError || 'Disconnected'}
                >
                  ●
                </span>
                {presentUsers.length > 0 && (
                  <span className="presence-count" title={presentUsers.map(u => `${u.name} (${u.face})`).join(', ')}>
                    +{presentUsers.length}
                  </span>
                )}
              </>
            )}
          </div>
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
          <div className="visibility-section name-section">
            <span className="visibility-label">Name:</span>
            {showNameEdit ? (
              <div className="name-edit">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                  autoFocus
                />
                <button onClick={handleNameSubmit}>✓</button>
                <button onClick={() => setShowNameEdit(false)}>✕</button>
              </div>
            ) : (
              <button 
                className="name-display"
                onClick={() => {
                  setEditingName(userName)
                  setShowNameEdit(true)
                }}
              >
                {userName}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Others in frame */}
      {frameId && presentUsers.length > 0 && (
        <div className="presence-bar">
          {presentUsers.map(user => (
            <span key={user.id} className={`presence-user ${user.face}`}>
              <span className="presence-face">[{user.face.charAt(0).toUpperCase()}]</span>
              <span className="presence-name">{user.name}</span>
              {user.isTyping && <span className="presence-typing">...</span>}
            </span>
          ))}
        </div>
      )}

      <main className="main">
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
              solidEntries.length > 0 ? (
                solidEntries.map(entry => (
                  <div key={entry.id} className={`solid-entry ${entry.error ? 'error' : ''}`}>
                    <div className="entry-header">
                      <span className="face-badge">{entry.face}</span>
                      {entry.frameId && <span className="frame-badge">test-frame</span>}
                      <span className="state-badge committed">committed</span>
                      {entry.artifactName && (
                        <span className="artifact-badge">{entry.artifactName}</span>
                      )}
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
              renderDirectory()
            )}
          </section>
        )}

        {visibility.showLiquid && (
          <section className="liquid-area">
            <div className="area-header">
              <span className="area-label">o Liquid</span>
              <span className="area-hint">Editable intentions</span>
            </div>
            {liquidEntries.length > 0 ? (
              liquidEntries.map(entry => (
                <div key={entry.id} className={`liquid-entry ${entry.isEditing ? 'editing' : ''} ${entry.state === 'committed' ? 'committed' : ''}`}>
                  <div className="entry-header">
                    <span className="face-badge">{entry.face}</span>
                    {entry.artifactName && (
                      <span className="artifact-badge">{entry.artifactName}</span>
                    )}
                    <span className={`state-badge ${entry.isEditing ? 'editing' : entry.state}`}>
                      {entry.isEditing ? 'editing' : entry.state}
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
                    disabled={isLoading || entry.state === 'committed'}
                    readOnly={entry.state === 'committed'}
                  />
                  {entry.state === 'committed' && entry.response && (
                    <div className="liquid-response">{entry.response}</div>
                  )}
                  {entry.state === 'submitted' && (
                    <div className="entry-actions">
                      <button
                        className="commit-entry-btn"
                        onClick={() => handleCommitEntry(entry.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? '...' : 'Commit'}
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-hint">
                Type below and submit to create an entry
              </div>
            )}
          </section>
        )}

        {visibility.showVapor && (
          <section className="vapor-area">
            <div className="area-header">
              <span className="area-label">~ Vapor</span>
              <span className="area-hint">Live + Soft-LLM</span>
            </div>
            
            {/* Others' typing indicators */}
            {presentUsers.filter(u => u.isTyping).map(user => (
              <div key={user.id} className="vapor-indicator other">
                <span className="typing-dot">*</span>
                <span className="vapor-preview">{user.name} is typing...</span>
              </div>
            ))}
            
            {softResponse && (
              <div className={`soft-response ${softResponse.softType}`}>
                <div className="soft-response-header">
                  <span className="face-badge">{softResponse.face}</span>
                  <span className={`soft-label ${softResponse.softType}`}>
                    {softResponse.softType === 'artifact' ? '→ liquid' : 
                     softResponse.softType === 'clarify' ? 'options' : 'refined'}
                  </span>
                  <button 
                    className="soft-action-btn dismiss" 
                    onClick={handleDismissSoftResponse}
                  >
                    x
                  </button>
                </div>
                <div 
                  className={`soft-response-text ${softResponse.softType !== 'artifact' ? 'clickable' : ''}`}
                  onClick={handleVaporClick}
                  title={softResponse.softType !== 'artifact' ? 'Click to use as input' : undefined}
                >
                  {softResponse.text}
                </div>
                {softResponse.softType === 'clarify' && softResponse.options && softResponse.options.length > 0 && (
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
              </div>
            )}
            
            {input.trim() && visibility.shareVapor && !softResponse && (
              <div className="vapor-indicator self">
                <span className="typing-dot">*</span>
                <span className="vapor-preview">typing: "{input.slice(0, 30)}{input.length > 30 ? '...' : ''}"</span>
              </div>
            )}
            
            {!input.trim() && !softResponse && presentUsers.filter(u => u.isTyping).length === 0 && (
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
            : face === 'player'
            ? 'Describe a character or action...'
            : 'Create world content...'}
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
