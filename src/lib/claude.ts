/**
 * claude.ts — browser-side Claude API caller.
 *
 * Single function: call Claude with a system prompt and user message.
 * Uses anthropic-dangerous-direct-browser-access header for browser-side calls.
 * The player's API key never touches our server.
 */

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
  maxTokens = 2048
): Promise<ClaudeResponse> {
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
    throw new Error(`Claude API ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data.content
    ?.filter((c: any) => c.type === 'text')
    ?.map((c: any) => c.text)
    ?.join('') ?? ''

  return {
    text,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  }
}
