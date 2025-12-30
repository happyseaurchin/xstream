import type { Face, SoftLLMResponse } from '../types'

export interface OtherVapor {
  userId: string
  userName: string
  face: string
  text: string
}

interface VaporPanelProps {
  // Self's vapor
  input: string
  userName: string
  face: Face
  isFocused: boolean
  onFocus: () => void
  // Others' vapor
  othersVapor: OtherVapor[]
  // Soft-LLM
  softResponse: SoftLLMResponse | null
  onVaporClick: () => void
  onDismissSoftResponse: () => void
  onSelectOption: (option: string) => void
}

export function VaporPanel({
  input,
  userName,
  face,
  isFocused,
  onFocus,
  othersVapor,
  softResponse,
  onVaporClick,
  onDismissSoftResponse,
  onSelectOption,
}: VaporPanelProps) {
  // Others with actual text
  const activeOthers = othersVapor.filter(v => v.text.length > 0)
  
  // Show self if has input OR is focused (so user knows where they're typing)
  const showSelf = input.length > 0 || isFocused

  const isEmpty = !showSelf && activeOthers.length === 0 && !softResponse

  return (
    <section 
      className={`vapor-area ${isFocused ? 'focused' : ''}`}
      onClick={onFocus}
    >
      <div className="area-header">
        <span className="area-label">~ Vapor</span>
        <span className="area-hint">Live + Soft-LLM</span>
      </div>
      
      {/* Self's vapor - always first */}
      {showSelf && (
        <div className={`vapor-entry self ${face}`}>
          <span className="vapor-user">I ({userName}):</span>
          <span className="vapor-text">{input || (isFocused ? '|' : '')}</span>
        </div>
      )}
      
      {/* Others' vapor */}
      {activeOthers.map(vapor => (
        <div key={vapor.userId} className={`vapor-entry other ${vapor.face}`}>
          <span className="vapor-user">{vapor.userName}:</span>
          <span className="vapor-text">{vapor.text}</span>
        </div>
      ))}
      
      {/* Soft-LLM response */}
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
              onClick={(e) => { e.stopPropagation(); onDismissSoftResponse(); }}
            >
              x
            </button>
          </div>
          <div 
            className={`soft-response-text ${softResponse.softType !== 'artifact' ? 'clickable' : ''}`}
            onClick={(e) => { e.stopPropagation(); onVaporClick(); }}
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
                  onClick={(e) => { e.stopPropagation(); onSelectOption(opt); }}
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
          Click here to type. Use [?] for Soft-LLM, {'{braces}'} for direct submit.
        </div>
      )}
    </section>
  )
}
