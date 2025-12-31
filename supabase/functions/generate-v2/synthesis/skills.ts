/**
 * Phase 0.7: Skill Loading for Synthesis
 * 
 * Loads skills for a given face and frame.
 * Resolution order: platform → frame (by priority) → user
 */

import type { Skill, SkillSet } from './types.ts';

/**
 * Load skills for synthesis.
 * Called during context gathering to populate context.skills
 */
export async function loadSkillsForSynthesis(
  supabase: any,
  face: string,
  frameId: string,
  userId: string | null = null
): Promise<SkillSet> {
  const skillSet: SkillSet = {};

  // 1. Platform skills (always loaded first)
  const { data: platformSkills, error: platformError } = await supabase
    .from('skills')
    .select(`
      id, name, category, applies_to, content,
      packages!inner(name, level)
    `)
    .eq('packages.level', 'platform')
    .contains('applies_to', [face]);

  if (platformError) {
    console.error('[Skills] Error loading platform skills:', platformError);
  } else {
    for (const skill of platformSkills || []) {
      skillSet[skill.category as keyof SkillSet] = {
        id: skill.id,
        name: skill.name,
        category: skill.category,
        applies_to: skill.applies_to,
        content: skill.content,
        package_name: skill.packages?.name,
        package_level: 'platform',
      };
    }
  }

  // 2. Frame skills (override platform)
  const { data: framePackages, error: fpError } = await supabase
    .from('frame_packages')
    .select('package_id, priority')
    .eq('frame_id', frameId)
    .order('priority', { ascending: true });

  if (!fpError && framePackages?.length > 0) {
    const packageIds = framePackages.map((fp: any) => fp.package_id);
    
    const { data: frameSkills, error: fsError } = await supabase
      .from('skills')
      .select(`
        id, name, category, applies_to, content,
        package_id,
        packages!inner(name, level)
      `)
      .in('package_id', packageIds)
      .contains('applies_to', [face]);

    if (!fsError) {
      // Sort by priority
      const priorityMap = new Map(framePackages.map((fp: any) => [fp.package_id, fp.priority]));
      const sortedSkills = (frameSkills || []).sort((a: any, b: any) => {
        return (priorityMap.get(a.package_id) || 0) - (priorityMap.get(b.package_id) || 0);
      });

      for (const skill of sortedSkills) {
        // Frame skills can override platform (except guard)
        if (skill.category !== 'guard') {
          skillSet[skill.category as keyof SkillSet] = {
            id: skill.id,
            name: skill.name,
            category: skill.category,
            applies_to: skill.applies_to,
            content: skill.content,
            package_name: skill.packages?.name,
            package_level: skill.packages?.level,
          };
        }
      }
    }
  }

  // 3. User skills (override frame - future)
  // For now, user skills are draft-only, not applied in synthesis

  console.log('[Skills] Loaded for', face, ':', 
    Object.entries(skillSet).map(([cat, s]) => `${cat}:${s.name}(${s.package_level})`).join(', ') || 'none'
  );

  return skillSet;
}

/**
 * Apply format skill to system prompt.
 * Format skills modify how the output is styled.
 */
export function applyFormatSkill(basePrompt: string, skill: Skill | undefined): string {
  if (!skill) return basePrompt;
  
  return `${basePrompt}

---
FORMAT RULES (from skill: ${skill.name}):
${skill.content}`;
}

/**
 * Apply constraint skill to system prompt.
 * Constraint skills add rules and limitations.
 */
export function applyConstraintSkill(basePrompt: string, skill: Skill | undefined): string {
  if (!skill) return basePrompt;
  
  return `${basePrompt}

---
CONSTRAINTS (from skill: ${skill.name}):
${skill.content}`;
}

/**
 * Apply aperture skill to maxTokens.
 * Aperture skills control response length.
 */
export function applyApertureSkill(baseTokens: number, skill: Skill | undefined): number {
  if (!skill) return baseTokens;
  
  // Parse aperture content for token limit
  // Expected format: "max_tokens: 256" or just a number
  const match = skill.content.match(/max_tokens?:\s*(\d+)/i) || skill.content.match(/^(\d+)$/);
  if (match) {
    const tokens = parseInt(match[1], 10);
    if (tokens > 0 && tokens <= 4096) {
      console.log(`[Skills] Aperture override: ${baseTokens} → ${tokens}`);
      return tokens;
    }
  }
  
  return baseTokens;
}
