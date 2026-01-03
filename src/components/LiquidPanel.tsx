import type { Face, ShelfEntry } from '../types'
import type { LiquidEntry } from '../hooks/useLiquidSubscription'
import { FaceIcon } from './FaceIcon'

interface LiquidPanelProps {
  liquidEntries: ShelfEntry[]
  othersLiquid: LiquidEntry[]
  isLoading: boolean
  onEdit: (entryId: string, newText: string) => void
  onCommit: (entryId: string) => void
  onDismiss: (entryId: string) => void
}

export function LiquidPanel({
  liquidEntries,
  othersLiquid,
  isLoading,
  onEdit,
  onCommit,
  onDismiss,
}: LiquidPanelProps) {
  const isEmpty = liquidEntries.length === 0 && othersLiquid.length === 0

  return (
    <section className="liquid-zone">
      {/* Scrollable area: Others' liquid */}
      <div className="liquid-scroll-area">
        {othersLiquid.map(entry => (
          <div key={entry.id} className="liquid-entry other-liquid">
            <div className="entry-header">
              <FaceIcon face={entry.face as Face} size="sm" />
              <span className="user-badge">{entry.userName}</span>
              <span className={`state-dot ${entry.committed ? 'committed' : 'submitted'}`} 
                    title={entry.committed ? 'Committed' : 'Submitted'} />
            </div>
            <div className="liquid-text readonly">{entry.content}</div>
          </div>
        ))}
        
        {isEmpty && (
          <div className="empty-hint">
            Type below and submit to create an entry
          </div>
        )}
      </div>

      {/* Anchored: User's liquid entry */}
      {liquidEntries.length > 0 && (
        <div className="liquid-anchored">
          {liquidEntries.map(entry => (
            <div 
              key={entry.id} 
              className={`liquid-entry self ${entry.isEditing ? 'editing' : ''} ${entry.state === 'committed' ? 'committed' : ''}`}
            >
              <div className="entry-header">
                <FaceIcon face={entry.face} size="sm" />
                {entry.artifactName && (
                  <span className="artifact-badge">{entry.artifactName}</span>
                )}
                <span className={`state-dot ${entry.isEditing ? 'editing' : entry.state}`}
                      title={entry.isEditing ? 'Editing' : entry.state} />
                <button
                  className="dismiss-entry-btn"
                  onClick={() => onDismiss(entry.id)}
                  title="Dismiss"
                >
                  ×
                </button>
              </div>
              {/* Textarea: editable when submitted, readonly when committed or loading */}
              <textarea
                className="liquid-text"
                value={entry.text}
                onChange={(e) => onEdit(entry.id, e.target.value)}
                disabled={entry.state === 'committed'}
                readOnly={entry.state === 'committed'}
              />
              {/* Commit button: always visible when submitted, shows processing state */}
              {entry.state === 'submitted' && (
                <div className="entry-actions">
                  <button
                    className={`commit-entry-btn ${isLoading ? 'processing' : ''}`}
                    onClick={() => onCommit(entry.id)}
                    disabled={isLoading}
                    title={isLoading ? 'Processing...' : 'Commit to Solid (Cmd+Enter)'}
                  >
                    {isLoading ? '◌ Synthesizing...' : '⏺ Commit'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
