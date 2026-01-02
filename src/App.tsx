import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from './hooks/useAuth'
import { useCharacters } from './hooks/useCharacters'
import { useFrameChannel, getDisplayName, setDisplayName } from './hooks/useFrameChannel'
import { useLiquidSubscription } from './hooks/useLiquidSubscription'
import { useSolidSubscription } from './hooks/useSolidSubscription'
import {
  AuthPage,
  CharacterCreation,
  ConstructionButton,
  PresenceBar,
  VisibilityPanel,
  VaporPanel,
  LiquidPanel,
  SolidPanel,
  DraggableSeparator,
} from './components'
import type { VaporPanelHandle } from './components/VaporPanel'
import type {
  Face,
  TextState,
  LLMMode,
  SolidView,
  SoftType,
  Frame,
  VisibilitySettings,
  FrameSkill,
  ShelfEntry,
  SoftLLMResponse,
  ZoneProportions,
} from './types'
import { parseInputTypography, parseArtifactFromText } from './utils/parsing'
import './App.css'

// Config
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const GENERATE_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/generate-v2` : null
const EDIT_DEBOUNCE_MS = 500

// Zone proportion defaults and constraints
const DEFAULT_PROPORTIONS: ZoneProportions = { solid: 40, liquid: 30, vapour: 30 }
const MIN_ZONE_HEIGHT = 60 // pixels
const ZONE_STORAGE_KEY = 'xstream-zone-proportions'

// Load zone proportions from localStorage
function loadZoneProportions(): ZoneProportions {
  try {
    const stored = localStorage.getItem(ZONE_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.solid && parsed.liquid && parsed.vapour) {
        return parsed
      }
    }
  } catch (e) {
    console.warn('[Zones] Failed to load proportions:', e)
  }
  return DEFAULT_PROPORTIONS
}

// Save zone proportions to localStorage
function saveZoneProportions(proportions: ZoneProportions): void {
  try {
    localStorage.setItem(ZONE_STORAGE_KEY, JSON.stringify(proportions))
  } catch (e) {
    console.warn('[Zones] Failed to save proportions:', e)
  }
}

// Available frames
const FRAMES: Frame[] = [
  { id: null, name: 'None (platform defaults)', xyz: 'X0Y0Z0' },
  { id: 'bbbbbbbb-0000-0000-0000-000000000001', name: 'test-frame', xyz: 'X0Y0Z0' },
]

function App() {
  // Auth hook - must be first
  const auth = useAuth()
  
  // Core state - use auth user when available
  const userId = auth.user?.id ?? ''
  const [userName, setUserName] = useState<string>(() => auth.profile?.displayName ?? getDisplayName())
  const [face, setFace] = useState<Face>(() => (auth.profile?.defaultFace as Face) ?? 'character')
  const [frameId, setFrameId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [entries, setEntries] = useState<ShelfEntry[]>([])
  
  // Character management (Phase 0.9.2)
  const characters = useCharacters(userId || null)
  const [showCharacterCreation, setShowCharacterCreation] = useState(false)
  
  // Zone proportions (Phase 0.9.0)
  const [zoneProportions, setZoneProportions] = useState<ZoneProportions>(loadZoneProportions)
  const mainRef = useRef<HTMLElement>(null)
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false)
  const [isQuerying, setIsQuerying] = useState(false)
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false)
  
  // UI state
  const [showMeta, setShowMeta] = useState(false)
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false)
  const [solidView, setSolidView] = useState<SolidView>('log')
  const [frameSkills, setFrameSkills] = useState<FrameSkill[]>([])
  const [softResponse, setSoftResponse] = useState<SoftLLMResponse | null>(null)
  
  const [visibility, setVisibility] = useState<VisibilitySettings>({
    shareVapor: true,
    shareLiquid: true,
    showVapor: true,
    showLiquid: true,
    showSolid: true,
  })

  const debounceTimerRef = useRef<number | null>(null)
  const vaporPanelRef = useRef<VaporPanelHandle>(null)

  // Sync userName with profile
  useEffect(() => {
    if (auth.profile?.displayName) {
      setUserName(auth.profile.displayName)
      setDisplayName(auth.profile.displayName)
    }
  }, [auth.profile?.displayName])

  // Hooks - only active when authenticated
  const { 
    presentUsers, 
    isConnected, 
    othersVapor,
    broadcastVapor, 
    error: channelError 
  } = useFrameChannel({ frameId, userId, userName, face })

  const {
    liquidEntries: dbLiquidEntries,
    upsertLiquid,
    commitLiquid,
    deleteLiquid,
  } = useLiquidSubscription({ frameId, userId })

  // Solid entries from database
  const { solidEntries: dbSolidEntries } = useSolidSubscription({ frameId })

  // Derived state
  const currentFrame = FRAMES.find(f => f.id === frameId) || FRAMES[0]
  
  // LIQUID: Show the most recent entry for this face
  const myLiquidEntry = entries
    .filter(e => e.face === face)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
  const liquidEntries = myLiquidEntry ? [myLiquidEntry] : []
  
  // OTHERS' LIQUID: One entry per other user
  const othersLiquidRaw = dbLiquidEntries.filter(e => e.userId !== userId && e.face === face)
  const othersLiquid = Object.values(
    othersLiquidRaw.reduce((acc, entry) => {
      const existing = acc[entry.userId]
      if (!existing || new Date(entry.updatedAt) > new Date(existing.updatedAt)) {
        acc[entry.userId] = entry
      }
      return acc
    }, {} as Record<string, typeof othersLiquidRaw[0]>)
  )
  
  const directoryEntries = entries.filter(e => {
    if (e.state !== 'committed' || e.face !== face || face === 'designer') return false
    return parseArtifactFromText(e.text, face) !== null
  })
  const hasVaporOrLiquid = !!(input.trim() || softResponse || liquidEntries.length > 0)

  // Zone drag handlers
  const handleTopSeparatorDrag = useCallback((delta: number) => {
    if (!mainRef.current) return
    const totalHeight = mainRef.current.clientHeight
    const deltaPercent = (delta / totalHeight) * 100
    
    setZoneProportions(prev => {
      const newSolid = Math.max(MIN_ZONE_HEIGHT / totalHeight * 100, 
                                Math.min(prev.solid + deltaPercent, 100 - 2 * MIN_ZONE_HEIGHT / totalHeight * 100))
      const newLiquid = Math.max(MIN_ZONE_HEIGHT / totalHeight * 100,
                                 Math.min(prev.liquid - deltaPercent, 100 - newSolid - MIN_ZONE_HEIGHT / totalHeight * 100))
      const newVapour = 100 - newSolid - newLiquid
      
      const result = { solid: newSolid, liquid: newLiquid, vapour: newVapour }
      saveZoneProportions(result)
      return result
    })
  }, [])

  const handleBottomSeparatorDrag = useCallback((delta: number) => {
    if (!mainRef.current) return
    const totalHeight = mainRef.current.clientHeight
    const deltaPercent = (delta / totalHeight) * 100
    
    setZoneProportions(prev => {
      const newLiquid = Math.max(MIN_ZONE_HEIGHT / totalHeight * 100,
                                 Math.min(prev.liquid + deltaPercent, 100 - prev.solid - MIN_ZONE_HEIGHT / totalHeight * 100))
      const newVapour = Math.max(MIN_ZONE_HEIGHT / totalHeight * 100,
                                 100 - prev.solid - newLiquid)
      
      const result = { solid: prev.solid, liquid: newLiquid, vapour: newVapour }
      saveZoneProportions(result)
      return result
    })
  }, [])

  // Helper: Replace the current active entry for a face
  const replaceActiveEntry = useCallback((newEntry: ShelfEntry, targetFace: Face) => {
    setEntries(prev => {
      const sorted = [...prev]
        .filter(e => e.face === targetFace)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      const activeEntry = sorted[0]
      
      const filtered = prev.filter(e => {
        if (e.face !== targetFace) return true
        if (e.state === 'committed' && e.response && e.id !== activeEntry?.id) return true
        if (e.id === activeEntry?.id && e.state === 'committed' && e.response) return true
        if (e.id === activeEntry?.id) return false
        return true
      })
      return [...filtered, newEntry]
    })
  }, [])

  // Effects
  useEffect(() => {
    if (visibility.shareVapor) {
      broadcastVapor(input)
    } else {
      broadcastVapor('')
    }
  }, [input, broadcastVapor, visibility.shareVapor])

  useEffect(() => {
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current) }
  }, [])

  useEffect(() => {
    if (solidView === 'dir' && face === 'designer') loadFrameSkills()
  }, [solidView, frameId, face])

  // API calls
  const loadFrameSkills = async () => {
    if (!GENERATE_URL || !SUPABASE_ANON_KEY) return
    setIsLoadingDirectory(true)
    try {
      const res = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ action: 'list_frame_skills', frame_id: frameId }),
      })
      const data = await res.json()
      if (data.success && data.skills) setFrameSkills(data.skills)
    } catch (error) {
      console.error('Error loading frame skills:', error)
    } finally {
      setIsLoadingDirectory(false)
    }
  }

  // Phase 0.7: Generate response using Medium-LLM synthesis
  const generateResponse = async (entry: ShelfEntry) => {
    setIsLoading(true)
    try {
      if (!GENERATE_URL || !SUPABASE_ANON_KEY) {
        const response = `[Supabase not configured]\n\nYour input (${entry.face}): ${entry.text}`
        setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, response } : e))
        return
      }

      let createdSkill = null

      if (entry.frameId) {
        console.log('[App] Committing to liquid for medium mode synthesis')
        const liquidId = await commitLiquid({
          userName,
          face: entry.face,
          content: entry.text,
        })

        if (!liquidId) throw new Error('Failed to commit to liquid table')
        console.log('[App] Got liquid_id:', liquidId)

        const res = await fetch(GENERATE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ mode: 'medium' as LLMMode, liquid_id: liquidId }),
        })
        const data = await res.json()

        if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)

        setEntries(prev => prev.map(e => 
          e.id === entry.id ? { ...e, response: '[Stored in solid]' } : e
        ))

        if (data.result?.skillData) createdSkill = data.result.skillData

        console.log('[App] Medium mode synthesis complete:', {
          solidId: data.stored?.solidId,
          contentId: data.stored?.contentId,
          skillId: data.stored?.skillId,
        })

      } else {
        const res = await fetch(GENERATE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ text: entry.text, face: entry.face, frame_id: null, user_id: userId }),
        })
        const data = await res.json()

        if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)

        setEntries(prev => prev.map(e => 
          e.id === entry.id ? { ...e, response: data.text, createdSkill: data.created_skill } : e
        ))
      }

      if (createdSkill && solidView === 'dir') loadFrameSkills()

    } catch (error) {
      console.error('Generation error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setEntries(prev => prev.map(e => 
        e.id === entry.id ? { ...e, error: errorMsg, response: `[Error: ${errorMsg}]` } : e
      ))
    } finally {
      setIsLoading(false)
    }
  }

  // Core query function
  const executeQuery = async (textToSend: string, currentFace: Face, currentFrameId: string | null) => {
    if (!GENERATE_URL || !SUPABASE_ANON_KEY) {
      setSoftResponse({ id: crypto.randomUUID(), originalInput: textToSend, text: `[Soft-LLM would process: "${textToSend}"]`, softType: 'refine', face: currentFace, frameId: currentFrameId })
      return
    }

    const res = await fetch(GENERATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ text: textToSend, face: currentFace, frame_id: currentFrameId, user_id: userId, user_name: userName, mode: 'soft' as LLMMode }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)

    const softType: SoftType = data.soft_type || 'refine'
    
    if (softType === 'artifact' && data.document) {
      const artifact = parseArtifactFromText(data.document, currentFace)
      const newEntry: ShelfEntry = { 
        id: crypto.randomUUID(), 
        text: data.document, 
        face: currentFace, 
        frameId: currentFrameId, 
        state: 'submitted', 
        timestamp: new Date().toISOString(), 
        artifactName: artifact?.name, 
        artifactType: artifact?.type 
      }
      replaceActiveEntry(newEntry, currentFace)
      setSoftResponse(null)
    } else if (softType === 'action') {
      const newEntry: ShelfEntry = { 
        id: crypto.randomUUID(), 
        text: data.text, 
        face: currentFace, 
        frameId: currentFrameId, 
        state: 'submitted', 
        timestamp: new Date().toISOString()
      }
      replaceActiveEntry(newEntry, currentFace)
      setInput('')
      setSoftResponse(null)
      if (currentFrameId && visibility.shareLiquid) upsertLiquid({ userName, face: currentFace, content: data.text })
    } else if (softType === 'info') {
      setSoftResponse({ id: crypto.randomUUID(), originalInput: textToSend, text: data.text, softType: 'info', face: currentFace, frameId: currentFrameId })
      setInput('')
    } else {
      setSoftResponse({ id: crypto.randomUUID(), originalInput: textToSend, text: data.text, softType, options: data.options, face: currentFace, frameId: currentFrameId })
    }
  }

  // Handlers
  const handleShelfEntryClick = (entry: ShelfEntry) => {
    const newEntry: ShelfEntry = { 
      id: crypto.randomUUID(), 
      text: entry.text, 
      face: entry.face, 
      frameId, 
      state: 'submitted', 
      timestamp: new Date().toISOString() 
    }
    replaceActiveEntry(newEntry, entry.face)
    setSolidView('log')
  }

  const handleSkillClick = (skill: FrameSkill) => {
    const document = `SKILL_CREATE\nname: ${skill.name}\ncategory: ${skill.category}\napplies_to: ${skill.applies_to.join(', ')}\ncontent: |\n${skill.content.split('\n').map(line => '  ' + line).join('\n')}`
    const newEntry: ShelfEntry = { 
      id: crypto.randomUUID(), 
      text: document, 
      face: 'designer', 
      frameId, 
      state: 'submitted', 
      timestamp: new Date().toISOString() 
    }
    replaceActiveEntry(newEntry, 'designer')
    setSolidView('log')
  }

  const handleLiquidEdit = useCallback((entryId: string, newText: string) => {
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, text: newText, isEditing: true } : e))
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = window.setTimeout(() => {
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, isEditing: false } : e))
    }, EDIT_DEBOUNCE_MS)
  }, [])

  const handleQuery = async () => {
    if (!input.trim()) return
    const parsed = parseInputTypography(input)
    
    if (parsed.route === 'liquid') { handleSubmitDirect(parsed.text); return }
    if (parsed.route === 'solid') { handleCommitDirect(parsed.text); return }
    
    const textToSend = parsed.text
    const currentFace = face
    const currentFrameId = frameId
    
    setIsQuerying(true)
    setTimeout(() => vaporPanelRef.current?.focus(), 10)
    
    try {
      await executeQuery(textToSend, currentFace, currentFrameId)
    } catch (error) {
      console.error('Soft-LLM query error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setSoftResponse({ id: crypto.randomUUID(), originalInput: textToSend, text: `[Error: ${errorMsg}]`, softType: 'refine', face: currentFace, frameId: currentFrameId })
    } finally {
      setIsQuerying(false)
    }
  }

  const handleDismissSoftResponse = () => {
    setSoftResponse(null)
    setTimeout(() => vaporPanelRef.current?.focus(), 10)
  }

  const handleSubmitDirect = (text: string) => {
    if (!text.trim()) return
    const artifact = parseArtifactFromText(text, face)
    const newEntry: ShelfEntry = { 
      id: crypto.randomUUID(), 
      text: text.trim(), 
      face, 
      frameId, 
      state: 'submitted', 
      timestamp: new Date().toISOString(), 
      artifactName: artifact?.name, 
      artifactType: artifact?.type 
    }
    replaceActiveEntry(newEntry, face)
    setInput('')
    if (frameId && visibility.shareLiquid) upsertLiquid({ userName, face, content: text.trim() })
  }

  const handleSubmit = () => {
    if (!input.trim()) return
    const parsed = parseInputTypography(input)
    if (parsed.route === 'solid') { handleCommitDirect(parsed.text); return }
    handleSubmitDirect(parsed.text)
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
      artifactType: artifact?.type 
    }
    setInput('')
    replaceActiveEntry(entry, face)
    await generateResponse(entry)
  }

  const handleCommitEntry = async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId)
    if (!entry) return
    
    const artifact = parseArtifactFromText(entry.text, entry.face)
    setEntries(prev => prev.map(e => 
      e.id === entryId ? { ...e, state: 'committed' as TextState, isEditing: false, artifactName: artifact?.name, artifactType: artifact?.type } : e
    ))
    await generateResponse(entry)
  }

  const handleCommit = async () => {
    if (input.trim()) {
      const parsed = parseInputTypography(input)
      await handleCommitDirect(parsed.text)
      return
    }
    const currentLiquid = liquidEntries[0]
    if (currentLiquid && currentLiquid.state === 'submitted') {
      await handleCommitEntry(currentLiquid.id)
    }
  }

  const handleClear = () => {
    setInput('')
    setSoftResponse(null)
    setEntries(prev => {
      const sorted = [...prev]
        .filter(e => e.face === face)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      const activeEntry = sorted[0]
      
      return prev.filter(e => {
        if (e.face !== face) return true
        if (e.state === 'committed' && e.response && e.id !== activeEntry?.id) return true
        if (e.id === activeEntry?.id) return false
        return true
      })
    })
    if (frameId) {
      deleteLiquid()
      broadcastVapor('')
    }
  }

  const handleNameChange = (name: string) => {
    setDisplayName(name)
    setUserName(name)
    // Also update profile if authenticated
    if (auth.user) {
      auth.updateProfile({ displayName: name })
    }
  }

  const handleSelectOption = async (opt: string) => {
    setSoftResponse(null)
    setIsQuerying(true)
    
    try {
      await executeQuery(opt, face, frameId)
    } catch (error) {
      console.error('Option execution error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setSoftResponse({ id: crypto.randomUUID(), originalInput: opt, text: `[Error: ${errorMsg}]`, softType: 'refine', face, frameId })
    } finally {
      setIsQuerying(false)
    }
  }

  // Show loading while checking auth
  if (auth.isLoading) {
    return (
      <div className="app loading-screen">
        <div className="loading-text">Loading...</div>
      </div>
    )
  }

  // Show auth page if not logged in
  if (!auth.user) {
    return <AuthPage auth={auth} />
  }

  // Show character creation if in character face with no character
  if (face === 'character' && !characters.isLoading && !characters.myCharacter && !showCharacterCreation) {
    // Prompt to create character
    return (
      <CharacterCreation 
        characters={characters} 
        onComplete={() => setShowCharacterCreation(false)}
      />
    )
  }

  // Show character creation modal if requested
  if (showCharacterCreation) {
    return (
      <CharacterCreation 
        characters={characters} 
        onComplete={() => setShowCharacterCreation(false)}
        onCancel={() => setShowCharacterCreation(false)}
      />
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="selectors">
          <select value={face} onChange={(e) => setFace(e.target.value as Face)} className="face-selector">
            <option value="character">🎭 {characters.myCharacter?.name || 'Character'}</option>
            <option value="author">📖 Author</option>
            <option value="designer">⚙️ Designer</option>
          </select>
          <select value={frameId || ''} onChange={(e) => setFrameId(e.target.value || null)} className="frame-selector">
            {FRAMES.map(f => <option key={f.id || 'none'} value={f.id || ''}>{f.name}</option>)}
          </select>
        </div>
        <div className="header-controls">
          <div className="presence-indicator">
            {frameId && (
              <>
                <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`} title={isConnected ? 'Connected' : channelError || 'Disconnected'}>●</span>
                {presentUsers.length > 0 && <span className="presence-count" title={presentUsers.map(u => `${u.name} (${u.face})`).join(', ')}>+{presentUsers.length}</span>}
              </>
            )}
          </div>
          <span className="xyz-badge">{currentFrame.xyz}</span>
          {face === 'character' && (
            <button 
              className="new-character-btn" 
              onClick={() => setShowCharacterCreation(true)} 
              title="Create new character"
            >
              +🎭
            </button>
          )}
          <button className={`visibility-toggle ${showVisibilityPanel ? 'active' : ''}`} onClick={() => setShowVisibilityPanel(!showVisibilityPanel)} title="Visibility settings">⚙</button>
          <button className="meta-toggle" onClick={() => setShowMeta(!showMeta)} title="Toggle skill metadata">{showMeta ? '◉' : '○'}</button>
          <button className="logout-btn" onClick={() => auth.signOut()} title={`Signed in as ${userName}`}>↪</button>
        </div>
      </header>

      {showVisibilityPanel && (
        <VisibilityPanel
          visibility={visibility}
          onToggle={(key) => setVisibility(prev => ({ ...prev, [key]: !prev[key] }))}
          userName={userName}
          onNameChange={handleNameChange}
        />
      )}

      {frameId && <PresenceBar users={presentUsers} />}

      <main className="main" ref={mainRef}>
        {visibility.showSolid && (
          <div className="zone-wrapper" style={{ flex: `0 0 ${zoneProportions.solid}%` }}>
            <SolidPanel
              solidView={solidView}
              onViewChange={setSolidView}
              solidEntries={dbSolidEntries}
              frameSkills={frameSkills}
              directoryEntries={directoryEntries}
              face={face}
              frameId={frameId}
              isLoadingDirectory={isLoadingDirectory}
              showMeta={showMeta}
              onSkillClick={handleSkillClick}
              onEntryClick={handleShelfEntryClick}
            />
          </div>
        )}

        {visibility.showSolid && visibility.showLiquid && (
          <DraggableSeparator position="top" onDrag={handleTopSeparatorDrag} />
        )}

        {visibility.showLiquid && (
          <div className="zone-wrapper" style={{ flex: `0 0 ${zoneProportions.liquid}%` }}>
            <LiquidPanel
              liquidEntries={liquidEntries}
              othersLiquid={othersLiquid}
              isLoading={isLoading}
              onEdit={handleLiquidEdit}
              onCommit={handleCommitEntry}
              onDismiss={(id) => {
                setEntries(prev => prev.filter(e => e.id !== id))
              }}
            />
          </div>
        )}

        {visibility.showLiquid && visibility.showVapor && (
          <DraggableSeparator position="bottom" onDrag={handleBottomSeparatorDrag} />
        )}

        {visibility.showVapor && (
          <div className="zone-wrapper" style={{ flex: `0 0 ${zoneProportions.vapour}%` }}>
            <VaporPanel
              ref={vaporPanelRef}
              input={input}
              onInputChange={setInput}
              userName={userName}
              face={face}
              othersVapor={othersVapor}
              softResponse={softResponse}
              onDismissSoftResponse={handleDismissSoftResponse}
              onSelectOption={handleSelectOption}
              isLoading={isLoading}
              isQuerying={isQuerying}
              hasVaporOrLiquid={hasVaporOrLiquid}
              onQuery={handleQuery}
              onSubmit={handleSubmit}
              onCommit={handleCommit}
              onClear={handleClear}
            />
          </div>
        )}
      </main>

      <ConstructionButton />
    </div>
  )
}

export default App
