import type { FrameSkill, Face, SolidView } from '../types'
import type { SolidEntry } from '../hooks/useSolidSubscription'
import type { ContentEntry, CharacterEntry } from '../hooks/useContentSubscription'
import { FaceIcon } from './FaceIcon'

interface SolidPanelProps {
  solidView: SolidView
  onViewChange: (view: SolidView) => void
  solidEntries: SolidEntry[]  // From database - narrative log
  frameSkills: FrameSkill[]   // Designer directory
  contentEntries: ContentEntry[]    // Author directory - from content table
  characterEntries: CharacterEntry[] // Character directory - from characters table
  face: Face
  frameId: string | null
  isLoadingDirectory: boolean
  showMeta: boolean
  onSkillClick: (skill: FrameSkill) => void
  onContentClick: (content: ContentEntry) => void
  onCharacterClick: (character: CharacterEntry) => void
}

export function SolidPanel({
  solidView,
  onViewChange,
  solidEntries,
  frameSkills,
  contentEntries,
  characterEntries,
  face,
  frameId,
  isLoadingDirectory,
  showMeta,
  onSkillClick,
  onContentClick,
  onCharacterClick,
}: SolidPanelProps) {
  return (
    <section className="solid-zone">
      <div className="zone-header">
        <span className="zone-label"># Solid</span>
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
            contentEntries={contentEntries}
            characterEntries={characterEntries}
            isLoading={isLoadingDirectory}
            onSkillClick={onSkillClick}
            onContentClick={onContentClick}
            onCharacterClick={onCharacterClick}
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
      {faceEntries.map(entry => {
        // Phase 0.10.3: Show spinner for entries where narrative is null (synthesizing)
        const isSynthesizing = entry.narrative === null
        
        return (
          <div key={entry.id} className={`solid-entry ${isSynthesizing ? 'synthesizing' : ''}`}>
            <div className="entry-header">
              <FaceIcon face={entry.face as Face} size="sm" />
              <span className={`state-dot ${isSynthesizing ? 'synthesizing' : 'committed'}`} title={isSynthesizing ? 'Synthesizing...' : 'Committed'} />
              <span className="timestamp">{new Date(entry.createdAt).toLocaleTimeString()}</span>
            </div>
            {isSynthesizing ? (
              <div className="entry-response synthesizing-placeholder">
                <span className="synthesizing-spinner">◌</span>
                <span className="synthesizing-text">Synthesizing...</span>
              </div>
            ) : (
              <div className="entry-response">{entry.narrative || '[No narrative]'}</div>
            )}
            {showMeta && entry.participantUserIds.length > 0 && (
              <div className="skills-meta">
                Participants: {entry.participantUserIds.length}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

// Directory view subcomponent
// Phase 0.10.3.2: Now queries database tables instead of local React state
function DirectoryView({
  face,
  frameId,
  frameSkills,
  contentEntries,
  characterEntries,
  isLoading,
  onSkillClick,
  onContentClick,
  onCharacterClick,
}: {
  face: Face
  frameId: string | null
  frameSkills: FrameSkill[]
  contentEntries: ContentEntry[]
  characterEntries: CharacterEntry[]
  isLoading: boolean
  onSkillClick: (skill: FrameSkill) => void
  onContentClick: (content: ContentEntry) => void
  onCharacterClick: (character: CharacterEntry) => void
}) {
  if (isLoading) {
    return <div className="directory-loading">Loading...</div>
  }

  // Designer: show skills from database
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

  // Character face: show characters from database
  if (face === 'character') {
    return (
      <div className="directory-list">
        <div className="directory-section-label">Characters</div>
        {characterEntries.length > 0 ? (
          characterEntries.map(char => (
            <div 
              key={char.id} 
              className="directory-item character-item user"
              onClick={() => onCharacterClick(char)}
            >
              <div className="dir-item-header">
                <span className="dir-item-name">{char.name}</span>
                <span className="dir-item-level user">
                  {char.isNpc ? 'NPC' : 'PC'}
                </span>
              </div>
              <div className="dir-item-meta">
                <span className="dir-item-type">
                  {char.inhabitedBy ? '● inhabited' : '○ available'}
                </span>
                {char.description && (
                  <span className="dir-item-desc" title={char.description}>
                    {char.description.slice(0, 40)}{char.description.length > 40 ? '...' : ''}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="directory-empty">
            No characters in this cosmology yet.
            <br />
            Switch to Author face to create characters.
          </div>
        )}
      </div>
    )
  }

  // Author face: show all content from database (locations, items, lore, etc.)
  return (
    <div className="directory-list">
      <div className="directory-section-label">World Content</div>
      {contentEntries.length > 0 ? (
        contentEntries.map(content => (
          <div 
            key={content.id} 
            className="directory-item author-item user"
            onClick={() => onContentClick(content)}
          >
            <div className="dir-item-header">
              <span className="dir-item-name">{content.name}</span>
              <span className="dir-item-level user">{content.contentType}</span>
            </div>
            <div className="dir-item-meta">
              <span className="dir-item-type">
                {new Date(content.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))
      ) : (
        <div className="directory-empty">
          No world content created yet.
          <br />
          Describe locations, items, or lore to populate the directory.
        </div>
      )}
    </div>
  )
}
