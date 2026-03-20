/**
 * SolidZone.tsx — displays committed narrative (what happened).
 * Solid content produced by Medium-LLM. Past tense, determined.
 */

interface SolidZoneProps {
  entries: string[]
}

export default function SolidZone({ entries }: SolidZoneProps) {
  return (
    <div style={zoneStyle}>
      {entries.length === 0 ? (
        <p style={placeholderStyle}>No committed content yet</p>
      ) : (
        entries.map((entry, i) => (
          <p key={i} style={entryStyle}>{entry}</p>
        ))
      )}
    </div>
  )
}

const zoneStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '1rem',
  borderBottom: '1px solid #333',
}

const placeholderStyle: React.CSSProperties = {
  color: '#666',
  fontStyle: 'italic',
  textAlign: 'center',
  marginTop: '2rem',
}

const entryStyle: React.CSSProperties = {
  marginBottom: '0.75rem',
  lineHeight: 1.6,
  color: '#e0e0e0',
}
