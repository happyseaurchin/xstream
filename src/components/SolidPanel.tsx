import type { ShelfEntry, FrameSkill, Face, SolidView } from '../types'
import { parseArtifactFromText } from '../utils/parsing'

interface SolidPanelProps {
  solidView: SolidView
  onViewChange: (view: SolidView) => void
  solidEntries: ShelfEntry[]
  frameSkills: FrameSkill[]
  directoryEntries: ShelfEntry[]
  face: Face
  frameId: string | null
  isLoadingDirectory: boolean
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
  showMeta,
  onSkillClick,
  onEntryClick,
}: SolidPanelProps) {
  return (
    <section className="synthesis-area">
      <div className="area-header">
        <span className="area-label"># Solid</span>
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
      
      {solidView === 'log' ? (
        <LogView entries={solidEntries} showMeta={showMeta} />
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
    </section>
  )
}

// Log view subcomponent
function LogView({ entries, showMeta }: { entries: ShelfEntry[], showMeta: boolean }) {
  if (entries.length === 0) {
    return (
      <div className="empty-state">
        No committed results yet. Submit and commit to generate.
      </div>
    )
  }

  return (
    <>
      {entries.map(entry => (
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
          <div className="entry-input">
            "{entry.text.slice(0, 100)}{entry.text.length > 100 ? '...' : ''}"
          </div>
          <div className="entry-response">{entry.response}</div>
          {showMeta && entry.skillsUsed && entry.skillsUsed.length > 0 && (
            <div className="skills-meta">
              Skills: {entry.skillsUsed.map(s => s.name).join(', ')}
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
          Use [?] to create one, or type a {face === 'player' ? 'CHARACTER_CREATE' : 'WORLD_CREATE'} document.
        </div>
      )}
    </div>
  )
}
