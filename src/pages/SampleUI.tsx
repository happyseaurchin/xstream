import { useState } from 'react'
import '../App.css'

/**
 * SampleUI - Visual mockup of the Xstream interface
 * 
 * This page renders the full UI structure with sample data,
 * allowing external tools (like Lovable) to see and redesign
 * the visual styling without needing authentication.
 * 
 * Access at: /sample-ui
 */
export function SampleUI() {
  const [face, setFace] = useState<'character' | 'author' | 'designer'>('character')
  const [solidView, setSolidView] = useState<'log' | 'dir'>('log')
  const [input, setInput] = useState('examine the spices')
  
  // Fixed proportions for mockup
  const zoneProportions = { solid: 40, liquid: 30, vapour: 30 }

  return (
    <div className="app" data-theme="dark">
      {/* HEADER */}
      <header className="header">
        <div className="selectors">
          <select 
            className="face-selector" 
            value={face} 
            onChange={e => setFace(e.target.value as typeof face)}
          >
            <option value="character">🎭 Character</option>
            <option value="author">📖 Author</option>
            <option value="designer">⚙️ Designer</option>
          </select>
          <select className="frame-selector" defaultValue="test-frame">
            <option value="none">None (platform defaults)</option>
            <option value="test-frame">test-frame</option>
            <option value="test-frame-B">test-frame-B</option>
          </select>
        </div>
        <div className="header-controls">
          <select className="character-selector" defaultValue="marcus">
            <option value="">-- Select Character --</option>
            <option value="marcus">Marcus ✓</option>
            <option value="elena">Elena (NPC)</option>
            <option value="trader">Old Trader ⊘</option>
          </select>
          <div className="presence-indicator">
            <span className="connection-status connected" title="Connected">●</span>
            <span className="presence-count" title="Elena (character), WorldBuilder (author)">+2</span>
          </div>
          <span className="xyz-badge">X0Y0Z0</span>
          <button className="visibility-toggle" title="Visibility settings">⚙</button>
          <button className="meta-toggle" title="Toggle skill metadata">○</button>
          <button className="logout-btn" title="Signed in as Marcus">↪</button>
        </div>
      </header>

      {/* PRESENCE BAR */}
      <div className="presence-bar">
        <div className="presence-user character">
          <span>🎭</span>
          <span className="presence-name">Elena</span>
          <span className="presence-typing">...</span>
        </div>
        <div className="presence-user author">
          <span>📖</span>
          <span className="presence-name">WorldBuilder</span>
        </div>
      </div>

      {/* MAIN ZONES */}
      <main className="main">
        {/* SOLID ZONE */}
        <div className="zone-wrapper" style={{ flex: `0 0 ${zoneProportions.solid}%` }}>
          <div className="solid-zone">
            <div className="zone-header">
              <span className="zone-label">Solid</span>
              <div className="solid-view-toggle">
                <button 
                  className={`view-btn ${solidView === 'log' ? 'active' : ''}`}
                  onClick={() => setSolidView('log')}
                >
                  Log
                </button>
                <button 
                  className={`view-btn ${solidView === 'dir' ? 'active' : ''}`}
                  onClick={() => setSolidView('dir')}
                >
                  Dir
                </button>
              </div>
            </div>
            <div className="solid-scroll-area">
              {solidView === 'log' ? (
                <>
                  {/* Synthesizing entry */}
                  <div className="solid-entry synthesizing">
                    <div className="entry-header">
                      <span className="face-icon">🎭</span>
                      <span className="user-badge">Marcus</span>
                      <span className="timestamp">just now</span>
                    </div>
                    <div className="synthesizing-placeholder">
                      <span className="synthesizing-spinner">⟳</span>
                      <span className="synthesizing-text">Synthesizing narrative...</span>
                    </div>
                  </div>

                  {/* Completed entries */}
                  <div className="solid-entry">
                    <div className="entry-header">
                      <span className="face-icon">🎭</span>
                      <span className="user-badge">Elena</span>
                      <span className="timestamp">2m ago</span>
                    </div>
                    <div className="entry-response">
                      Elena steps forward, her hand resting on the hilt of her sword. "The merchant quarter is just ahead. We should be cautious—I've heard rumors of thieves in these parts."
                    </div>
                  </div>

                  <div className="solid-entry">
                    <div className="entry-header">
                      <span className="face-icon">📖</span>
                      <span className="user-badge">WorldBuilder</span>
                      <span className="timestamp">5m ago</span>
                    </div>
                    <div className="entry-response">
                      The afternoon sun casts long shadows across the cobblestone streets. The smell of spices drifts from a nearby stall, mingling with the sounds of merchants hawking their wares.
                    </div>
                  </div>
                </>
              ) : (
                <div className="directory-list">
                  <div className="directory-section-label">Characters</div>
                  <div className="directory-item character-item">
                    <div className="dir-item-header">
                      <span className="dir-item-name">Marcus</span>
                      <div className="dir-item-actions">
                        <span className="dir-item-level">PC</span>
                      </div>
                    </div>
                    <div className="dir-item-meta">
                      <span>Travelling merchant</span>
                    </div>
                  </div>
                  <div className="directory-item character-item">
                    <div className="dir-item-header">
                      <span className="dir-item-name">Elena</span>
                      <div className="dir-item-actions">
                        <span className="dir-item-level">NPC</span>
                      </div>
                    </div>
                    <div className="dir-item-meta">
                      <span>Sword-for-hire</span>
                    </div>
                  </div>
                  
                  <div className="directory-section-label">Locations</div>
                  <div className="directory-item author-item">
                    <div className="dir-item-header">
                      <span className="dir-item-name">Merchant Quarter</span>
                      <div className="dir-item-actions">
                        <span className="dir-item-level">LOC</span>
                      </div>
                    </div>
                    <div className="dir-item-meta">
                      <span>Bustling market district</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TOP SEPARATOR */}
        <div className="draggable-separator">
          <div className="separator-grip"></div>
        </div>

        {/* LIQUID ZONE */}
        <div className="zone-wrapper" style={{ flex: `0 0 ${zoneProportions.liquid}%` }}>
          <div className="liquid-zone">
            <div className="zone-header">
              <span className="zone-label">Liquid</span>
            </div>
            <div className="liquid-scroll-area">
              {/* My liquid entry */}
              <div className="liquid-entry self">
                <div className="entry-header">
                  <span className="face-icon">🎭</span>
                  <span className="user-badge">Marcus</span>
                </div>
                <div className="liquid-content-row">
                  <span className="liquid-text">I approach the merchant stall and examine the exotic spices on display, looking for anything unusual.</span>
                  <button className="liquid-commit-btn" title="Commit to solid">↓</button>
                </div>
              </div>

              {/* Other's liquid */}
              <div className="liquid-entry other-liquid">
                <div className="entry-header">
                  <span className="face-icon">📖</span>
                  <span className="user-badge">WorldBuilder</span>
                </div>
                <span className="liquid-text readonly">The merchant, a weathered man with kind eyes, looks up from his wares and notices your interest in the saffron...</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SEPARATOR */}
        <div className="draggable-separator">
          <div className="separator-grip"></div>
        </div>

        {/* VAPOR ZONE */}
        <div className="zone-wrapper" style={{ flex: `0 0 ${zoneProportions.vapour}%` }}>
          <div className="vapor-zone">
            <div className="zone-header">
              <span className="zone-label">Vapor</span>
            </div>
            <div className="vapor-scroll-area">
              {/* Others typing */}
              <div className="vapor-entry character">
                <span className="vapor-user">Elena:</span>
                <span className="vapor-text">I keep watch while you browse the...</span>
              </div>

              {/* Soft-LLM response */}
              <div className="soft-response">
                <div className="soft-response-header">
                  <span className="soft-label">REFINE</span>
                  <button className="soft-action-btn">✕</button>
                </div>
                <div className="soft-response-text">
                  Refined: "I carefully examine the array of exotic spices, noting their origins and quality, searching for anything that might be worth trading."
                </div>
              </div>
            </div>

            {/* INPUT AREA */}
            <div className="vapor-input-area">
              <button className="vapor-btn query-btn" title="Query Soft-LLM">?</button>
              <button className="vapor-btn submit-btn" title="Submit to Liquid">↑</button>
              <div className="vapor-textarea-wrapper">
                <textarea 
                  className="vapor-textarea" 
                  placeholder="Type your action..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                />
                {input && (
                  <button className="vapor-clear-btn" onClick={() => setInput('')}>✕</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
