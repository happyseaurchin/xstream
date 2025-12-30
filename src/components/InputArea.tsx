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

export function InputArea({
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
}: InputAreaProps) {
  const placeholder = face === 'designer' 
    ? 'Create a skill... (e.g., "Create a format skill for pirate responses")'
    : face === 'player'
    ? 'Describe a character or action...'
    : 'Create world content...'

  return (
    <footer className="input-area">
      <textarea
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder={placeholder}
        disabled={isLoading || isQuerying}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.metaKey) {
            e.preventDefault()
            onCommit()
          } else if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault()
            onSubmit()
          }
        }}
      />
      <div className="buttons">
        <button 
          onClick={onQuery}
          disabled={isLoading || isQuerying || !input.trim()}
          className="query-btn"
          title="Query Soft-LLM"
        >
          {isQuerying ? '...' : '?'}
        </button>
        <button 
          onClick={onSubmit} 
          disabled={isLoading || isQuerying || !input.trim()}
          title="Submit (Shift+Enter)"
        >
          Submit
        </button>
        <button 
          onClick={onCommit} 
          disabled={isLoading || isQuerying}
          className="commit-btn"
          title="Commit (Cmd+Enter)"
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
