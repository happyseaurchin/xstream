/**
 * logger.ts — session logger for xstream.
 *
 * Accumulates every engine call, shelf operation, and block mutation
 * into a downloadable text file. Open console and call downloadLog()
 * or click the 📋 button in the UI.
 */

interface LogEntry {
  timestamp: string
  type: 'engine' | 'shelf-read' | 'shelf-write' | 'event' | 'error'
  label: string
  data: string
}

const entries: LogEntry[] = []

function ts(): string {
  return new Date().toISOString().slice(11, 23)
}

export function logEngine(
  label: string,
  phase: 'request' | 'response',
  data: { system?: string; user?: string; response?: string; model?: string; tokens?: string }
) {
  const parts: string[] = [`[${label}] ${phase.toUpperCase()}`]
  if (data.model) parts.push(`Model: ${data.model}`)
  if (data.system) parts.push(`--- SYSTEM ---\n${data.system}`)
  if (data.user) parts.push(`--- USER ---\n${data.user}`)
  if (data.response) parts.push(`--- RESPONSE ---\n${data.response}`)
  if (data.tokens) parts.push(`Tokens: ${data.tokens}`)

  entries.push({
    timestamp: ts(),
    type: 'engine',
    label,
    data: parts.join('\n'),
  })
}

export function logShelf(op: 'READ' | 'WRITE', id: string, block: any) {
  entries.push({
    timestamp: ts(),
    type: op === 'READ' ? 'shelf-read' : 'shelf-write',
    label: `${op} ${id}`,
    data: JSON.stringify(block, null, 2),
  })
}

export function logEvent(label: string, detail: string) {
  entries.push({
    timestamp: ts(),
    type: 'event',
    label,
    data: detail,
  })
}

export function logError(label: string, error: string) {
  entries.push({
    timestamp: ts(),
    type: 'error',
    label,
    data: error,
  })
}

export function getLogText(): string {
  const header = `XSTREAM SESSION LOG — ${new Date().toISOString()}\n${'='.repeat(60)}\n\n`

  return header + entries.map(e => {
    const divider = '-'.repeat(40)
    return `[${e.timestamp}] ${e.type.toUpperCase()} | ${e.label}\n${divider}\n${e.data}\n`
  }).join('\n')
}

export function downloadLog() {
  const text = getLogText()
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `xstream-log-${new Date().toISOString().slice(0, 16).replace(':', '')}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

export function clearLog() {
  entries.length = 0
}

export function getEntryCount(): number {
  return entries.length
}

// Make downloadable from console
if (typeof window !== 'undefined') {
  (window as any).downloadLog = downloadLog
  ;(window as any).getLogText = getLogText
}
