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
  onDismiss,
  onNavigate,
  onCopyToVapor,
}: LiquidPanelProps) {
  const isEmpty = liquidEntries.length === 0 && othersLiquid.length === 0
  const currentEntry = liquidEntries[currentIndex]
  const totalEntries = liquidEntries.length
  const canGoBack = currentIndex < totalEntries - 1  // older entries
  const canGoForward = currentIndex > 0              // newer entries

  return (
    <section className="liquid-zone">
      {/* User's liquid entry - anchored at TOP */}
      {currentEntry && (
        <div className="liquid-anchored liquid-anchored-top">
          <div 
            className={`liquid-entry self ${currentEntry.state === 'committed' ? 'committed' : ''} ${isLoading ? 'synthesizing' : ''}`}
          >
            <div className="entry-header">
              <FaceIcon face={currentEntry.face} size="sm" />
              {currentEntry.artifactName && (
                <span className="artifact-badge">{currentEntry.artifactName}</span>
              )}
              <span className={`state-dot ${isLoading ? 'synthesizing' : currentEntry.state}`}
                    title={isLoading ? 'Synthesizing...' : currentEntry.state} />
              
              {/* Navigation controls */}
              {totalEntries > 1 && (
                <div className="liquid-nav">
                  <button
                    className="nav-btn"
                    onClick={() => onNavigate('prev')}
                    disabled={!canGoBack}
                    title="Older entry"
                  >
                    ‹
                  </button>
                  <span className="nav-position">{currentIndex + 1}/{totalEntries}</span>
                  <button
                    className="nav-btn"
                    onClick={() => onNavigate('next')}
                    disabled={!canGoForward}
                    title="Newer entry"
                  >
                    ›
                  </button>
                </div>
              )}
              
              <button
                className="dismiss-entry-btn"
                onClick={() => onDismiss(currentEntry.id)}
                title="Dismiss this entry"
                disabled={isLoading}
              >
                ×
              </button>
            </div>
            
            {/* Content row: textarea + commit button */}
            <div className="liquid-content-row">
              <textarea
                className="liquid-text"
                value={currentEntry.text}
                readOnly
                onClick={() => onCopyToVapor(currentEntry.text)}
                title="Click to copy to vapor for editing"
              />
              
              {/* Commit button - inline on the right */}
              {isLoading ? (
                <div className="liquid-action-inline synthesizing-indicator">
                  <span className="synthesizing-spinner">◌</span>
                </div>
              ) : currentEntry.state === 'submitted' ? (
                <button
                  className="liquid-action-inline commit-btn-inline"
                  onClick={() => onCommit(currentEntry.id)}
                  title="Commit to Solid (Cmd+Enter)"
                >
                  ⏺
                </button>
              ) : (
                <div className="liquid-action-inline committed-indicator" title="Committed">
                  ✓
                </div>
              )}
            </div>
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
