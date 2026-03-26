/**
 * Medium-LLM prompt composition — faithful port of build_medium_prompt from kernel.py
 *
 * All prompt patterns are read from the block's prompt_template (layer 2).
 * The kernel just assembles them. A designer can change behaviour by editing the block.
 */

import type { Block } from './types';

export function buildMediumPrompt(
  block: Block,
  triggerType: 'commit' | 'domino',
  dominoContext?: string
): string {
  const char = block.character;
  const tmpl = block.prompt_template;
  const name = char.name;

  // Role
  const role = tmpl.role.replace(/{name}/g, name);

  // Scene
  const sceneSection = `SCENE:\n${block.scene}`;

  // Character
  const charSection = `CHARACTER — ${name}:\n${char.state}`;

  // Solid history (last 3 for continuity)
  const history = char.solid_history.slice(-3);
  const historySection = history.length > 0
    ? `PREVIOUS NARRATIVE (canon for ${name}):\n${history.map(s => `• ${s}`).join('\n')}`
    : '';

  // Accumulated context
  const acc = block.accumulated;
  const accSection = acc.length > 0
    ? `ACCUMULATED CONTEXT (CANON — already happened):\n${acc.map(a =>
        `[Established by ${a.source}'s resolution]\n${a.events.map(e => `• ${e}`).join('\n')}`
      ).join('\n\n')}`
    : 'ACCUMULATED CONTEXT: Nothing accumulated from other characters.';

  // Intention depends on trigger type
  let intentSection: string;
  const dominoMode = block.trigger?.domino_mode ?? 'auto';

  if (triggerType === 'commit') {
    intentSection = `${name}'S COMMITTED INTENTION (liquid):\n${block.pending_liquid ?? ''}`;
  } else {
    intentSection = `DOMINO TRIGGER (what just happened to ${name}):\n${dominoContext ?? ''}`;
    if (block.pending_liquid) {
      intentSection += `\n\n${name}'S PENDING LIQUID (submitted before domino — may be used or overridden by events):\n${block.pending_liquid}`;
    }

    // Mode-specific domino instruction
    if (dominoMode === 'informed') {
      intentSection += `\n\nDOMINO MODE: PERCEPTION ONLY. Narrate what ${name} perceives — sights, sounds, sensations. ${name} does NOT act, speak, decide, or respond. You are a camera, not an actor. The player will decide what to do. Produce empty domino list — do not trigger further cascades.`;
    }
    // 'auto' mode: no extra instruction, medium narrates freely including character action
  }

  // Constraints
  const constraints = tmpl.constraints
    .map(c => `- ${c.replace(/{name}/g, name)}`)
    .join('\n');

  // Output instruction
  const output = tmpl.output_instruction;

  return `${role}

${sceneSection}

${charSection}

${historySection}

${accSection}

${intentSection}

RULES:
${constraints}

Produce:
(a) SOLID — 2-4 sentences, ${name}'s sensory perspective only. Second person present tense ("You step forward", "You hear"). Include quoted speech when characters speak.
(b) EVENTS — 2-5 observable facts others could perceive (NOT internal thoughts)
(c) DOMINO — characters directly affected who must respond immediately.
    Each entry: {"target": "char_id", "context": "what happened to them", "urgency": "immediate"}
    Empty list if action is self-contained.
(d) INTERNAL — one sentence on ${name}'s mental state

${output}
{"solid":"narrative","events":["event"],"domino":[],"internal":"state"}`;
}
