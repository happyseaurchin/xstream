/**
 * Architecture Reference Card
 * A standalone page showing the Xstream system architecture
 */

export function Architecture() {
  return (
    <div style={{
      fontFamily: "'SF Mono', 'Consolas', monospace",
      background: '#0d1117',
      color: '#c9d1d9',
      padding: '20px',
      minHeight: '100vh'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{
          textAlign: 'center',
          color: '#58a6ff',
          fontSize: '1.4rem',
          marginBottom: '16px',
          letterSpacing: '2px'
        }}>XSTREAM ARCHITECTURE</h1>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px'
        }}>
          
          {/* COSMOLOGY */}
          <Card title="Cosmology" titleColor="#a371f7">
            <Box title="What it holds:" titleColor="#a371f7">
              Characters, Locations, Items, Events, Factions, Lore
            </Box>
            <ul style={{ listStyle: 'none', fontSize: '0.75rem', padding: 0 }}>
              <Li>Shared across all frames</Li>
              <Li>Has tabulations (spatial/temporal naming)</Li>
              <Li>Physics rules & world description</Li>
            </ul>
            <Row label="Table:" value="cosmologies" />
          </Card>
          
          {/* FRAME */}
          <Card title="Frame" titleColor="#3fb950">
            <Box title="What it is:" titleColor="#3fb950">
              A view into cosmology, NOT a container
            </Box>
            <ul style={{ listStyle: 'none', fontSize: '0.75rem', padding: 0 }}>
              <Li>Points to cosmology_id</Li>
              <Li>Holds coordinate state per character</Li>
              <Li>Links to skill packages</Li>
              <Li>Manages synthesis locks</Li>
            </ul>
            <Row label="Table:" value="frames" />
          </Card>
          
          {/* APERTURE */}
          <Card title="Aperture" titleColor="#d29922">
            <Box title="Pscale range filter:" titleColor="#d29922">
              floor → ceiling determines scope
            </Box>
            <ul style={{ listStyle: 'none', fontSize: '0.75rem', padding: 0 }}>
              <Li>Skill-defined, not hard-coded</Li>
              <Li>Determines what content to gather</Li>
              <Li>Like Minecraft chunk loading</Li>
              <Li>Coordinates define relevance</Li>
            </ul>
            <Row label="Stored in:" value="character_context" />
          </Card>
          
          {/* TRIAD - wide */}
          <div style={{ gridColumn: 'span 2' }}>
            <Card title="LLM Triad" titleColor="#58a6ff">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                margin: '8px 0',
                fontSize: '0.75rem'
              }}>
                <FlowItem color="#3fb950" label="SOFT" desc="User refinement" sub="vapor → liquid" />
                <Arrow />
                <FlowItem color="#d29922" label="MEDIUM" desc="Multi-user synthesis" sub="liquid → solid" />
                <Arrow />
                <FlowItem color="#f85149" label="HARD" desc="Coordination & filing" sub="solid → DB updates" />
              </div>
              <Box>
                <Row label="Edge Functions:" value="" />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem' }}>
                  <span style={{ color: '#3fb950' }}>generate-v2</span>
                  <Arrow />
                  <span style={{ color: '#d29922' }}>handleMediumMode()</span>
                  <Arrow />
                  <span style={{ color: '#f85149' }}>hard-llm</span>
                </div>
              </Box>
            </Card>
          </div>
          
          {/* FACES */}
          <Card title="Three Faces" titleColor="#db6d28">
            <Box title="PLAYER" titleColor="#79c0ff">
              Character intentions → Narrative<br/>
              <span style={{ color: '#8b949e' }}>Output:</span> solid.narrative
            </Box>
            <Box title="AUTHOR" titleColor="#a5d6ff">
              World content → Entities filed<br/>
              <span style={{ color: '#8b949e' }}>Output:</span> characters / content tables
            </Box>
            <Box title="DESIGNER" titleColor="#d2a8ff">
              Skill modifications → Rules<br/>
              <span style={{ color: '#8b949e' }}>Output:</span> skills table
            </Box>
          </Card>
          
          {/* DB STRUCTURE - wide */}
          <div style={{ gridColumn: 'span 2' }}>
            <Card title="Database Structure">
              <table style={{ fontSize: '0.7rem', width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', color: '#8b949e', padding: '2px 4px', borderBottom: '1px solid #30363d' }}>Table</th>
                    <th style={{ textAlign: 'left', color: '#8b949e', padding: '2px 4px', borderBottom: '1px solid #30363d' }}>Purpose</th>
                    <th style={{ textAlign: 'left', color: '#8b949e', padding: '2px 4px', borderBottom: '1px solid #30363d' }}>Key Relations</th>
                  </tr>
                </thead>
                <tbody>
                  <DbRow table="cosmologies" purpose="World containers" relations="id" pk />
                  <DbRow table="frames" purpose="Viewports" relations="cosmology_id" fk />
                  <DbRow table="characters" purpose="PC/NPC entities" relations="cosmology_id, inhabited_by" fk />
                  <DbRow table="content" purpose="Locations, items, lore..." relations="cosmology_id, content_type" fk />
                  <DbRow table="character_coordinates" purpose="Where in frame" relations="character_id, frame_id" fk />
                  <DbRow table="liquid" purpose="Pending submissions" relations="frame_id, user_id, face" fk />
                  <DbRow table="solid" purpose="Committed narrative" relations="frame_id, face, narrative" fk />
                  <DbRow table="packages" purpose="Skill bundles" relations="level (platform/world/frame/user)" />
                  <DbRow table="skills" purpose="LLM instructions" relations="package_id, category" fk />
                  <DbRow table="frame_packages" purpose="Skills for frame" relations="frame_id, package_id, priority" fk />
                </tbody>
              </table>
            </Card>
          </div>
          
          {/* KEY FLOW - full width */}
          <div style={{ gridColumn: 'span 3' }}>
            <Card title="Synthesis Flow">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                margin: '8px 0',
                fontSize: '0.75rem',
                flexWrap: 'wrap'
              }}>
                <FlowBox>User types</FlowBox>
                <Arrow />
                <FlowBox style={{ borderLeft: '3px solid #3fb950' }}>Soft-LLM refines</FlowBox>
                <Arrow />
                <FlowBox>liquid table</FlowBox>
                <Arrow />
                <FlowBox>Commit</FlowBox>
                <Arrow />
                <FlowBox style={{ borderLeft: '3px solid #d29922' }}>Medium-LLM gathers & synthesizes</FlowBox>
                <Arrow />
                <FlowBox>solid table</FlowBox>
                <Arrow />
                <FlowBox style={{ borderLeft: '3px solid #f85149' }}>Hard-LLM coordinates & files</FlowBox>
                <Arrow />
                <FlowBox style={{ borderLeft: '3px solid #a371f7' }}>DB updates</FlowBox>
              </div>
              <Box style={{ textAlign: 'center' }}>
                <span style={{ color: '#8b949e' }}>Gathering:</span> Skills determine WHAT to load &nbsp;|&nbsp;
                <span style={{ color: '#8b949e' }}>Aperture:</span> Pscale range determines SCOPE &nbsp;|&nbsp;
                <span style={{ color: '#8b949e' }}>Coordinates:</span> Determine PROXIMITY
              </Box>
            </Card>
          </div>
          
        </div>
        
        <div style={{ marginTop: '20px', textAlign: 'center', color: '#484f58', fontSize: '0.7rem' }}>
          <a href="/" style={{ color: '#58a6ff', textDecoration: 'none' }}>← Back to Xstream</a>
        </div>
      </div>
    </div>
  )
}

// Helper Components
function Card({ title, titleColor = '#8b949e', children }: { title: string; titleColor?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#161b22',
      border: '1px solid #30363d',
      borderRadius: '8px',
      padding: '12px'
    }}>
      <h2 style={{
        fontSize: '0.85rem',
        color: '#8b949e',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '8px',
        borderBottom: '1px solid #30363d',
        paddingBottom: '4px',
        margin: 0
      }}>
        {title} <span style={{ color: titleColor }}>({titleColor === '#8b949e' ? '' : '●'})</span>
      </h2>
      <div style={{ marginTop: '8px' }}>{children}</div>
    </div>
  )
}

function Box({ title, titleColor, children, style }: { title?: string; titleColor?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #30363d',
      borderRadius: '4px',
      padding: '8px',
      margin: '6px 0',
      fontSize: '0.75rem',
      ...style
    }}>
      {title && <div style={{ fontWeight: 'bold', marginBottom: '4px', color: titleColor }}>{title}</div>}
      {children}
    </div>
  )
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ margin: '3px 0', paddingLeft: '12px', position: 'relative' }}>
      <span style={{ position: 'absolute', left: 0, color: '#484f58' }}>→</span>
      {children}
    </li>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '0.8rem' }}>
      <span style={{ color: '#8b949e' }}>{label}</span>
      <span style={{ color: '#58a6ff' }}>{value}</span>
    </div>
  )
}

function Arrow() {
  return <span style={{ color: '#484f58' }}>→</span>
}

function FlowItem({ color, label, desc, sub }: { color: string; label: string; desc: string; sub: string }) {
  return (
    <div style={{
      padding: '4px 8px',
      borderRadius: '4px',
      background: '#21262d',
      borderLeft: `3px solid ${color}`,
      textAlign: 'center'
    }}>
      <strong style={{ color }}>{label}</strong><br/>
      {desc}<br/>
      <span style={{ color: '#8b949e', fontSize: '0.65rem' }}>{sub}</span>
    </div>
  )
}

function FlowBox({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      padding: '4px 8px',
      borderRadius: '4px',
      background: '#21262d',
      ...style
    }}>
      {children}
    </div>
  )
}

function DbRow({ table, purpose, relations, pk, fk }: { table: string; purpose: string; relations: string; pk?: boolean; fk?: boolean }) {
  return (
    <tr>
      <td style={{ color: '#58a6ff', padding: '2px 4px' }}>{table}</td>
      <td style={{ padding: '2px 4px' }}>{purpose}</td>
      <td style={{ padding: '2px 4px' }}>
        <span style={{ color: pk ? '#d29922' : fk ? '#a371f7' : '#c9d1d9' }}>{relations}</span>
      </td>
    </tr>
  )
}
