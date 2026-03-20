/**
 * LiquidZone.tsx — displays the current committed/pending intention.
 * Shows what the user has committed (waiting for Medium synthesis)
 * or Soft-LLM's response to help shape the intention.
 */

interface LiquidZoneProps {
  committed: string | null
  softResponse: string | null
  synthesising: boolean
}

export default function LiquidZone({ committed, softResponse, synthesising }: LiquidZoneProps) {
  return (
    <div style={zoneStyle}>
      {synthesising && committed ? (
        <div>
          <p style={committedStyle}>{committed}</p>
          <p style={statusStyle}>Synthesising...</p>
        </div>
      ) : softResponse ? (
        <p style={responseStyle}>{softResponse}</p>
      ) : (
        <p style={placeholderStyle}>Submitted content appears here</p>
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

const committedStyle: React.CSSProperties = {
  color: '#e0e0e0',
  lineHeight: 1.6,
}

const statusStyle: React.CSSProperties = {
  color: '#7c3aed',
  fontSize: '0.8rem',
  marginTop: '0.5rem',
}

const responseStyle: React.CSSProperties = {
  color: '#b0b0b0',
  lineHeight: 1.6,
  fontStyle: 'italic',
}
