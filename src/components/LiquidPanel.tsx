import type { Face, ShelfEntry } from '../types'
import type { LiquidEntry } from '../hooks/useLiquidSubscription'
import { FaceIcon } from './FaceIcon'

interface LiquidPanelProps {
  liquidEntries: ShelfEntry[]  // All entries for this face, sorted newest first
  currentIndex: number         // Which entry is being viewed (0 = newest)
  othersLiquid: LiquidEntry[]
  isLoading: boolean
  onEdit: (entryId: string, newText: string) => void
  onCommit: (entryId: string) => void
  onDismiss: (entryId: string) => void
  onNavigate: (direction: 'prev' | 'next') => void
  onCopyToVapor: (text: string) => void
}

export function LiquidPanel({
  liquidEntries,
  currentIndex,
  othersLiquid,
  isLoading,
  onEdit: _onEdit,  // keeping for potential future use
  onCommit,
  onDismiss: _onDismiss,  // not used in minimal style
  onNavigate: _onNavigate,  // not used in minimal style
  onCopyToVapor,
}: LiquidPanelProps) {
  const isEmpty = liquidEntries.length === 0 && othersLiquid.length === 0
  const currentEntry = liquidEntries[currentIndex]

  return (
    <section className="liquid-zone">
      {/* User's liquid entry - at TOP, styled same as others */}
      {currentEntry && (
        <div className="liquid-entry self" onClick={() => onCopyToVapor(currentEntry.text)}>
          <div className="entry-header">
            <FaceIcon face={currentEntry.face} size="sm" />
            {currentEntry.artifactName && (
              <span className="artifact-badge">{currentEntry.artifactName}</span>
            )}
            <span className={`state-dot ${isLoading ? 'synthesizing' : 'submitted'}`}
                  title={isLoading ? 'Synthesizing...' : 'Submitted'} />
          </div>
          <div className="liquid-content-row">
            <div className="liquid-text readonly">{currentEntry.text}</div>
            {isLoading ? (
              <span className="liquid-commit-btn synthesizing">◌</span>
            ) : (
              <button
                className="liquid-commit-btn"
                onClick={(e) => { e.stopPropagation(); onCommit(currentEntry.id) }}
                title="Commit to Solid (Cmd+Enter)"
              >
                ⏺
              </button>
            )}
          </div>
        </div>
      )}

      {/* Others' liquid - scrollable area below */}
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
    </section>
  )
}
