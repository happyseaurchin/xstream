/**
 * Block Factory — creates character blocks for new games.
 *
 * The block IS the character. Creating a block creates a character.
 * The prompt_template is layer 2 — designer-editable.
 */

import type { Block } from './types';

// Default scene — the Broken Drum tavern from the coordination spec tests
const DEFAULT_SCENE = `The Broken Drum tavern. Evening. Fire burning low in a stone hearth. Rain outside. Woodsmoke and ale. A few quiet background patrons. A stranger in a dark cloak entered recently and stands near the hearth, hood up, dripping rainwater.`;

// Default prompt template — the tested pattern from medium-llm-coordination-spec.md
const DEFAULT_PROMPT_TEMPLATE = {
  role: 'You are the medium-LLM for {name} in a narrative coordination system.',
  constraints: [
    '{name} can ONLY perceive what their POSITION and ATTENTION allow.',
    'Accumulated events are ESTABLISHED FACT — incorporate them.',
    'Physical reality matters: distance, timing, what is reachable.',
    'If accumulated events contradict the intention, resolve honestly.',
    'Do not invent major events not implied by the liquid or accumulated context.',
    'Include quoted speech when characters speak — use their actual words.',
    'Write in second person present tense: "You step forward", "You hear".',
  ],
  output_instruction: 'Respond in JSON only. No markdown. No backticks.',
};

export function createBlock(
  charId: string,
  charName: string,
  charState: string,
  scene: string,
  apiKey: string,
  model = 'claude-haiku-4-5-20251001'
): Block {
  return {
    character: {
      id: charId,
      name: charName,
      state: charState,
      solid_history: [],
    },
    scene: scene || DEFAULT_SCENE,
    trigger: {
      poll_interval_s: 3,
      domino_fires_medium: true,
      accumulation_threshold: 0,
      domino_mode: 'auto' as const,
    },
    medium: {
      model,
      api_key: apiKey,
      max_tokens: 800,
    },
    prompt_template: { ...DEFAULT_PROMPT_TEMPLATE },
    pending_liquid: null,
    accumulated: [],
    outbox: {
      solid: null,
      events: [],
      domino: [],
      sequence: 0,
      timestamp: null,
    },
    status: 'idle',
    last_seen: {},
  };
}

// Generate a 6-character game code
export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export { DEFAULT_SCENE };
