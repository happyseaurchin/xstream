/**
 * Phase 0.7: Context Gathering
 * Collects all relevant context for Medium-LLM synthesis
 */

import type { SynthesisContext, LiquidEntry, ContentEntry, SolidEntry } from './types.ts';

/**
 * Gather all context needed for synthesis.
 * Called when a user commits their liquid entry.
 */
export async function gatherContext(
  supabase: any,
  triggeringLiquidId: string
): Promise<SynthesisContext> {
  
  // 1. Get the triggering liquid entry
  const { data: trigger, error: triggerError } = await supabase
    .from('liquid')
    .select('*')
    .eq('id', triggeringLiquidId)
    .single();
  
  if (triggerError || !trigger) {
    throw new Error(`Triggering liquid entry not found: ${triggeringLiquidId}`);
  }
  
  const frameId = trigger.frame_id;
  if (!frameId) {
    throw new Error('Liquid entry has no frame_id - cannot synthesize without frame context');
  }
  
  // 2. Get frame metadata
  const { data: frame, error: frameError } = await supabase
    .from('frames')
    .select('id, name, pscale_floor, pscale_ceiling')
    .eq('id', frameId)
    .single();
  
  if (frameError || !frame) {
    throw new Error(`Frame not found: ${frameId}`);
  }
  
  // 3. Get ALL liquid entries in this frame (not just committed)
  // This is the key insight: Medium-LLM sees everything that's been submitted
  const { data: allLiquid, error: liquidError } = await supabase
    .from('liquid')
    .select('*')
    .eq('frame_id', frameId)
    .order('created_at', { ascending: true });
  
  if (liquidError) {
    console.error('Error fetching liquid entries:', liquidError);
  }
  
  // 4. Filter to get other users' liquid (for cross-player synthesis)
  const otherLiquid = (allLiquid || []).filter(
    (entry: LiquidEntry) => entry.user_id !== trigger.user_id
  );
  
  // 5. Get author-created world content for this frame
  const { data: worldContent, error: contentError } = await supabase
    .from('content')
    .select('*')
    .eq('frame_id', frameId)
    .eq('active', true)
    .order('created_at', { ascending: true });
  
  if (contentError) {
    console.error('Error fetching world content:', contentError);
  }
  
  // 6. Get recent solid entries (last 5) for narrative continuity
  const { data: recentSolid, error: solidError } = await supabase
    .from('solid')
    .select('*')
    .eq('frame_id', frameId)
    .order('created_at', { descending: true })
    .limit(5);
  
  if (solidError) {
    console.error('Error fetching recent solid:', solidError);
  }
  
  // Reverse to get chronological order (oldest first)
  const chronologicalSolid = (recentSolid || []).reverse();
  
  return {
    trigger: {
      entry: trigger,
      userId: trigger.user_id,
      userName: trigger.user_name,
    },
    allLiquid: allLiquid || [],
    otherLiquid,
    worldContent: worldContent || [],
    recentSolid: chronologicalSolid,
    frame: {
      id: frame.id,
      name: frame.name,
      pscaleFloor: frame.pscale_floor,
      pscaleCeiling: frame.pscale_ceiling,
    },
  };
}

/**
 * Format liquid entries for prompt inclusion.
 * Groups by user and shows their intentions.
 */
export function formatLiquidForPrompt(entries: LiquidEntry[]): string {
  if (entries.length === 0) return 'No submitted actions.';
  
  // Group by user
  const byUser = new Map<string, LiquidEntry[]>();
  for (const entry of entries) {
    const existing = byUser.get(entry.user_name) || [];
    existing.push(entry);
    byUser.set(entry.user_name, existing);
  }
  
  const lines: string[] = [];
  for (const [userName, userEntries] of byUser) {
    const committed = userEntries.filter(e => e.committed);
    const submitted = userEntries.filter(e => !e.committed);
    
    if (committed.length > 0) {
      lines.push(`${userName} (committed): ${committed.map(e => e.content).join('; ')}`);
    }
    if (submitted.length > 0) {
      lines.push(`${userName} (submitted): ${submitted.map(e => e.content).join('; ')}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Format world content for prompt inclusion.
 * Provides location, NPC, and item context.
 */
export function formatContentForPrompt(content: ContentEntry[]): string {
  if (content.length === 0) return 'No established world content.';
  
  // Group by type
  const byType = new Map<string, ContentEntry[]>();
  for (const entry of content) {
    const existing = byType.get(entry.content_type) || [];
    existing.push(entry);
    byType.set(entry.content_type, existing);
  }
  
  const sections: string[] = [];
  
  // Locations first
  const locations = byType.get('location') || [];
  if (locations.length > 0) {
    sections.push('LOCATIONS:\n' + locations.map(l => 
      `- ${l.name}: ${l.data.description || JSON.stringify(l.data)}`
    ).join('\n'));
  }
  
  // NPCs
  const npcs = byType.get('npc') || [];
  if (npcs.length > 0) {
    sections.push('NPCS:\n' + npcs.map(n => 
      `- ${n.name}: ${n.data.description || JSON.stringify(n.data)}`
    ).join('\n'));
  }
  
  // Items
  const items = byType.get('item') || [];
  if (items.length > 0) {
    sections.push('ITEMS:\n' + items.map(i => 
      `- ${i.name}: ${i.data.description || JSON.stringify(i.data)}`
    ).join('\n'));
  }
  
  // Other types
  for (const [type, entries] of byType) {
    if (!['location', 'npc', 'item'].includes(type)) {
      sections.push(`${type.toUpperCase()}:\n` + entries.map(e => 
        `- ${e.name}: ${e.data.description || JSON.stringify(e.data)}`
      ).join('\n'));
    }
  }
  
  return sections.join('\n\n');
}

/**
 * Format recent solid entries for narrative continuity.
 */
export function formatSolidForPrompt(entries: SolidEntry[]): string {
  if (entries.length === 0) return 'This is the beginning of the narrative.';
  
  return entries
    .filter(e => e.narrative) // Only include entries with narrative
    .map(e => e.narrative)
    .join('\n\n---\n\n');
}
