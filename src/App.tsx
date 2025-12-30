import { useState, useRef, useEffect, useCallback } from 'react'
import { useFrameChannel, getDisplayName, setDisplayName } from './hooks/useFrameChannel'
import { useLiquidSubscription } from './hooks/useLiquidSubscription'
import {
  ConstructionButton,
  PresenceBar,
  VisibilityPanel,
  InputArea,
  VaporPanel,
  LiquidPanel,
  SolidPanel,
} from './components'
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
} from './types'
import { getUserId, parseInputTypography, parseArtifactFromText } from './utils/parsing'
import './App.css'

// Config
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const GENERATE_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/generate-v2` : null
const EDIT_DEBOUNCE_MS = 500

// Available frames
const FRAMES: Frame[] = [
  { id: null, name: 'None (platform defaults)', xyz: 'X0Y0Z0' },
  { id: 'bbbbbbbb-0000-0000-0000-000000000001', name: 'test-frame', xyz: 'X0Y0Z0' },
]

function App() {
  // Core state
  const [userId] = useState<string>(getUserId)
  const [userName, setUserName] = useState<string>(getDisplayName)
  const [face, setFace] = useState<Face>('player')
  const [frameId, setFrameId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [entries, setEntries] = useState<ShelfEntry[]>([])
  
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

  // Hooks
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
    deleteLiquid,
  } = useLiquidSubscription({ frameId, userId })

  // Derived state
  const currentFrame = FRAMES.find(f => f.id === frameId) || FRAMES[0]
  const liquidEntries = entries.filter(e => e.face === face)
  const solidEntries = entries.filter(e => e.state === 'committed' && e.response && e.face === face)
  const othersLiquid = dbLiquidEntries.filter(e => e.userId !== userId && e.face === face)
  const directoryEntries = entries.filter(e => {
    if (e.state !== 'committed' || e.face !== face || face === 'designer') return false
    return parseArtifactFromText(e.text, face) !== null
  })
  const hasVaporOrLiquid = input.trim() || softResponse || liquidEntries.length > 0

  // Effects
  useEffect(() => {
    if (visibility.shareVapor) broadcastVapor(input)
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

  const generateResponse = async (entry: ShelfEntry) => {
    setIsLoading(true)
    try {
      if (!GENERATE_URL || !SUPABASE_ANON_KEY) {
        const response = `[Supabase not configured]\n\nYour input (${entry.face}): ${entry.text}`
        setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, state: 'committed' as TextState, response } : e))
        return
      }

      const res = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ text: entry.text, face: entry.face, frame_id: entry.frameId, user_id: userId, mode: 'medium' as LLMMode }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)

      const createdSkill = data.created_skill || null
      if (createdSkill && solidView === 'dir') loadFrameSkills()

      setEntries(prev => prev.map(e => 
        e.id === entry.id ? { ...e, state: 'committed' as TextState, response: data.text, skillsUsed: data.metadata?.skills_used || [], createdSkill } : e
      ))
    } catch (error) {
      console.error('Generation error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setEntries(prev => prev.map(e => 
        e.id === entry.id ? { ...e, state: 'committed' as TextState, error: errorMsg, response: `[Error: ${errorMsg}]` } : e
      ))
    } finally {
      setIsLoading(false)
    }
  }

  // Handlers
  const handleShelfEntryClick = (entry: ShelfEntry) => {
    setEntries(prev => [...prev, { id: crypto.randomUUID(), text: entry.text, face: entry.face, frameId, state: 'submitted', timestamp: new Date().toISOString() }])
    setSolidView('log')
  }

  const handleSkillClick = (skill: FrameSkill) => {
    const document = `SKILL_CREATE\nname: ${skill.name}\ncategory: ${skill.category}\napplies_to: ${skill.applies_to.join(', ')}\ncontent: |\n${skill.content.split('\n').map(line => '  ' + line).join('\n')}`
    setEntries(prev => [...prev, { id: crypto.randomUUID(), text: document, face: 'designer', frameId, state: 'submitted', timestamp: new Date().toISOString() }])
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
    
    setIsQuerying(true)
    try {
      if (!GENERATE_URL || !SUPABASE_ANON_KEY) {
        setSoftResponse({ id: crypto.randomUUID(), originalInput: input, text: `[Soft-LLM would refine: "${parsed.text}"]`, softType: 'refine', face, frameId })
        return
      }

      const res = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ text: parsed.text, face, frame_id: frameId, user_id: userId, mode: 'soft' as LLMMode }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)

      const softType: SoftType = data.soft_type || 'refine'
      
      if (softType === 'artifact' && data.document) {
        const artifact = parseArtifactFromText(data.document, face)
        setEntries(prev => [...prev, { id: crypto.randomUUID(), text: data.document, face, frameId, state: 'submitted', timestamp: new Date().toISOString(), artifactName: artifact?.name, artifactType: artifact?.type }])
        setInput('')
        setSoftResponse({ id: crypto.randomUUID(), originalInput: input, text: data.text, softType: 'artifact', face, frameId })
      } else {
        setSoftResponse({ id: crypto.randomUUID(), originalInput: input, text: data.text, softType, options: data.options, face, frameId })
      }
    } catch (error) {
      console.error('Soft-LLM query error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setSoftResponse({ id: crypto.randomUUID(), originalInput: input, text: `[Error: ${errorMsg}]`, softType: 'refine', face, frameId })
    } finally {
      setIsQuerying(false)
    }
  }

  const handleVaporClick = () => {
    if (!softResponse || softResponse.softType === 'artifact') return
    setInput(softResponse.text)
    setSoftResponse(null)
  }

  const handleSubmitDirect = (text: string) => {
    if (!text.trim()) return
    const artifact = parseArtifactFromText(text, face)
    setEntries(prev => [...prev, { id: crypto.randomUUID(), text: text.trim(), face, frameId, state: 'submitted', timestamp: new Date().toISOString(), artifactName: artifact?.name, artifactType: artifact?.type }])
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
    const entry: ShelfEntry = { id: crypto.randomUUID(), text: text.trim(), face, frameId, state: 'committed', timestamp: new Date().toISOString(), artifactName: artifact?.name, artifactType: artifact?.type }
    setInput('')
    setEntries(prev => [...prev, entry])
    if (frameId) deleteLiquid()
    await generateResponse(entry)
  }

  const handleCommitEntry = async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId)
    if (!entry || entry.state !== 'submitted') return
    const artifact = parseArtifactFromText(entry.text, entry.face)
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, state: 'committed' as TextState, isEditing: false, artifactName: artifact?.name, artifactType: artifact?.type } : e))
    if (frameId) deleteLiquid()
    await generateResponse(entry)
  }

  const handleCommit = async () => {
    if (input.trim()) {
      const parsed = parseInputTypography(input)
      await handleCommitDirect(parsed.text)
      return
    }
    const lastLiquid = [...entries].reverse().find(e => e.state === 'submitted')
    if (lastLiquid) await handleCommitEntry(lastLiquid.id)
  }

  const handleClear = () => {
    setInput('')
    setSoftResponse(null)
    setEntries(prev => prev.filter(e => e.face !== face || e.state === 'committed'))
    if (frameId) deleteLiquid()
  }

  const handleNameChange = (name: string) => {
    setDisplayName(name)
    setUserName(name)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="selectors">
          <select value={face} onChange={(e) => setFace(e.target.value as Face)} className="face-selector">
            <option value="player">Player</option>
            <option value="author">Author</option>
            <option value="designer">Designer</option>
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
          <button className={`visibility-toggle ${showVisibilityPanel ? 'active' : ''}`} onClick={() => setShowVisibilityPanel(!showVisibilityPanel)} title="Visibility settings">*</button>
          <button className="meta-toggle" onClick={() => setShowMeta(!showMeta)} title="Toggle skill metadata">{showMeta ? '#' : 'o'}</button>
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

      <main className="main">
        {visibility.showSolid && (
          <SolidPanel
            solidView={solidView}
            onViewChange={setSolidView}
            solidEntries={solidEntries}
            frameSkills={frameSkills}
            directoryEntries={directoryEntries}
            face={face}
            frameId={frameId}
            isLoadingDirectory={isLoadingDirectory}
            showMeta={showMeta}
            onSkillClick={handleSkillClick}
            onEntryClick={handleShelfEntryClick}
          />
        )}

        {visibility.showLiquid && (
          <LiquidPanel
            liquidEntries={liquidEntries}
            othersLiquid={othersLiquid}
            isLoading={isLoading}
            onEdit={handleLiquidEdit}
            onCommit={handleCommitEntry}
            onDismiss={(id) => setEntries(prev => prev.filter(e => e.id !== id))}
          />
        )}

        {visibility.showVapor && (
          <VaporPanel
            othersVapor={othersVapor}
            presentUsers={presentUsers}
            softResponse={softResponse}
            input={input}
            shareVapor={visibility.shareVapor}
            onVaporClick={handleVaporClick}
            onDismissSoftResponse={() => setSoftResponse(null)}
            onSelectOption={(opt) => { setInput(opt); setSoftResponse(null) }}
          />
        )}
      </main>

      <InputArea
        input={input}
        onInputChange={setInput}
        face={face}
        isLoading={isLoading}
        isQuerying={isQuerying}
        hasVaporOrLiquid={hasVaporOrLiquid}
        onQuery={handleQuery}
        onSubmit={handleSubmit}
        onCommit={handleCommit}
        onClear={handleClear}
      />

      <ConstructionButton />
    </div>
  )
}

export default App
