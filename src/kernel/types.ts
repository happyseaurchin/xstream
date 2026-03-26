/**
 * Block types — the canonical shape of a character's JSON block.
 * Layer 2 (designer-editable) + Layer 0 (kernel-managed runtime).
 */

export interface Block {
  // ── Layer 2: Content (designer-editable) ──
  character: {
    id: string;
    name: string;
    state: string;
    solid_history: string[];
  };
  scene: string;
  trigger: {
    poll_interval_s: number;
    domino_fires_medium: boolean;
    accumulation_threshold: number;
    domino_mode: 'auto' | 'informed' | 'silent';
  };
  medium: {
    model: string;
    api_key: string;
    max_tokens: number;
  };
  prompt_template: {
    role: string;
    constraints: string[];
    output_instruction: string;
  };

  // ── Layer 0: Runtime state (kernel-managed) ──
  pending_liquid: string | null;
  accumulated: { source: string; events: string[] }[];
  outbox: {
    solid: string | null;
    events: string[];
    domino: DominoOut[];
    sequence: number;
    timestamp: string | null;
  };
  status: 'idle' | 'waiting' | 'resolving' | 'domino_responding';
  last_seen: Record<string, number>;
}

export interface DominoOut {
  target: string;
  context: string;
  urgency: string;
}

export interface MediumResult {
  solid?: string;
  events?: string[];
  domino?: DominoOut[];
  internal?: string;
  liquid_status?: string;
}

export interface AccumulatedEvent {
  source: string;
  events: string[];
  sequence: number;
}

export interface DominoSignal {
  source: string;
  context: string;
  urgency: string;
  sequence: number;
}
