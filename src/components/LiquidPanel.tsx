import type { ShelfEntry, Face } from '../types'
import type { LiquidEntry } from '../hooks/useLiquidSubscription'

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
    <section className="liquid-area">
      <div className="area-header">
        <span className="area-label">o Liquid</span>
        <span className="area-hint">Editable intentions</span>
      </div>
      
      {/* Others' liquid from database */}
      {othersLiquid.map(entry => (
        <div key={entry.id} className="liquid-entry other-liquid">
          <div className="entry-header">
            <span className="face-badge">{entry.face}</span>
            <span className="user-badge">{entry.userName}</span>
            <span className={`state-badge ${entry.committed ? 'committed' : 'submitted'}`}>
              {entry.committed ? 'committed' : 'submitted'}
            </span>
          </div>
          <div className="liquid-text readonly">{entry.content}</div>
        </div>
      ))}
      
      {/* Own liquid entries */}
      {liquidEntries.map(entry => (
        <div 
          key={entry.id} 
          className={`liquid-entry ${entry.isEditing ? 'editing' : ''} ${entry.state === 'committed' ? 'committed' : ''}`}
        >
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
              onClick={() => onDismiss(entry.id)}
              title="Dismiss"
            >
              x
            </button>
          </div>
          <textarea
            className="liquid-text"
            value={entry.text}
            onChange={(e) => onEdit(entry.id, e.target.value)}
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
                onClick={() => onCommit(entry.id)}
                disabled={isLoading}
              >
                {isLoading ? '...' : 'Commit'}
              </button>
            </div>
          )}
        </div>
      ))}
      
      {isEmpty && (
        <div className="empty-hint">
          Type below and submit to create an entry
        </div>
      )}
    </section>
  )
}
