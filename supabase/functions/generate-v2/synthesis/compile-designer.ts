/**
 * Phase 0.7: Designer Synthesis Prompt Compiler
 * 
 * Designer creates skills that modify how the system operates.
 * This mostly reuses the existing soft-mode skill creation,
 * but through the Medium-LLM synthesis pathway.
 */

import type { SynthesisContext, CompiledPrompt } from './types.ts';

/**
 * Compile the synthesis prompt for designer face.
 * Creates skills that become part of the compilation rules.
 */
export function compileDesignerPrompt(context: SynthesisContext): CompiledPrompt {
  
  const systemPrompt = `You are Medium-LLM helping a designer create skills for the narrative coordination system.

YOUR ROLE:
Transform the designer's request into a valid skill document.

SKILL CATEGORIES (choose the most appropriate):
- format: How responses should be styled/formatted
- gathering: How to collect context and information  
- aperture: What scope/focus to apply
- weighting: How to prioritize different factors
- routing: How to direct flow between components
- constraint: Limitations and boundaries
- parsing: How to interpret input
- display: How output should be presented

GUARDED CATEGORY:
- guard: Platform-level restrictions (CANNOT be created by users)

APPLIES_TO OPTIONS:
- player: Characters taking actions in the narrative
- author: World-building and lore creation  
- designer: System modification and skill creation

OUTPUT FORMAT:
Respond with ONLY a SKILL_CREATE block:

SKILL_CREATE
name: kebab-case-skill-name
category: [one of the categories above]
applies_to: [comma-separated faces]
content: |
  [The actual skill content - instructions for the LLM]

SKILL CONTENT GUIDELINES:
- Write in imperative voice ("Do X", "Always Y", "Never Z")
- Be specific and actionable
- Consider how it will affect prompt compilation
- Keep it concise but complete

OUTPUT:
Respond with ONLY the SKILL_CREATE block. No explanations, no questions.`;

  const userPrompt = `DESIGNER REQUEST:\n${context.trigger.entry.content}\n\nFRAME: ${context.frame.name} (${context.frame.id.slice(0, 8)})`;
  
  return {
    systemPrompt,
    userPrompt,
    maxTokens: 2048,
  };
}

/**
 * Parse designer response into skill data.
 * Reuses the same format as soft-mode skill creation.
 */
export function parseDesignerResponse(response: string): {
  name: string;
  category: string;
  applies_to: string[];
  content: string;
} | null {
  const skillMatch = response.match(/SKILL_CREATE\s*\n([\s\S]*?)(?:\n```|$)/);
  if (!skillMatch) return null;

  const block = skillMatch[1];
  
  const nameMatch = block.match(/name:\s*(.+)/);
  const categoryMatch = block.match(/category:\s*(.+)/);
  const appliesToMatch = block.match(/applies_to:\s*(.+)/);
  const contentMatch = block.match(/content:\s*\|?\s*\n([\s\S]*)/);

  if (!nameMatch || !categoryMatch || !contentMatch) {
    return null;
  }

  const name = nameMatch[1].trim();
  const category = categoryMatch[1].trim();
  const appliesTo = appliesToMatch 
    ? appliesToMatch[1].split(',').map(s => s.trim())
    : ['player', 'author', 'designer'];
  const content = contentMatch[1].trim();

  const validCategories = ['gathering', 'aperture', 'weighting', 'format', 'routing', 'constraint', 'parsing', 'display'];
  if (!validCategories.includes(category)) {
    console.warn(`Invalid category: ${category}`);
    return null;
  }

  if (category === 'guard') {
    console.warn('Cannot create guard skills');
    return null;
  }

  return { name, category, applies_to: appliesTo, content };
}
