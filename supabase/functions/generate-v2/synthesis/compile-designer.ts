/**
 * Phase 0.7: Designer Prompt Compilation
 */

import type { SynthesisContext, CompiledPrompt } from './types.ts';
import { applyFormatSkill, applyConstraintSkill, applyApertureSkill } from './skills.ts';

const PLATFORM_DESIGNER_PROMPT = `You are Medium-LLM processing designer skill creation.

YOUR ROLE:
- Parse the designer's SKILL_CREATE document
- Validate skill structure
- Output clean, structured skill

OUTPUT FORMAT:
SKILL_PARSED
name: [kebab-case-name]
category: [gathering|aperture|weighting|format|routing|constraint|parsing|display]
applies_to: [player, author, designer]
content: |
  [skill instructions]`;

export function compileDesignerPrompt(context: SynthesisContext): CompiledPrompt {
  let systemPrompt = PLATFORM_DESIGNER_PROMPT;
  
  // Apply skills (designers can have meta-skills that affect how they create skills)
  systemPrompt = applyFormatSkill(systemPrompt, context.skills.format);
  systemPrompt = applyConstraintSkill(systemPrompt, context.skills.constraint);

  const userPrompt = `FRAME: ${context.frame.name}\n\n=== DESIGNER SUBMISSION ===\n${context.trigger.entry.content}\n\n=== TASK ===\nParse and validate this skill creation request.`;

  const maxTokens = applyApertureSkill(2048, context.skills.aperture);
  
  return { systemPrompt, userPrompt, maxTokens };
}

export function parseDesignerResponse(response: string): { name: string; category: string; applies_to: string[]; content: string } | null {
  const match = response.match(/SKILL_PARSED\s*\n([\s\S]*?)(?:\n```|$)/);
  if (!match) {
    const skillMatch = response.match(/SKILL_CREATE\s*\n([\s\S]*?)(?:\n```|$)/);
    if (!skillMatch) return null;
    const block = skillMatch[1];
    const nameMatch = block.match(/name:\s*(.+)/);
    const categoryMatch = block.match(/category:\s*(.+)/);
    const appliesToMatch = block.match(/applies_to:\s*(.+)/);
    const contentMatch = block.match(/content:\s*\|?\s*\n([\s\S]*)/);
    if (!nameMatch || !categoryMatch || !contentMatch) return null;
    return { name: nameMatch[1].trim(), category: categoryMatch[1].trim(), applies_to: appliesToMatch ? appliesToMatch[1].split(',').map(s => s.trim()) : ['player', 'author', 'designer'], content: contentMatch[1].trim() };
  }
  const block = match[1];
  const nameMatch = block.match(/name:\s*(.+)/);
  const categoryMatch = block.match(/category:\s*(.+)/);
  const appliesToMatch = block.match(/applies_to:\s*(.+)/);
  const contentMatch = block.match(/content:\s*\|?\s*\n([\s\S]*)/);
  if (!nameMatch || !categoryMatch || !contentMatch) return null;
  return { name: nameMatch[1].trim(), category: categoryMatch[1].trim(), applies_to: appliesToMatch ? appliesToMatch[1].split(',').map(s => s.trim()) : ['player', 'author', 'designer'], content: contentMatch[1].trim() };
}
