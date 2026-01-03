import type { FrameSkill, Face, SolidView } from '../types'
import type { SolidEntry } from '../hooks/useSolidSubscription'
import type { ShelfEntry } from '../types'
import { parseArtifactFromText } from '../utils/parsing'
import { FaceIcon } from './FaceIcon'

interface SolidPanelProps {
  solidView: SolidView
  onViewChange: (view: SolidView) => void
  solidEntries: SolidEntry[]  // From database
  frameSkills: FrameSkill[]
  directoryEntries: ShelfEntry[]
  face: Face
  frameId: string | null
  isLoadingDirectory: boolean
  isSynthesizing: boolean  // NEW: shows spinner during Medium-LLM processing
  showMeta: boolean
  onSkillClick: (skill: FrameSkill) => void
  onEntryClick: (entry: ShelfEntry) => void
}

export function SolidPanel({
  solidView,
  onViewChange,
  solidEntries,
  frameSkills,
  directoryEntries,
  face,
  frameId,
  isLoadingDirectory,
  isSynthesizing,
  showMeta,
  onSkillClick,
  onEntryClick,
}: SolidPanelProps) {
  return (
    <section className="solid-zone">
      <div className="zone-header">
        <span className="zone-label">
          # Solid
          {isSynthesizing && <span className="synthesizing-spinner" title="Synthesizing..."> ◌</span>}
        </span>
        <div className="solid-view-toggle">
          <button 
            className={`view-btn ${solidView === 'log' ? 'active' : ''}`}
            onClick={() => onViewChange('log')}
          >
            log
          </button>
          <button 
            className={`view-btn ${solidView === 'dir' ? 'active' : ''}`}
            onClick={() => onViewChange('dir')}
          >
            dir
          </button>
        </div>
      </div>
      
      <div className="solid-scroll-area">
        {solidView === 'log' ? (
          <LogView entries={solidEntries} face={face} showMeta={showMeta} />
        ) : (
          <DirectoryView
            face={face}
            frameId={frameId}
            frameSkills={frameSkills}
            directoryEntries={directoryEntries}
            isLoading={isLoadingDirectory}
            onSkillClick={onSkillClick}
            onEntryClick={onEntryClick}
          />
        )}
      </div>
    </section>
  )
}

// Log view - shows narrative from solid table
function LogView({ entries, face, showMeta }: { entries: SolidEntry[], face: Face, showMeta: boolean }) {
  // Filter to current face
  const faceEntries = entries.filter(e => e.face === face)
  
  if (faceEntries.length === 0) {
    return (
      <div className="empty-state">
        No committed results yet. Submit and commit to generate.
      </div>
    )
  }

  return (
    <>
      {faceEntries.map(entry => (
        <div key={entry.id} className="solid-entry">
          <div className="entry-header">
            <FaceIcon face={entry.face as Face} size="sm" />
            <span className="state-dot committed" title="Committed" />
            <span className="timestamp">{new Date(entry.createdAt).toLocaleTimeString()}</span>
          </div>
          <div className="entry-response">{entry.narrative || '[No narrative]'}</div>
          {showMeta && entry.participantUserIds.length > 0 && (
            <div className="skills-meta">
              Participants: {entry.participantUserIds.length}
            </div>
          )}
        </div>
      ))}
    </>
  )
}

// Directory view subcomponent
function DirectoryView({
  face,
  frameId,
  frameSkills,
  directoryEntries,
  isLoading,
  onSkillClick,
  onEntryClick,
}: {
  face: Face
  frameId: string | null
  frameSkills: FrameSkill[]
  directoryEntries: ShelfEntry[]
  isLoading: boolean
  onSkillClick: (skill: FrameSkill) => void
  onEntryClick: (entry: ShelfEntry) => void
}) {
  if (isLoading && face === 'designer') {
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
              onClick={() => onSkillClick(skill)}
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

  // Character/Author: use committed shelf entries
  const label = face === 'character' ? 'Characters' : 'World Elements'
  
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
              onClick={() => onEntryClick(entry)}
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
          Use [⚡] to create one, or type a {face === 'character' ? 'CHARACTER_CREATE' : 'WORLD_CREATE'} document.
        </div>
      )}
    </div>
  )
}
