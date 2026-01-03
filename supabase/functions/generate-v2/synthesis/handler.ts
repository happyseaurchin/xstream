/**
 * Phase 0.7 + 0.8 + 0.9.2 + 0.10.3: Medium-LLM Synthesis Handler
 * Now handles CHARACTER_CREATE documents
 * 
 * Phase 0.10.3: Creates placeholder solid FIRST (narrative: null),
 * then updates with actual narrative. All players see spinner via subscription.
 */

import type { SynthesisContext, SynthesisResult } from './types.ts';
import { gatherContext } from './gather.ts';
import { compilePlayerPrompt } from './compile-player.ts';
import { compileAuthorPrompt, parseAuthorResponse } from './compile-author.ts';
import { compileDesignerPrompt, parseDesignerResponse } from './compile-designer.ts';
import { 
  createPlaceholderSolid, 
  updateSolidNarrative, 
  updateSolidContentData,
  updateSolidSkillData,
  routeAuthorResult, 
  routeDesignerResult, 
  markLiquidProcessed 
} from './route.ts';

/**
 * Parse CHARACTER_CREATE document from liquid content.
 */
function parseCharacterCreate(content: string): { name: string; description: string; appearance: string } | null {
  if (!content.includes('CHARACTER_CREATE')) return null;
  
  const nameMatch = content.match(/name:\s*(.+)/);
  const descMatch = content.match(/description:\s*\|?\s*\n([\s\S]*?)(?=\nappearance:|$)/);
  const appearMatch = content.match(/appearance:\s*\|?\s*\n([\s\S]*?)$/);
  
  if (!nameMatch) return null;
  
  return {
    name: nameMatch[1].trim(),
    description: descMatch ? descMatch[1].trim() : '',
    appearance: appearMatch ? appearMatch[1].trim() : '',
  };
}

/**
 * Handle CHARACTER_CREATE document - insert into characters table.
 */
async function handleCharacterCreate(
  supabase: any,
  context: SynthesisContext,
  parsed: { name: string; description: string; appearance: string }
): Promise<{ success: boolean; characterId: string; solidId: string }> {
  const characterId = crypto.randomUUID();
  
  // Insert character
  const { error: charError } = await supabase
    .from('characters')
    .insert({
      id: characterId,
      name: parsed.name,
      description: parsed.description,
      appearance: parsed.appearance,
      created_by: context.trigger.userId,
      inhabited_by: context.trigger.userId, // Auto-inhabit on creation
      is_npc: false,
      cosmology_id: context.frame.cosmologyId || null,
    });
  
  if (charError) {
    console.error('[Medium-LLM] Character insert error:', charError);
    throw new Error('Failed to create character: ' + charError.message);
  }
  
  console.log('[Medium-LLM] Created character:', characterId, parsed.name);
  
  // Store confirmation in solid (using existing columns: narrative, content_data, face)
  const solidId = crypto.randomUUID();
  const confirmationText = `**${parsed.name}** enters the world.\n\n${parsed.description}\n\n${parsed.appearance}`;
  
  const { error: solidError } = await supabase
    .from('solid')
    .insert({
      id: solidId,
      frame_id: context.frame.id,
      face: 'character',
      narrative: confirmationText,
      source_liquid_ids: [context.trigger.entry.id],
      triggering_user_id: context.trigger.userId,
      participant_user_ids: [context.trigger.userId],
      content_data: {
        type: 'character_created',
        character_id: characterId,
        character_name: parsed.name,
      },
      model_used: 'none',
      tokens_used: { input: 0, output: 0 },
    });
  
  if (solidError) {
    console.error('[Medium-LLM] Solid insert error:', solidError);
    // Character created, solid failed - non-fatal
  }
  
  return { success: true, characterId, solidId };
}

/**
 * Trigger Hard-LLM coordination after player synthesis.
 * This updates coordinates, proximity, and operational frames.
 */
async function triggerHardLLM(
  context: SynthesisContext,
  narrative: string
): Promise<void> {
  // Only trigger if we have characters and a cosmology
  if (context.characters.length === 0) {
    console.log('[Medium-LLM] No characters found, skipping Hard-LLM');
    return;
  }
  
  if (!context.frame.cosmologyId) {
    console.log('[Medium-LLM] No cosmology, skipping Hard-LLM');
    return;
  }
  
  const characterIds = context.characters.map(c => c.id);
  
  console.log('[Medium-LLM] Triggering Hard-LLM coordination for', characterIds.length, 'characters');
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const response = await fetch(
      `${supabaseUrl}/functions/v1/hard-llm`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          trigger: 'synthesis-complete',
          frame_id: context.frame.id,
          character_ids: characterIds,
          narrative: narrative,
          action_pscale: 0,  // Default to pscale 0 for now
        }),
      }
    );
    
    if (response.ok) {
      const result = await response.json();
      console.log('[Medium-LLM] Hard-LLM coordination complete:', {
        thinking: result.thinking_summary?.slice(0, 80) + '...',
        coordinate_updates: result.coordinate_updates?.length || 0,
        proximity_updates: result.proximity_updates?.length || 0,
        operational_frames: result.operational_frames?.length || 0,
      });
    } else {
      const errorText = await response.text();
      console.warn('[Medium-LLM] Hard-LLM coordination failed:', response.status, errorText);
    }
  } catch (error) {
    console.error('[Medium-LLM] Hard-LLM coordination error:', error);
    // Don't fail synthesis if Hard-LLM fails
  }
}

export async function handleMediumMode(
  supabase: any,
  anthropicKey: string,
  liquidId: string,
  getOrCreateFramePackage: ((supabase: any, frameId: string, userId: string) => Promise<string>) | null,
  informational: boolean = false
): Promise<{ success: boolean; result?: SynthesisResult; stored?: { solidId: string; contentId?: string; skillId?: string; characterId?: string }; error?: string }> {
  let placeholderSolidId: string | null = null;
  
  try {
    console.log('[Medium-LLM] Gathering context for liquid:', liquidId, informational ? '(informational)' : '');
    const context = await gatherContext(supabase, liquidId);
    const face = context.trigger.entry.face;
    const content = context.trigger.entry.content;
    
    console.log('[Medium-LLM] Face:', face, 'Frame:', context.frame.name);
    console.log('[Medium-LLM] Skills loaded:', Object.keys(context.skills).filter(k => context.skills[k as keyof typeof context.skills]).join(', ') || 'none');
    console.log('[Medium-LLM] Characters:', context.characters.map(c => c.name).join(', ') || 'none');
    
    // Check for CHARACTER_CREATE document (character face)
    if ((face === 'character' || face === 'player') && content.includes('CHARACTER_CREATE')) {
      const parsed = parseCharacterCreate(content);
      if (parsed) {
        console.log('[Medium-LLM] Detected CHARACTER_CREATE document for:', parsed.name);
        const charResult = await handleCharacterCreate(supabase, context, parsed);
        await markLiquidProcessed(supabase, [context.trigger.entry.id]);
        
        return {
          success: true,
          result: {
            success: true,
            face: 'character',
            narrative: `${parsed.name} has been created.`,
            sourceLiquidIds: [context.trigger.entry.id],
            participantUserIds: [context.trigger.userId],
            model: 'none',
            tokens: { input: 0, output: 0 },
          },
          stored: {
            solidId: charResult.solidId,
            characterId: charResult.characterId,
          },
        };
      }
    }
    
    // Phase 0.10.3: Create placeholder solid FIRST (shows spinner for all players)
    // Only for non-informational requests that will write to solid
    const compileFace = face === 'character' ? 'player' : face;
    if (!informational) {
      placeholderSolidId = await createPlaceholderSolid(
        supabase, 
        context, 
        face === 'player' ? 'character' : face as 'character' | 'author' | 'designer'
      );
      console.log('[Medium-LLM] Created placeholder solid:', placeholderSolidId);
    }
    
    let compiled;
    switch (compileFace) {
      case 'player': compiled = compilePlayerPrompt(context); break;
      case 'author': compiled = compileAuthorPrompt(context); break;
      case 'designer': compiled = compileDesignerPrompt(context); break;
      default: throw new Error(`Unknown face: ${face}`);
    }
    
    console.log('[Medium-LLM] Compiled prompt, maxTokens:', compiled.maxTokens);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: compiled.maxTokens + 8000, thinking: { type: 'enabled', budget_tokens: 8000 }, system: compiled.systemPrompt, messages: [{ role: 'user', content: compiled.userPrompt }] }),
    });
    if (!response.ok) throw new Error(`Claude API error: ${response.status}`);
    const claudeResponse = await response.json();
    let generatedText = '';
    for (const block of claudeResponse.content || []) { if (block.type === 'text') { generatedText = block.text; break; } }
    console.log('[Medium-LLM] Generated text length:', generatedText.length);
    
    const tokens = { input: claudeResponse.usage?.input_tokens || 0, output: claudeResponse.usage?.output_tokens || 0 };
    let result: SynthesisResult;
    let stored: { solidId: string; contentId?: string; skillId?: string } | undefined;
    
    switch (compileFace) {
      case 'player': {
        result = { 
          success: true, 
          face: 'player', 
          narrative: generatedText, 
          sourceLiquidIds: context.allLiquid.filter(e => e.committed && (e.face === 'player' || e.face === 'character')).map(e => e.id), 
          participantUserIds: [...new Set(context.allLiquid.filter(e => e.face === 'player' || e.face === 'character').map(e => e.user_id))], 
          model: 'claude-sonnet-4-20250514', 
          tokens 
        };
        
        if (!informational && placeholderSolidId) {
          // Phase 0.10.3: Update the placeholder with actual narrative
          await updateSolidNarrative(supabase, placeholderSolidId, generatedText, result.model, tokens);
          stored = { solidId: placeholderSolidId };
          
          // Phase 0.8: Trigger Hard-LLM after player synthesis
          await triggerHardLLM(context, generatedText);
        } else { 
          console.log('[Medium-LLM] Informational mode - skipping solid storage and Hard-LLM'); 
        }
        break;
      }
      case 'author': {
        const parsed = parseAuthorResponse(generatedText);
        if (!parsed) throw new Error('Failed to parse author response');
        result = { 
          success: true, 
          face: 'author', 
          contentData: parsed, 
          sourceLiquidIds: [context.trigger.entry.id], 
          participantUserIds: [context.trigger.userId], 
          model: 'claude-sonnet-4-20250514', 
          tokens 
        };
        
        if (placeholderSolidId) {
          // Update placeholder with content_data
          await updateSolidContentData(supabase, placeholderSolidId, {
            ...parsed,
          }, result.model, tokens);
          
          // Also create in content table
          const { data: contentData } = await supabase
            .from('content')
            .insert({
              frame_id: context.frame.id,
              author_id: context.trigger.userId,
              content_type: parsed.type,
              name: parsed.name,
              data: parsed.data,
              active: true,
            })
            .select('id')
            .single();
          
          stored = { solidId: placeholderSolidId, contentId: contentData?.id };
        } else {
          // Fallback to old method
          const authorResult = await routeAuthorResult(supabase, context, result);
          stored = { solidId: authorResult.solid.id, contentId: authorResult.contentId };
        }
        break;
      }
      case 'designer': {
        const parsed = parseDesignerResponse(generatedText);
        if (!parsed) throw new Error('Failed to parse designer response');
        result = { 
          success: true, 
          face: 'designer', 
          skillData: parsed, 
          sourceLiquidIds: [context.trigger.entry.id], 
          participantUserIds: [context.trigger.userId], 
          model: 'claude-sonnet-4-20250514', 
          tokens 
        };
        
        if (!getOrCreateFramePackage) throw new Error('Designer mode requires getOrCreateFramePackage');
        
        if (placeholderSolidId) {
          // Create skill first
          const packageId = await getOrCreateFramePackage(supabase, context.frame.id, context.trigger.userId);
          const skillId = crypto.randomUUID();
          await supabase.from('skills').insert({
            id: skillId,
            name: parsed.name,
            package_id: packageId,
            category: parsed.category,
            applies_to: parsed.applies_to,
            content: parsed.content,
          });
          
          // Update placeholder with skill_data
          await updateSolidSkillData(supabase, placeholderSolidId, {
            skill_id: skillId,
            ...parsed,
          }, result.model, tokens);
          
          stored = { solidId: placeholderSolidId, skillId };
        } else {
          // Fallback to old method
          const designerResult = await routeDesignerResult(supabase, context, result, getOrCreateFramePackage);
          stored = { solidId: designerResult.solid.id, skillId: designerResult.skillId };
        }
        break;
      }
    }
    
    if (!informational) await markLiquidProcessed(supabase, result.sourceLiquidIds);
    return { success: true, result, stored };
  } catch (error) {
    console.error('[Medium-LLM] Error:', error);
    
    // If we created a placeholder but synthesis failed, delete it
    if (placeholderSolidId) {
      console.log('[Medium-LLM] Cleaning up failed placeholder:', placeholderSolidId);
      await supabase.from('solid').delete().eq('id', placeholderSolidId);
    }
    
    return { success: false, error: error.message };
  }
}
