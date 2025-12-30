import type { SoftLLMResponse } from '../types'

export interface OtherVapor {
  userId: string
  userName: string
  face: string
  text: string
}

interface VaporPanelProps {
  othersVapor: OtherVapor[]
  softResponse: SoftLLMResponse | null
  onVaporClick: () => void
  onDismissSoftResponse: () => void
  onSelectOption: (option: string) => void
}

export function VaporPanel({
  othersVapor,
  softResponse,
  onVaporClick,
  onDismissSoftResponse,
  onSelectOption,
}: VaporPanelProps) {
  // Only show others' vapor when they have actual text
  const activeVapor = othersVapor.filter(v => v.text.length > 0)

  const isEmpty = activeVapor.length === 0 && !softResponse

  return (
    <section className="vapor-area">
      <div className="area-header">
        <span className="area-label">~ Vapor</span>
        <span className="area-hint">Live + Soft-LLM</span>
      </div>
      
      {/* Others' vapor - live character-by-character text */}
      {activeVapor.map(vapor => (
        <div key={vapor.userId} className={`vapor-indicator other ${vapor.face}`}>
          <span className="typing-dot">*</span>
          <span className="vapor-user">{vapor.userName}:</span>
          <span className="vapor-live-text">{vapor.text}<span className="blinking-cursor">|</span></span>
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
              onClick={onDismissSoftResponse}
            >
              x
            </button>
          </div>
          <div 
            className={`soft-response-text ${softResponse.softType !== 'artifact' ? 'clickable' : ''}`}
            onClick={onVaporClick}
            title={softResponse.softType !== 'artifact' ? 'Click to use as input' : undefined}
          >
            {softResponse.text}
          </div>
          {softResponse.softType === 'clarify' && softResponse.options && softResponse.options.length > 0 && (
            <div className="soft-options">
              {softResponse.options.map((opt, i) => (
                <button 
                  key={i} 
                  className="soft-option-btn" 
                  onClick={() => onSelectOption(opt)}
                >
                  {String.fromCharCode(97 + i)}) {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      {isEmpty && (
        <div className="empty-hint">
          Use [?] to query Soft-LLM, or type {'{braces}'} for direct submit
        </div>
      )}
    </section>
  )
}
