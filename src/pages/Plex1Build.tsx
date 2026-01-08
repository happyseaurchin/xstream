/**
 * Plex 1 Build Plan
 * A reference page showing the Plex 1 implementation plan
 */

export function Plex1Build() {
  return (
    <div style={{
      fontFamily: "'SF Mono', 'Consolas', monospace",
      background: '#0d1117',
      color: '#c9d1d9',
      padding: '20px',
      minHeight: '100vh'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{
          textAlign: 'center',
          color: '#58a6ff',
          fontSize: '1.6rem',
          marginBottom: '8px',
          letterSpacing: '2px'
        }}>PLEX 1 BUILD PLAN</h1>
        <p style={{ textAlign: 'center', color: '#8b949e', marginBottom: '24px', fontSize: '0.85rem' }}>
          The minimal kernel that enables skill-driven narrative coordination
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>

          {/* WHAT XSTREAM ENABLES */}
          <div style={{ gridColumn: 'span 3' }}>
            <Card title="What Xstream Enables" titleColor="#3fb950">
              <Box>
                <p style={{ margin: '0 0 8px 0' }}>
                  Real-world collaboration has a problem: <strong>turn-taking</strong>. Only one person can speak at a time.
                  Ten people in a room means nine waiting.
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  LLMs invert this. They enable <strong style={{ color: '#3fb950' }}>simultaneous listening</strong>.
                </p>
                <p style={{ margin: 0, color: '#58a6ff', fontStyle: 'italic' }}>
                  Xstream is a mass listening device. Not better talking. Collective listening.
                </p>
              </Box>
            </Card>
          </div>

          {/* UI ARCHITECTURE */}
          <div style={{ gridColumn: 'span 2' }}>
            <Card title="UI Architecture" titleColor="#a371f7">
              <Box title="Layout Structure" titleColor="#a371f7">
                <pre style={{
                  fontSize: '0.7rem',
                  margin: 0,
                  background: '#161b22',
                  padding: '8px',
                  borderRadius: '4px',
                  overflow: 'auto'
                }}>{`┌─────────────────────────────┐
│      TOP BAR (Archive)      │  ← past: stories, content
├─────────────────────────────┤
│         SOLID               │  ← committed narrative
├─────────────────────────────┤
│         LIQUID              │  ← staged intentions
├─────────────────────────────┤
│         VAPOR               │  ← live presence (others)
└─────────────────────────────┘
              ◉                   ← Construct button`}</pre>
              </Box>
              <Box title="Single Column as Core Unit" titleColor="#8b949e">
                <Li>Mobile: One column, one character, player face</Li>
                <Li>Desktop: Multiple browser tabs or future multi-column</Li>
                <Li>Everything parameterized by character_id</Li>
              </Box>
            </Card>
          </div>

          {/* CORE PRINCIPLE */}
          <Card title="Core Principle" titleColor="#d29922">
            <Box>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem' }}>
                Platform like <strong>Minecraft</strong> where blocks are co-created narrative, content, and code.
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#8b949e' }}>
                Codebase stays small and tight. Complexity emerges from play; platform minimizes complicatedness.
              </p>
            </Box>
            <Box title="Multi-column from start" titleColor="#d29922">
              <Li>Single column = N=1</Li>
              <Li>Prevents coupling surgery later</Li>
            </Box>
          </Card>

          {/* THE FIVE SYSTEMIC SETS */}
          <div style={{ gridColumn: 'span 3' }}>
            <Card title="The Five Systemic Sets" titleColor="#58a6ff">
              <table style={{ fontSize: '0.75rem', width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', color: '#8b949e', padding: '4px 8px', borderBottom: '1px solid #30363d' }}>Set</th>
                    <th style={{ textAlign: 'left', color: '#8b949e', padding: '4px 8px', borderBottom: '1px solid #30363d' }}>What It Is</th>
                    <th style={{ textAlign: 'left', color: '#8b949e', padding: '4px 8px', borderBottom: '1px solid #30363d' }}>Current State</th>
                  </tr>
                </thead>
                <tbody>
                  <SetRow name="Shelf" desc="vapor/liquid/solid text states" state="Working" stateColor="#3fb950" />
                  <SetRow name="Triad" desc="soft/medium/hard LLM tiers" state="Partial — Hard doesn't produce frames" stateColor="#d29922" />
                  <SetRow name="Context" desc="character/cosmology/coordinates/proximity" state="Partial — proximity not from coordinates" stateColor="#d29922" />
                  <SetRow name="Skills" desc="skills/packages/aperture" state="Exists but inert" stateColor="#f85149" />
                  <SetRow name="Faces" desc="player/author/designer" state="UI works — routing doesn't differ" stateColor="#d29922" />
                </tbody>
              </table>
            </Card>
          </div>

          {/* THE FOUR MISSING BINDINGS */}
          <div style={{ gridColumn: 'span 2' }}>
            <Card title="The Four Missing Bindings" titleColor="#f85149">
              <Box>
                <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.75rem' }}>
                  <li style={{ marginBottom: '6px' }}>
                    <strong style={{ color: '#58a6ff' }}>Hard → Frame → Medium/Soft</strong><br/>
                    <span style={{ color: '#8b949e' }}>Hard produces computed frame. Medium and Soft receive it.</span>
                  </li>
                  <li style={{ marginBottom: '6px' }}>
                    <strong style={{ color: '#58a6ff' }}>Skills → Prompts</strong><br/>
                    <span style={{ color: '#8b949e' }}>Skills are instructions, not stored text. LLM reads them.</span>
                  </li>
                  <li style={{ marginBottom: '6px' }}>
                    <strong style={{ color: '#58a6ff' }}>Coordinates → Proximity → Visibility</strong><br/>
                    <span style={{ color: '#8b949e' }}>Who sees whom from coordinate overlap.</span>
                  </li>
                  <li style={{ marginBottom: '0' }}>
                    <strong style={{ color: '#58a6ff' }}>Face → Domain → Output</strong><br/>
                    <span style={{ color: '#8b949e' }}>Same triad, different aperture, different output table.</span>
                  </li>
                </ol>
              </Box>
              <Box style={{ background: '#1c2128', borderLeft: '3px solid #d29922' }}>
                <strong style={{ color: '#d29922' }}>Plus:</strong> Async Solid Generation — Medium writes placeholder immediately, synthesizes in background.
              </Box>
            </Card>
          </div>

          {/* THE SPINE */}
          <Card title="The Spine" titleColor="#3fb950">
            <Box style={{ background: '#1c2128', borderLeft: '3px solid #3fb950' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', color: '#3fb950' }}>
                Hard-LLM produces a frame.<br/>Medium-LLM receives it.
              </p>
            </Box>
            <p style={{ fontSize: '0.75rem', color: '#8b949e', margin: '8px 0 0 0' }}>
              Everything else hangs off this. Once Hard outputs character_context and Medium reads from it,
              the system has the correct shape.
            </p>
          </Card>

          {/* BUILD SEQUENCE */}
          <div style={{ gridColumn: 'span 3' }}>
            <Card title="Build Sequence" titleColor="#a371f7">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                <BuildSet
                  num="2"
                  name="Triad Binding"
                  tag="SPINE FIRST"
                  color="#3fb950"
                  items={[
                    "Rename frames → sessions",
                    "character_context IS the frame",
                    "Hard runs BEFORE Medium",
                    "Async solid with placeholder"
                  ]}
                />
                <BuildSet
                  num="3"
                  name="Context Binding"
                  color="#58a6ff"
                  items={[
                    "Proximity from coordinates",
                    "Visibility from proximity",
                    "Remove frame selector dropdown",
                    "Character drives cosmology"
                  ]}
                />
                <BuildSet
                  num="4"
                  name="Skills Binding"
                  color="#d29922"
                  items={[
                    "Skills compile into prompts",
                    "Load by face/category",
                    "Aperture skills → Hard",
                    "Gathering skills → Medium"
                  ]}
                />
                <BuildSet
                  num="5"
                  name="Faces Binding"
                  color="#a371f7"
                  items={[
                    "Same triad, different domain",
                    "Player → solid.narrative",
                    "Author → content table",
                    "Designer → skills table"
                  ]}
                />
              </div>
            </Card>
          </div>

          {/* FACE ROUTING TABLE */}
          <div style={{ gridColumn: 'span 2' }}>
            <Card title="Face Routing">
              <table style={{ fontSize: '0.7rem', width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', color: '#8b949e', padding: '4px', borderBottom: '1px solid #30363d' }}>Face</th>
                    <th style={{ textAlign: 'left', color: '#8b949e', padding: '4px', borderBottom: '1px solid #30363d' }}>Soft</th>
                    <th style={{ textAlign: 'left', color: '#8b949e', padding: '4px', borderBottom: '1px solid #30363d' }}>Medium</th>
                    <th style={{ textAlign: 'left', color: '#8b949e', padding: '4px', borderBottom: '1px solid #30363d' }}>Hard</th>
                    <th style={{ textAlign: 'left', color: '#8b949e', padding: '4px', borderBottom: '1px solid #30363d' }}>Output</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px', color: '#79c0ff' }}>player</td>
                    <td style={{ padding: '4px' }}>Refine action</td>
                    <td style={{ padding: '4px' }}>Synthesize narrative</td>
                    <td style={{ padding: '4px' }}>Character proximity</td>
                    <td style={{ padding: '4px', color: '#3fb950' }}>solid.narrative</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px', color: '#a5d6ff' }}>author</td>
                    <td style={{ padding: '4px' }}>Clarify content</td>
                    <td style={{ padding: '4px' }}>Integrate world</td>
                    <td style={{ padding: '4px' }}>World-region proximity</td>
                    <td style={{ padding: '4px', color: '#3fb950' }}>content table</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px', color: '#d2a8ff' }}>designer</td>
                    <td style={{ padding: '4px' }}>Specify mod</td>
                    <td style={{ padding: '4px' }}>Apply governance</td>
                    <td style={{ padding: '4px' }}>Skill-space proximity</td>
                    <td style={{ padding: '4px', color: '#3fb950' }}>skills table</td>
                  </tr>
                </tbody>
              </table>
            </Card>
          </div>

          {/* DATABASE REFERENCE */}
          <Card title="Key Tables" titleColor="#58a6ff">
            <Box title="character_context (THE FRAME)" titleColor="#3fb950">
              <code style={{ fontSize: '0.65rem', color: '#8b949e' }}>
                perceivable_content<br/>
                proximate_characters<br/>
                applicable_skills<br/>
                compiled_at / expires_at
              </code>
            </Box>
            <Box title="character_proximity" titleColor="#58a6ff">
              <code style={{ fontSize: '0.65rem', color: '#8b949e' }}>
                close[] / nearby[] / distant[]
              </code>
            </Box>
          </Card>

          {/* SUCCESS CRITERIA */}
          <div style={{ gridColumn: 'span 3' }}>
            <Card title="Success Criteria" titleColor="#3fb950">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <Box>
                  <Li>Hard produces frame before Medium runs</Li>
                  <Li>Medium reads from character_context</Li>
                </Box>
                <Box>
                  <Li>Async solid shows placeholder, fills in background</Li>
                  <Li>Proximity computed from coordinates</Li>
                </Box>
                <Box>
                  <Li>Skills compile into prompts by face/category</Li>
                  <Li>Face routing sends output to correct table</Li>
                </Box>
              </div>
              <Box style={{ background: '#1c2128', borderLeft: '3px solid #d29922', marginTop: '8px' }}>
                <strong style={{ color: '#d29922' }}>The Mos Eisley Test:</strong>{' '}
                <span style={{ fontSize: '0.75rem' }}>
                  Three players, different characters, shared location. Each commits action.
                  Medium synthesizes coherent scene. Each sees correlated-but-perspectival narrative.
                </span>
              </Box>
            </Card>
          </div>

        </div>

        <div style={{ marginTop: '20px', textAlign: 'center', color: '#484f58', fontSize: '0.7rem' }}>
          <a href="/" style={{ color: '#58a6ff', textDecoration: 'none' }}>← Back to Xstream</a>
          {' | '}
          <a href="https://github.com/happyseaurchin/xstream/blob/main/docs/plex-1-build-plan.md"
             target="_blank"
             rel="noopener noreferrer"
             style={{ color: '#58a6ff', textDecoration: 'none' }}>
            View full document on GitHub →
          </a>
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
        color: titleColor,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '8px',
        borderBottom: '1px solid #30363d',
        paddingBottom: '4px',
        margin: 0
      }}>
        {title}
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
    <div style={{ margin: '3px 0', paddingLeft: '12px', position: 'relative', fontSize: '0.75rem' }}>
      <span style={{ position: 'absolute', left: 0, color: '#484f58' }}>→</span>
      {children}
    </div>
  )
}

function SetRow({ name, desc, state, stateColor }: { name: string; desc: string; state: string; stateColor: string }) {
  return (
    <tr>
      <td style={{ padding: '4px 8px', color: '#58a6ff', fontWeight: 'bold' }}>{name}</td>
      <td style={{ padding: '4px 8px' }}>{desc}</td>
      <td style={{ padding: '4px 8px', color: stateColor }}>{state}</td>
    </tr>
  )
}

function BuildSet({ num, name, tag, color, items }: { num: string; name: string; tag?: string; color: string; items: string[] }) {
  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #30363d',
      borderLeft: `3px solid ${color}`,
      borderRadius: '4px',
      padding: '8px'
    }}>
      <div style={{ fontSize: '0.7rem', color: '#8b949e' }}>Set {num}</div>
      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color, marginBottom: '4px' }}>{name}</div>
      {tag && <div style={{ fontSize: '0.65rem', color: '#3fb950', marginBottom: '4px' }}>{tag}</div>}
      {items.map((item, i) => (
        <div key={i} style={{ fontSize: '0.65rem', color: '#8b949e', paddingLeft: '8px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 0 }}>•</span>
          {item}
        </div>
      ))}
    </div>
  )
}
