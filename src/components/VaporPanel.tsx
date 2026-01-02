import { useRef, useImperativeHandle, forwardRef } from 'react'
import type { Face, SoftLLMResponse } from '../types'
import { FaceIcon } from './FaceIcon'

export interface OtherVapor {
  userId: string
  userName: string
  face: string
  text: string
}

export interface VaporPanelHandle {
  focus: () => void
}

interface VaporPanelProps {
  // Self's input
  input: string
  onInputChange: (value: string) => void
  userName: string
  face: Face
  // Others' vapor
  othersVapor: OtherVapor[]
  // Soft-LLM
  softResponse: SoftLLMResponse | null
  onDismissSoftResponse: () => void
  onSelectOption: (option: string) => void
  // Input actions
  isLoading: boolean
  isQuerying: boolean
  hasVaporOrLiquid: boolean
  onQuery: () => void
  onSubmit: () => void
  onCommit: () => void
  onClear: () => void
}

export const VaporPanel = forwardRef<VaporPanelHandle, VaporPanelProps>(
  function VaporPanel({
    input,
    onInputChange,
    userName: _userName, // prefixed with _ to indicate intentionally unused
    face,
    othersVapor,
    softResponse,
    onDismissSoftResponse,
    onSelectOption,
    isLoading,
    isQuerying,
    hasVaporOrLiquid: _hasVaporOrLiquid, // prefixed with _ to indicate intentionally unused
    onQuery,
    onSubmit,
    onCommit,
    onClear,
  }, ref) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Expose focus method to parent
    useImperativeHandle(ref, () => ({
      focus: () => {
        textareaRef.current?.focus()
      }
    }))

    // Others with actual text
    const activeOthers = othersVapor.filter(v => v.text.length > 0)

    const placeholder = face === 'designer' 
      ? 'Create a skill...'
      : face === 'character'
      ? 'Describe a character or action...'
      : 'Create world content...'

    // Refocus after button click
    const withRefocus = (fn: () => void) => {
      return () => {
        fn()
        setTimeout(() => textareaRef.current?.focus(), 10)
      }
    }

    return (
      <section className="vapor-zone">
        {/* Scrollable area: Others' vapor + Soft-LLM response */}
        <div className="vapor-scroll-area">
          {/* Others' vapor */}
          {activeOthers.map(vapor => (
            <div key={vapor.userId} className={`vapor-entry other ${vapor.face}`}>
              <FaceIcon face={vapor.face as Face} size="sm" />
              <span className="vapor-user">{vapor.userName}:</span>
              <span className="vapor-text">{vapor.text}</span>
            </div>
          ))}
          
          {/* Soft-LLM response */}
          {softResponse && (
            <div className={`soft-response ${softResponse.softType}`}>
              <div className="soft-response-header">
                <FaceIcon face={softResponse.face} size="sm" />
                <span className={`soft-label ${softResponse.softType}`}>
                  {softResponse.softType === 'artifact' ? '→ liquid' : 
                   softResponse.softType === 'clarify' ? 'options' : 
                   softResponse.softType === 'info' ? 'info' : 'thinking'}
                </span>
                {(softResponse.softType === 'artifact' || softResponse.softType === 'info') && (
                  <button 
                    className="soft-action-btn dismiss" 
                    onClick={onDismissSoftResponse}
                    title="Dismiss"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="soft-response-text">
                {softResponse.text}
              </div>
              {/* Options for clarify type */}
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
        </div>

        {/* Anchored: User's input area */}
        <div className="vapor-input-area">
          <button 
            className="vapor-btn query-btn"
            onClick={withRefocus(onQuery)}
            disabled={isLoading || isQuerying || !input.trim()}
            title="Query Soft-LLM (Enter)"
          >
            {isQuerying ? '...' : '⚡'}
          </button>
          
          <div className="vapor-textarea-wrapper">
            <textarea
              ref={textareaRef}
              className="vapor-textarea"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={placeholder}
              disabled={isLoading || isQuerying}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) {
                  e.preventDefault()
                  onCommit()
                  setTimeout(() => textareaRef.current?.focus(), 10)
                } else if (e.key === 'Enter' && e.shiftKey) {
                  e.preventDefault()
                  onSubmit()
                  setTimeout(() => textareaRef.current?.focus(), 10)
                } else if (e.key === 'Enter' && !e.shiftKey && !e.metaKey) {
                  if (input.trim()) {
                    e.preventDefault()
                    onQuery()
                    setTimeout(() => textareaRef.current?.focus(), 10)
                  }
                }
              }}
            />
            {input && (
              <button 
                className="vapor-clear-btn"
                onClick={withRefocus(onClear)}
                title="Clear"
              >
                ✕
              </button>
            )}
          </div>
          
          <button 
            className="vapor-btn submit-btn"
            onClick={withRefocus(onSubmit)} 
            disabled={isLoading || isQuerying || !input.trim()}
            title="Submit to Liquid (Shift+Enter)"
          >
            →
          </button>
        </div>
      </section>
    )
  }
)
