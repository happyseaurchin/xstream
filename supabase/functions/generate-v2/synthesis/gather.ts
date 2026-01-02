/**
 * Phase 0.7 + 0.8 + 0.9.3: Context Gathering
 * Now looks up character names from liquid.character_id
 */

import type { SynthesisContext, LiquidEntry, ContentEntry, SolidEntry, SkillSet, CharacterInfo } from './types.ts';
import { loadSkillsForSynthesis } from './skills.ts';

export async function gatherContext(supabase: any, triggeringLiquidId: string): Promise<SynthesisContext> {
  const { data: trigger, error: triggerError } = await supabase.from('liquid').select('*').eq('id', triggeringLiquidId).single();
  if (triggerError || !trigger) throw new Error(`Triggering liquid entry not found: ${triggeringLiquidId}`);
  
  const frameId = trigger.frame_id;
  if (!frameId) throw new Error('Liquid entry has no frame_id');
  
  // Phase 0.8: Include cosmology_id for Hard-LLM
  const { data: frame, error: frameError } = await supabase
    .from('frames')
    .select('id, name, pscale_floor, pscale_ceiling, cosmology_id')
    .eq('id', frameId)
    .single();
  if (frameError || !frame) throw new Error(`Frame not found: ${frameId}`);
  
  const { data: allLiquid } = await supabase.from('liquid').select('*').eq('frame_id', frameId).order('created_at', { ascending: true });
  const otherLiquid = (allLiquid || []).filter((entry: LiquidEntry) => entry.user_id !== trigger.user_id);
  
  const { data: worldContent } = await supabase.from('content').select('*').eq('frame_id', frameId).eq('active', true).order('created_at', { ascending: true });
  
  const { data: recentSolid } = await supabase.from('solid').select('*').eq('frame_id', frameId).order('created_at', { descending: true }).limit(5);
  const chronologicalSolid = (recentSolid || []).reverse();
  
  // Load skills for this face and frame
  const skills = await loadSkillsForSynthesis(supabase, trigger.face, frameId, trigger.user_id);
  
  // Phase 0.9.3: Collect character_ids from liquid entries and look up names
  const characterIds = [...new Set((allLiquid || [])
    .filter((e: any) => e.character_id)
    .map((e: any) => e.character_id))];
  
  let characters: CharacterInfo[] = [];
  const characterNameMap = new Map<string, string>(); // character_id -> name
  
  if (characterIds.length > 0) {
    const { data: charData } = await supabase
      .from('characters')
      .select('id, name, inhabited_by, is_npc')
      .in('id', characterIds);
    
    for (const c of charData || []) {
      characterNameMap.set(c.id, c.name);
      characters.push({
        id: c.id,
        name: c.name,
        user_id: c.inhabited_by,
        is_npc: c.is_npc || false,
      });
    }
    
    console.log('[Gather] Character map:', Object.fromEntries(characterNameMap));
  }
  
  // Also check for characters via inhabited_by (fallback)
  const participantUserIds = [...new Set((allLiquid || []).map((e: LiquidEntry) => e.user_id))];
  if (participantUserIds.length > 0 && frame.cosmology_id) {
    const { data: inhabitedChars } = await supabase
      .from('characters')
      .select('id, name, inhabited_by, is_npc')
      .in('inhabited_by', participantUserIds);
    
    for (const c of inhabitedChars || []) {
      if (!characterNameMap.has(c.id)) {
        characterNameMap.set(c.id, c.name);
        characters.push({
          id: c.id,
          name: c.name,
          user_id: c.inhabited_by,
          is_npc: c.is_npc || false,
        });
      }
    }
  }
  
  // Attach character name lookup to context for use in formatting
  const contextWithLookup: SynthesisContext & { characterNameMap?: Map<string, string> } = {
    trigger: { entry: trigger, userId: trigger.user_id, userName: trigger.user_name },
    allLiquid: allLiquid || [],
    otherLiquid,
    worldContent: worldContent || [],
    recentSolid: chronologicalSolid,
    frame: {
      id: frame.id,
      name: frame.name,
      pscaleFloor: frame.pscale_floor,
      pscaleCeiling: frame.pscale_ceiling,
      cosmologyId: frame.cosmology_id,
    },
    skills,
    characters,
  };
  
  // Store characterNameMap on context for formatLiquidForPrompt
  (contextWithLookup as any)._characterNameMap = characterNameMap;
  
  return contextWithLookup;
}

/**
 * Format liquid entries for prompt, using character names when available
 */
export function formatLiquidForPrompt(entries: LiquidEntry[], characterNameMap?: Map<string, string>): string {
  if (entries.length === 0) return 'No submitted actions.';
  
  // Group by character/user
  const byActor = new Map<string, { entries: LiquidEntry[], committed: boolean }[]>();
  
  for (const entry of entries) {
    // Use character name if available, otherwise user_name
    const actorName = (entry as any).character_id && characterNameMap?.has((entry as any).character_id)
      ? characterNameMap.get((entry as any).character_id)!
      : entry.user_name;
    
    const existing = byActor.get(actorName) || [];
    existing.push({ entries: [entry], committed: entry.committed });
    byActor.set(actorName, existing);
  }
  
  const lines: string[] = [];
  for (const [actorName, actorEntries] of byActor) {
    const committed = actorEntries.filter(e => e.committed).flatMap(e => e.entries);
    const submitted = actorEntries.filter(e => !e.committed).flatMap(e => e.entries);
    
    if (committed.length > 0) {
      lines.push(`${actorName} (committed): ${committed.map(e => e.content).join('; ')}`);
    }
    if (submitted.length > 0) {
      lines.push(`${actorName} (submitted): ${submitted.map(e => e.content).join('; ')}`);
    }
  }
  
  return lines.join('\n');
}

export function formatContentForPrompt(content: ContentEntry[]): string {
  if (content.length === 0) return 'No established world content.';
  const byType = new Map<string, ContentEntry[]>();
  for (const entry of content) {
    const existing = byType.get(entry.content_type) || [];
    existing.push(entry);
    byType.set(entry.content_type, existing);
  }
  const sections: string[] = [];
  const locations = byType.get('location') || [];
  if (locations.length > 0) sections.push('LOCATIONS:\n' + locations.map(l => `- ${l.name}: ${l.data.description || JSON.stringify(l.data)}`).join('\n'));
  const npcs = byType.get('npc') || [];
  if (npcs.length > 0) sections.push('NPCS:\n' + npcs.map(n => `- ${n.name}: ${n.data.description || JSON.stringify(n.data)}`).join('\n'));
  const items = byType.get('item') || [];
  if (items.length > 0) sections.push('ITEMS:\n' + items.map(i => `- ${i.name}: ${i.data.description || JSON.stringify(i.data)}`).join('\n'));
  for (const [type, entries] of byType) {
    if (!['location', 'npc', 'item'].includes(type)) sections.push(`${type.toUpperCase()}:\n` + entries.map(e => `- ${e.name}: ${e.data.description || JSON.stringify(e.data)}`).join('\n'));
  }
  return sections.join('\n\n');
}

export function formatSolidForPrompt(entries: SolidEntry[]): string {
  if (entries.length === 0) return 'This is the beginning of the narrative.';
  return entries.filter(e => e.narrative).map(e => e.narrative).join('\n\n---\n\n');
}
