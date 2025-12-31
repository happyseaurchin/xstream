/**
 * Phase 0.7: Author Prompt Compilation
 */

import type { SynthesisContext, CompiledPrompt } from './types.ts';
import { formatContentForPrompt } from './gather.ts';
import { applyFormatSkill, applyConstraintSkill, applyApertureSkill } from './skills.ts';

const PLATFORM_AUTHOR_PROMPT = `You are Medium-LLM processing author world-building content.

YOUR ROLE:
- Parse the author's WORLD_CREATE document
- Validate content type and structure
- Output clean, structured content

OUTPUT FORMAT:
CONTENT_PARSED
type: [location|npc|item|faction|event|lore]
name: [name]
description: |
  [description]`;

export function compileAuthorPrompt(context: SynthesisContext): CompiledPrompt {
  let systemPrompt = PLATFORM_AUTHOR_PROMPT;
  
  // Apply skills
  systemPrompt = applyFormatSkill(systemPrompt, context.skills.format);
  systemPrompt = applyConstraintSkill(systemPrompt, context.skills.constraint);

  const existingContent = formatContentForPrompt(context.worldContent);
  const userPrompt = `FRAME: ${context.frame.name}\n\n=== EXISTING CONTENT ===\n${existingContent}\n\n=== AUTHOR SUBMISSION ===\n${context.trigger.entry.content}\n\n=== TASK ===\nParse and validate this world content submission.`;

  const maxTokens = applyApertureSkill(2048, context.skills.aperture);
  
  return { systemPrompt, userPrompt, maxTokens };
}

export function parseAuthorResponse(response: string): { type: string; name: string; description: string } | null {
  const match = response.match(/CONTENT_PARSED\s*\n([\s\S]*?)(?:\n```|$)/);
  if (!match) {
    const worldMatch = response.match(/WORLD_CREATE\s*\n([\s\S]*?)(?:\n```|$)/);
    if (!worldMatch) return null;
    const block = worldMatch[1];
    const typeMatch = block.match(/type:\s*(.+)/);
    const nameMatch = block.match(/name:\s*(.+)/);
    const descMatch = block.match(/description:\s*\|?\s*\n([\s\S]*)/);
    if (!typeMatch || !nameMatch || !descMatch) return null;
    return { type: typeMatch[1].trim(), name: nameMatch[1].trim(), description: descMatch[1].trim() };
  }
  const block = match[1];
  const typeMatch = block.match(/type:\s*(.+)/);
  const nameMatch = block.match(/name:\s*(.+)/);
  const descMatch = block.match(/description:\s*\|?\s*\n([\s\S]*)/);
  if (!typeMatch || !nameMatch || !descMatch) return null;
  return { type: typeMatch[1].trim(), name: nameMatch[1].trim(), description: descMatch[1].trim() };
}
