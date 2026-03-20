/**
 * claude.ts — browser-side Claude API caller with full logging.
 *
 * Every call logs to both console and the session logger.
 */

import { logEngine, logError } from './logger'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

export type ClaudeModel =
  | 'claude-sonnet-4-6'
  | 'claude-haiku-4-5-20251001'

export interface ClaudeResponse {
  text: string
  inputTokens: number
  outputTokens: number
}

export async function callClaude(
  apiKey: string,
  model: ClaudeModel,
  system: string,
  user: string,
  maxTokens = 2048,
  engineLabel = 'unknown'
): Promise<ClaudeResponse> {
  // Log request
  logEngine(engineLabel, 'request', { model, system, user })

  console.group(`🔮 [${engineLabel}] → ${model}`)
  console.log('%c SYSTEM:', 'color: #c4a262; font-weight: bold')
  console.log(system)
  console.log('%c USER:', 'color: #6a9fb5; font-weight: bold')
  console.log(user)
  console.groupEnd()

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    logError(engineLabel, `API ${response.status}: ${err}`)
    console.error(`❌ [${engineLabel}] API error ${response.status}:`, err)
    throw new Error(`Claude API ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data.content
    ?.filter((c: any) => c.type === 'text')
    ?.map((c: any) => c.text)
    ?.join('') ?? ''

  const tokens = `${data.usage?.input_tokens ?? 0} in, ${data.usage?.output_tokens ?? 0} out`

  // Log response
  logEngine(engineLabel, 'response', { response: text, tokens })

  console.group(`✅ [${engineLabel}] ← response`)
  console.log(text)
  console.log(`Tokens: ${tokens}`)
  console.groupEnd()

  return {
    text,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  }
}
