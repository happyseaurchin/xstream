import { useRef, useEffect } from 'react'
import type { Face } from '../types'

interface InputAreaProps {
  input: string
  onInputChange: (value: string) => void
  face: Face
  isLoading: boolean
  isQuerying: boolean
  hasVaporOrLiquid: boolean
  vaporFocused: boolean
  onVaporFocus: () => void
  onQuery: () => void
  onSubmit: () => void
  onCommit: () => void
  onClear: () => void
}

export function InputArea({
  input,
  onInputChange,
  face,
  isLoading,
  isQuerying,
  hasVaporOrLiquid,
  vaporFocused,
  onVaporFocus,
  onQuery,
  onSubmit,
  onCommit,
  onClear,
}: InputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus textarea when vapor area is clicked
  useEffect(() => {
    if (vaporFocused && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [vaporFocused])

  const placeholder = face === 'designer' 
    ? 'Create a skill...'
    : face === 'player'
    ? 'Describe a character or action...'
    : 'Create world content...'

  return (
    <footer className="input-area">
      {/* Hidden textarea - captures keystrokes, displays in VaporPanel */}
      <textarea
        ref={textareaRef}
        className="hidden-input"
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder={placeholder}
        disabled={isLoading || isQuerying}
        onFocus={onVaporFocus}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.metaKey) {
            e.preventDefault()
            onCommit()
          } else if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault()
            onSubmit()
          } else if (e.key === 'Enter' && !e.shiftKey && !e.metaKey) {
            // Plain Enter - query soft-LLM if there's input
            if (input.trim()) {
              e.preventDefault()
              onQuery()
            }
          }
        }}
      />
      <div className="buttons">
        <button 
          onClick={onQuery}
          disabled={isLoading || isQuerying || !input.trim()}
          className="query-btn"
          title="Query Soft-LLM (Enter)"
        >
          {isQuerying ? '...' : '?'}
        </button>
        <button 
          onClick={onSubmit} 
          disabled={isLoading || isQuerying || !input.trim()}
          title="Submit to Liquid (Shift+Enter)"
        >
          Submit
        </button>
        <button 
          onClick={onCommit} 
          disabled={isLoading || isQuerying}
          className="commit-btn"
          title="Commit to Solid (Cmd+Enter)"
        >
          {isLoading ? '...' : 'Commit'}
        </button>
        {hasVaporOrLiquid && (
          <button 
            onClick={onClear}
            className="clear-btn"
            title="Clear vapor and liquid"
          >
            Clear
          </button>
        )}
      </div>
    </footer>
  )
}
