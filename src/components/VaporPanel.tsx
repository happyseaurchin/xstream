import type { Face, SoftLLMResponse } from '../types'
import type { PresentUser } from './PresenceBar'

export interface OtherVapor {
  userId: string
  userName: string
  face: Face
  text: string
}

interface VaporPanelProps {
  othersVapor: OtherVapor[]
  presentUsers: PresentUser[]
  softResponse: SoftLLMResponse | null
  input: string
  shareVapor: boolean
  onVaporClick: () => void
  onDismissSoftResponse: () => void
  onSelectOption: (option: string) => void
}

export function VaporPanel({
  othersVapor,
  presentUsers,
  softResponse,
  input,
  shareVapor,
  onVaporClick,
  onDismissSoftResponse,
  onSelectOption,
}: VaporPanelProps) {
  // Users typing but no text received yet
  const typingWithoutText = presentUsers.filter(
    u => u.isTyping && !othersVapor.some(v => v.userId === u.id && v.text.length > 0)
  )

  const isEmpty = !input.trim() && 
    !softResponse && 
    othersVapor.length === 0 && 
    typingWithoutText.length === 0

  return (
    <section className="vapor-area">
      <div className="area-header">
        <span className="area-label">~ Vapor</span>
        <span className="area-hint">Live + Soft-LLM</span>
      </div>
      
      {/* Others' vapor - live character-by-character text */}
      {othersVapor.filter(v => v.text.length > 0).map(vapor => (
        <div key={vapor.userId} className={`vapor-indicator other ${vapor.face}`}>
          <span className="typing-dot">*</span>
          <span className="vapor-user">{vapor.userName}:</span>
          <span className="vapor-live-text">{vapor.text}</span>
        </div>
      ))}
      
      {/* Fallback for users typing but no text yet */}
      {typingWithoutText.map(user => (
        <div key={user.id} className="vapor-indicator other">
          <span className="typing-dot">*</span>
          <span className="vapor-preview">{user.name} is typing...</span>
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
      
      {input.trim() && shareVapor && !softResponse && (
        <div className="vapor-indicator self">
          <span className="typing-dot">*</span>
          <span className="vapor-preview">typing: "{input.slice(0, 30)}{input.length > 30 ? '...' : ''}"</span>
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
