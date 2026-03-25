/**
 * App.kernel.tsx — the React skin on the sovereign kernel.
 *
 * This app renders state and captures input. It has zero knowledge of
 * peers, dominos, accumulation, medium-LLM prompts, or Anthropic's API.
 * The kernel handles all of that.
 *
 * Contract:
 *   Reads: block.outbox.solid, block.status, block.character, block.accumulated
 *   Writes: kernel.submitLiquid(text), kernel.commit()
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Kernel, type KernelCallbacks } from './kernel/kernel';
import { createBlock, generateGameCode, DEFAULT_SCENE } from './kernel/block-factory';

// ============================================================
// TYPES
// ============================================================

type Phase = 'setup' | 'playing';

interface LogEntry {
  time: string;
  message: string;
}

// ============================================================
// SETUP SCREEN
// ============================================================

function SetupScreen({ onStart }: {
  onStart: (gameId: string, charName: string, charState: string, scene: string, apiKey: string, isCreate: boolean) => void;
}) {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('xstream:apiKey') ?? '');
  const [charName, setCharName] = useState('');
  const [charState, setCharState] = useState('');
  const [scene, setScene] = useState(DEFAULT_SCENE);
  const [gameCode, setGameCode] = useState('');

  const handleStart = (isCreate: boolean) => {
    if (!apiKey || !charName) return;
    localStorage.setItem('xstream:apiKey', apiKey);
    const gid = isCreate ? generateGameCode() : gameCode.toUpperCase().trim();
    if (!gid) return;
    onStart(gid, charName, charState || `${charName}. A newcomer.`, scene, apiKey, isCreate);
  };

  if (mode === 'choose') {
    return (
      <div style={styles.setupContainer}>
        <h1 style={styles.title}>xstream</h1>
        <p style={styles.subtitle}>sovereign narrative coordination</p>

        <div style={styles.field}>
          <label style={styles.label}>Anthropic API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            style={styles.input}
          />
          <p style={styles.hint}>Stored in your browser only. Never sent to our servers.</p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            onClick={() => setMode('create')}
            disabled={!apiKey}
            style={{ ...styles.button, ...styles.buttonPrimary, opacity: apiKey ? 1 : 0.4 }}
          >
            Create Game
          </button>
          <button
            onClick={() => setMode('join')}
            disabled={!apiKey}
            style={{ ...styles.button, opacity: apiKey ? 1 : 0.4 }}
          >
            Join Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.setupContainer}>
      <button onClick={() => setMode('choose')} style={styles.backButton}>← Back</button>
      <h2 style={styles.title}>{mode === 'create' ? 'Create Game' : 'Join Game'}</h2>

      {mode === 'join' && (
        <div style={styles.field}>
          <label style={styles.label}>Game Code</label>
          <input
            value={gameCode}
            onChange={e => setGameCode(e.target.value)}
            placeholder="ABC123"
            style={{ ...styles.input, fontFamily: 'monospace', fontSize: 24, letterSpacing: 4, textAlign: 'center' as const }}
            maxLength={6}
          />
        </div>
      )}

      <div style={styles.field}>
        <label style={styles.label}>Character Name</label>
        <input
          value={charName}
          onChange={e => setCharName(e.target.value)}
          placeholder="Kael, Essa, Viktor..."
          style={styles.input}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Character Description</label>
        <textarea
          value={charState}
          onChange={e => setCharState(e.target.value)}
          placeholder="Young town guard, off-duty. Sitting at the bar..."
          style={{ ...styles.input, minHeight: 80 }}
        />
      </div>

      {mode === 'create' && (
        <div style={styles.field}>
          <label style={styles.label}>Scene</label>
          <textarea
            value={scene}
            onChange={e => setScene(e.target.value)}
            style={{ ...styles.input, minHeight: 100, fontSize: 13 }}
          />
        </div>
      )}

      <button
        onClick={() => handleStart(mode === 'create')}
        disabled={!charName || (mode === 'join' && !gameCode)}
        style={{
          ...styles.button, ...styles.buttonPrimary, marginTop: 16,
          opacity: charName && (mode === 'create' || gameCode) ? 1 : 0.4,
        }}
      >
        {mode === 'create' ? '🎲 Create & Enter' : '🚪 Join Game'}
      </button>
    </div>
  );
}

// ============================================================
// GAME SCREEN
// ============================================================

function GameScreen({ kernel, gameId }: { kernel: Kernel; gameId: string }) {
  const [solids, setSolids] = useState<string[]>([]);
  const [liquidText, setLiquidText] = useState('');
  const [status, setStatus] = useState('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const solidEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Wire kernel callbacks
  useEffect(() => {
    const ts = () => new Date().toLocaleTimeString();
    const cbs = kernel['callbacks'] as KernelCallbacks;

    cbs.onSolid = (solid) => {
      setSolids(prev => [...prev, solid]);
      setTimeout(() => solidEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };
    cbs.onStatusChange = (s) => setStatus(s);
    cbs.onLog = (msg) => setLogs(prev => [...prev.slice(-100), { time: ts(), message: msg }]);
    cbs.onAccumulate = (source, count) =>
      setLogs(prev => [...prev, { time: ts(), message: `📥 ${count} events from ${source}` }]);
    cbs.onDomino = (source, ctx) =>
      setLogs(prev => [...prev, { time: ts(), message: `💥 Domino from ${source}: ${ctx.slice(0, 60)}` }]);
    cbs.onError = (err) =>
      setLogs(prev => [...prev, { time: ts(), message: `❌ ${err}` }]);
  }, [kernel]);

  const handleSubmitLiquid = useCallback(() => {
    if (!liquidText.trim()) return;
    kernel.submitLiquid(liquidText.trim());
    setLiquidText('');
    setStatus('waiting');
  }, [kernel, liquidText]);

  const handleCommit = useCallback(() => {
    kernel.commit();
  }, [kernel]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      handleSubmitLiquid();
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleCommit();
    }
  };

  return (
    <div style={styles.gameContainer}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.charName}>{kernel.block.character.name}</span>
        <span style={styles.gameCode}>Game: {gameId}</span>
        <span style={styles.statusBadge}>{status}</span>
        <button onClick={() => setShowLogs(!showLogs)} style={styles.logToggle}>
          {showLogs ? '📖' : '📋'}
        </button>
      </div>

      {/* Solid zone — the narrative */}
      <div style={styles.solidZone}>
        {solids.length === 0 && (
          <p style={styles.placeholder}>Narrative appears here when you act...</p>
        )}
        {solids.map((s, i) => (
          <div key={i} style={styles.solidEntry}>
            <p style={styles.solidText}>{s}</p>
          </div>
        ))}
        <div ref={solidEndRef} />
      </div>

      {/* Accumulated events indicator */}
      {kernel.block.accumulated.length > 0 && (
        <div style={styles.accIndicator}>
          📥 {kernel.block.accumulated.reduce((n, a) => n + a.events.length, 0)} events accumulated from other characters
        </div>
      )}

      {/* Liquid pending indicator */}
      {kernel.block.pending_liquid && status === 'waiting' && (
        <div style={styles.liquidPending}>
          <span>💧 <em>{kernel.block.pending_liquid}</em></span>
          <button onClick={handleCommit} style={styles.commitButton}>
            ⚡ Commit (⌘↵)
          </button>
        </div>
      )}

      {/* Input */}
      <div style={styles.inputArea}>
        <textarea
          ref={inputRef}
          value={liquidText}
          onChange={e => setLiquidText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What do you do? (⇧↵ to submit, ⌘↵ to commit)"
          style={styles.textarea}
          disabled={status === 'resolving' || status === 'domino_responding'}
        />
        <div style={styles.inputButtons}>
          <button
            onClick={handleSubmitLiquid}
            disabled={!liquidText.trim()}
            style={{ ...styles.button, opacity: liquidText.trim() ? 1 : 0.4 }}
          >
            Submit (⇧↵)
          </button>
          {kernel.block.pending_liquid && (
            <button onClick={handleCommit} style={{ ...styles.button, ...styles.buttonPrimary }}>
              ⚡ Commit (⌘↵)
            </button>
          )}
        </div>
      </div>

      {/* Log panel */}
      {showLogs && (
        <div style={styles.logPanel}>
          <div style={styles.logHeader}>Kernel Log</div>
          {logs.map((l, i) => (
            <div key={i} style={styles.logEntry}>
              <span style={styles.logTime}>{l.time}</span> {l.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// APP
// ============================================================

export default function App() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [gameId, setGameId] = useState('');
  const kernelRef = useRef<Kernel | null>(null);

  const handleStart = useCallback((
    gid: string, charName: string, charState: string, scene: string, apiKey: string, _isCreate: boolean
  ) => {
    const charId = charName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const block = createBlock(charId, charName, charState, scene, apiKey);

    const callbacks: KernelCallbacks = {
      onSolid: () => {},
      onStatusChange: () => {},
      onAccumulate: () => {},
      onDomino: () => {},
      onError: () => {},
      onLog: (msg) => console.log(`[kernel] ${msg}`),
    };

    const kernel = new Kernel(block, gid, callbacks);
    kernelRef.current = kernel;
    setGameId(gid);
    setPhase('playing');
    kernel.start();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => kernelRef.current?.stop();
  }, []);

  if (phase === 'setup') {
    return <SetupScreen onStart={handleStart} />;
  }

  if (!kernelRef.current) return null;

  return <GameScreen kernel={kernelRef.current} gameId={gameId} />;
}

// ============================================================
// STYLES — inline to keep it self-contained
// ============================================================

const styles: Record<string, React.CSSProperties> = {
  setupContainer: {
    maxWidth: 480,
    margin: '60px auto',
    padding: 32,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  title: {
    fontSize: 28,
    fontWeight: 300,
    margin: '0 0 4px 0',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    margin: '0 0 32px 0',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 6,
    color: '#555',
  },
  hint: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 15,
    border: '1px solid #ddd',
    borderRadius: 6,
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  },
  button: {
    padding: '10px 20px',
    fontSize: 14,
    border: '1px solid #ddd',
    borderRadius: 6,
    cursor: 'pointer',
    background: '#fff',
    fontFamily: 'inherit',
  },
  buttonPrimary: {
    background: '#1a1a1a',
    color: '#fff',
    border: '1px solid #1a1a1a',
  },
  backButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    color: '#888',
    padding: 0,
    marginBottom: 16,
  },
  gameContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    background: '#fafafa',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 16px',
    borderBottom: '1px solid #eee',
    background: '#fff',
    fontSize: 13,
  },
  charName: {
    fontWeight: 600,
  },
  gameCode: {
    fontFamily: 'monospace',
    background: '#f0f0f0',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 12,
  },
  statusBadge: {
    marginLeft: 'auto',
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  logToggle: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
  },
  solidZone: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '24px 20px',
    maxWidth: 640,
    margin: '0 auto',
    width: '100%',
  },
  placeholder: {
    color: '#bbb',
    fontStyle: 'italic',
    textAlign: 'center' as const,
    marginTop: 40,
  },
  solidEntry: {
    marginBottom: 20,
    padding: '16px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  solidText: {
    fontSize: 16,
    lineHeight: 1.7,
    color: '#2a2a2a',
    margin: 0,
  },
  accIndicator: {
    padding: '6px 16px',
    background: '#fff8e1',
    fontSize: 12,
    color: '#996',
    textAlign: 'center' as const,
  },
  liquidPending: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    background: '#e8f4fd',
    fontSize: 13,
    color: '#456',
  },
  commitButton: {
    padding: '6px 14px',
    fontSize: 12,
    background: '#1a1a1a',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  inputArea: {
    padding: '12px 16px',
    borderTop: '1px solid #eee',
    background: '#fff',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 15,
    border: '1px solid #ddd',
    borderRadius: 6,
    outline: 'none',
    resize: 'none' as const,
    minHeight: 60,
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  inputButtons: {
    display: 'flex',
    gap: 8,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  logPanel: {
    position: 'fixed' as const,
    bottom: 0,
    right: 0,
    width: 400,
    maxHeight: 300,
    overflowY: 'auto' as const,
    background: '#1a1a1a',
    color: '#ccc',
    fontSize: 11,
    fontFamily: 'monospace',
    padding: 12,
    borderTopLeftRadius: 8,
    zIndex: 999,
  },
  logHeader: {
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    marginBottom: 8,
  },
  logEntry: {
    padding: '2px 0',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
  },
  logTime: {
    color: '#666',
  },
};
