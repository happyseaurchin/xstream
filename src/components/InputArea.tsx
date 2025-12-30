import { useRef, useImperativeHandle, forwardRef } from 'react'
import type { Face } from '../types'

interface InputAreaProps {
  input: string
  onInputChange: (value: string) => void
  face: Face
  isLoading: boolean
  isQuerying: boolean
  hasVaporOrLiquid: boolean
  onQuery: () => void
  onSubmit: () => void
  onCommit: () => void
  onClear: () => void
}

export interface InputAreaHandle {
  focus: () => void
}

export const InputArea = forwardRef<InputAreaHandle, InputAreaProps>(
  function InputArea({
    input,
    onInputChange,
    face,
    isLoading,
    isQuerying,
    hasVaporOrLiquid,
    onQuery,
    onSubmit,
    onCommit,
    onClear,
  }, ref) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Expose focus method to parent
    useImperativeHandle(ref, () => ({
      focus: () => {
        console.log('[InputArea] focus() called')
        textareaRef.current?.focus()
      }
    }))

    const placeholder = face === 'designer' 
      ? 'Create a skill...'
      : face === 'player'
      ? 'Describe a character or action...'
      : 'Create world content...'

    // Refocus after button click
    const withRefocus = (fn: () => void) => {
      return () => {
        fn()
        // Small delay to let React state update, then refocus
        setTimeout(() => textareaRef.current?.focus(), 10)
      }
    }

    return (
      <footer className="input-area">
        {/* Hidden textarea - captures keystrokes but not visible */}
        <textarea
          ref={textareaRef}
          className="hidden-input"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading || isQuerying}
          onBlur={() => console.log('[InputArea] textarea blurred')}
          onFocus={() => console.log('[InputArea] textarea focused')}
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
        <div className="buttons">
          <button 
            onClick={withRefocus(onQuery)}
            disabled={isLoading || isQuerying || !input.trim()}
            className="query-btn"
            title="Query Soft-LLM (Enter)"
          >
            {isQuerying ? '...' : '?'}
          </button>
          <button 
            onClick={withRefocus(onSubmit)} 
            disabled={isLoading || isQuerying || !input.trim()}
            title="Submit to Liquid (Shift+Enter)"
          >
            Submit
          </button>
          <button 
            onClick={withRefocus(onCommit)} 
            disabled={isLoading || isQuerying}
            className="commit-btn"
            title="Commit to Solid (Cmd+Enter)"
          >
            {isLoading ? '...' : 'Commit'}
          </button>
          {hasVaporOrLiquid && (
            <button 
              onClick={withRefocus(onClear)}
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
)
