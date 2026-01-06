import { useState } from 'react'
import type { UseCharactersReturn, CreateCharacterInput } from '../hooks/useCharacters'
import './CharacterCreation.css'

interface CharacterCreationProps {
  characters: UseCharactersReturn
  onComplete: () => void
  onCancel?: () => void
}

export function CharacterCreation({ characters, onComplete, onCancel }: CharacterCreationProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [appearance, setAppearance] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!name.trim()) {
      setLocalError('Name is required')
      return
    }

    setIsSubmitting(true)

    try {
      const input: CreateCharacterInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        appearance: appearance.trim() || undefined,
        isNpc: false,
      }

      const character = await characters.createCharacter(input)
      
      if (character) {
        onComplete()
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to create character')
    } finally {
      setIsSubmitting(false)
    }
  }

  const error = localError || characters.error

  return (
    <div className="character-creation">
      <div className="character-creation-container">
        <div className="character-creation-header">
          <h2>Create Your Character</h2>
          <p className="character-creation-subtitle">
            Who will you be in this world?
          </p>
        </div>

        <form className="character-creation-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="char-name">Name</label>
            <input
              id="char-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What are you called?"
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div className="form-field">
            <label htmlFor="char-description">Description</label>
            <textarea
              id="char-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Who are you? What drives you? What's your story?"
              disabled={isSubmitting}
              rows={4}
            />
            <span className="field-hint">This helps the AI understand how to portray your character</span>
          </div>

          <div className="form-field">
            <label htmlFor="char-appearance">Appearance</label>
            <textarea
              id="char-appearance"
              value={appearance}
              onChange={(e) => setAppearance(e.target.value)}
              placeholder="What do others see when they look at you?"
              disabled={isSubmitting}
              rows={3}
            />
            <span className="field-hint">Physical features, clothing, distinguishing marks</span>
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <div className="form-actions">
            {onCancel && (
              <button
                type="button"
                className="btn-cancel"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn-create"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Character'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
