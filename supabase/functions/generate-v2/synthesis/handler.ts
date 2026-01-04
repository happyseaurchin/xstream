/**
 * Phase 0.10.3: Medium-LLM Synthesis Handler
 * 
 * Unified synthesis for all faces:
 * - Player/Character: Synthesize actions → narrative
 * - Author: Synthesize content → world description
 * - Designer: Synthesize skill requests → skill document
 * 
 * Hard-LLM handles classification and entity filing for all faces.
 * 
 * Phase 0.10.3.3: Early liquid deletion
 * - DB liquid deleted IMMEDIATELY after context gathered (content in memory)
 * - This allows users to submit new liquid during synthesis without it being deleted
 * - Placeholder solid triggers client-side liquid clearing via realtime
 */

import type { SynthesisContext, SynthesisResult } from './types.ts';
import { gatherContext } from './gather.ts';
import { compilePlayerPrompt } from './compile-player.ts';
import { compileAuthorPrompt } from './compile-author.ts';
import { compileDesignerPrompt, parseDesignerResponse } from './compile-designer.ts';
import { 
  createPlaceholderSolid, 
  updateSolidNarrative, 
  updateSolidSkillData,
  markLiquidProcessed 
} from './route.ts';

/**
 * Helper: Check if face is character-type (includes legacy 'player')
 */
function isCharacterFace(face: string): boolean {
  return face === 'character' || face === 'player';
}

/**
 * Trigger Hard-LLM coordination after synthesis.
 * For player: Updates coordinates, proximity, operational frames
 * For author: Classifies content, files entities to characters/content tables
 */
async function triggerHardLLM(
  context: SynthesisContext,
  narrative: string,
  face: string
): Promise<void> {
  // Skip if no cosmology (Hard-LLM needs cosmology context)
  if (!context.frame.cosmologyId) {
    console.log('[Medium-LLM] No cosmology, skipping Hard-LLM');
    return;
  }
  
  // For player face: need characters
  // For author face: always trigger for content classification
  if (face === 'player' || face === 'character') {
    if (context.characters.length === 0) {
      console.log('[Medium-LLM] No characters found, skipping Hard-LLM');
      return;
    }
  }
  
  const characterIds = context.characters.map(c => c.id);
  
  console.log('[Medium-LLM] Triggering Hard-LLM:', {
    face,
    characterCount: characterIds.length,
    hasNarrative: !!narrative,
  });
  
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
          trigger: face === 'author' ? 'author-synthesis' : 'synthesis-complete',
          frame_id: context.frame.id,
          character_ids: characterIds,
          narrative: narrative,
          face: face,
          action_pscale: 0,  // Default to pscale 0
          // Include liquid content for author classification (from gathered context, not DB)
          liquid_content: face === 'author' 
            ? context.allLiquid.filter(e => e.face === 'author').map(e => ({
                user_id: e.user_id,
                user_name: e.user_name,
                content: e.content,
              }))
            : undefined,
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
        entities_filed: result.entities_filed?.length || 0,
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
    
    console.log('[Medium-LLM] Face:', face, 'Frame:', context.frame.name);
    console.log('[Medium-LLM] Skills loaded:', Object.keys(context.skills).filter(k => context.skills[k as keyof typeof context.skills]).join(', ') || 'none');
    console.log('[Medium-LLM] Characters:', context.characters.map(c => c.name).join(', ') || 'none');
    console.log('[Medium-LLM] All liquid entries:', context.allLiquid.length);
    
    // Phase 0.10.3.3: Delete DB liquid EARLY - content is now in context.allLiquid (memory)
    // This allows users to submit new liquid during synthesis without it being deleted
    // Works for ALL faces because Hard-LLM receives content from context, not from DB
    if (!informational) {
      const liquidIdsToDelete = context.allLiquid
        .filter(e => isCharacterFace(face) 
          ? isCharacterFace(e.face) 
          : e.face === face)
        .map(e => e.id);
      console.log('[Medium-LLM] Deleting DB liquid early:', liquidIdsToDelete.length, 'entries for face:', face);
      await markLiquidProcessed(supabase, liquidIdsToDelete);
    }
    
    // Create placeholder solid (shows "synthesising" spinner for all users)
    // This triggers client-side liquid clearing via realtime subscription
    const solidFace = face === 'player' ? 'character' : face as 'character' | 'author' | 'designer';
    if (!informational) {
      placeholderSolidId = await createPlaceholderSolid(supabase, context, solidFace);
      console.log('[Medium-LLM] Created placeholder solid:', placeholderSolidId);
    }
    
    // Compile prompt based on face
    // Note: 'character' and 'player' both use player prompt
    const compileFace = (face === 'character' || face === 'player') ? 'player' : face;
    let compiled;
    switch (compileFace) {
      case 'player': compiled = compilePlayerPrompt(context); break;
      case 'author': compiled = compileAuthorPrompt(context); break;
      case 'designer': compiled = compileDesignerPrompt(context); break;
      default: throw new Error(`Unknown face: ${face}`);
    }
    
    console.log('[Medium-LLM] Compiled prompt, maxTokens:', compiled.maxTokens);
    
    // Call Claude with extended thinking
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'x-api-key': anthropicKey, 
        'anthropic-version': '2023-06-01' 
      },
      body: JSON.stringify({ 
        model: 'claude-sonnet-4-20250514', 
        max_tokens: compiled.maxTokens + 8000, 
        thinking: { type: 'enabled', budget_tokens: 8000 }, 
        system: compiled.systemPrompt, 
        messages: [{ role: 'user', content: compiled.userPrompt }] 
      }),
    });
    
    if (!response.ok) throw new Error(`Claude API error: ${response.status}`);
    const claudeResponse = await response.json();
    
    // Extract text response (skip thinking blocks)
    let generatedText = '';
    for (const block of claudeResponse.content || []) { 
      if (block.type === 'text') { 
        generatedText = block.text; 
        break; 
      } 
    }
    console.log('[Medium-LLM] Generated text length:', generatedText.length);
    
    const tokens = { 
      input: claudeResponse.usage?.input_tokens || 0, 
      output: claudeResponse.usage?.output_tokens || 0 
    };
    
    let result: SynthesisResult;
    let stored: { solidId: string; contentId?: string; skillId?: string } | undefined;
    
    switch (compileFace) {
      case 'player': {
        // Player/Character face: narrative synthesis
        const playerLiquidIds = context.allLiquid
          .filter(e => e.face === 'player' || e.face === 'character')
          .map(e => e.id);
        
        result = { 
          success: true, 
          face: 'player', 
          narrative: generatedText, 
          sourceLiquidIds: playerLiquidIds, 
          participantUserIds: [...new Set(
            context.allLiquid
              .filter(e => e.face === 'player' || e.face === 'character')
              .map(e => e.user_id)
          )], 
          model: 'claude-sonnet-4-20250514', 
          tokens 
        };
        
        if (!informational && placeholderSolidId) {
          await updateSolidNarrative(supabase, placeholderSolidId, generatedText, result.model, tokens);
          stored = { solidId: placeholderSolidId };
          
          // Trigger Hard-LLM for coordinate updates
          await triggerHardLLM(context, generatedText, face);
        } else { 
          console.log('[Medium-LLM] Informational mode - skipping solid storage and Hard-LLM'); 
        }
        break;
      }
      
      case 'author': {
        // Author face: content synthesis
        const authorLiquidIds = context.allLiquid
          .filter(e => e.face === 'author')
          .map(e => e.id);
        
        result = { 
          success: true, 
          face: 'author', 
          narrative: generatedText,
          sourceLiquidIds: authorLiquidIds, 
          participantUserIds: [...new Set(
            context.allLiquid
              .filter(e => e.face === 'author')
              .map(e => e.user_id)
          )], 
          model: 'claude-sonnet-4-20250514', 
          tokens 
        };
        
        if (!informational && placeholderSolidId) {
          await updateSolidNarrative(supabase, placeholderSolidId, generatedText, result.model, tokens);
          stored = { solidId: placeholderSolidId };
          
          // Trigger Hard-LLM for content classification and entity filing
          await triggerHardLLM(context, generatedText, 'author');
        }
        break;
      }
      
      case 'designer': {
        // Designer face: skill document
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
          // Create skill
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
        }
        break;
      }
    }
    
    // Note: DB liquid already deleted early (after context gather)
    // No need to delete again here
    
    return { success: true, result, stored };
    
  } catch (error) {
    console.error('[Medium-LLM] Error:', error);
    
    // Clean up failed placeholder
    if (placeholderSolidId) {
      console.log('[Medium-LLM] Cleaning up failed placeholder:', placeholderSolidId);
      await supabase.from('solid').delete().eq('id', placeholderSolidId);
    }
    
    return { success: false, error: error.message };
  }
}
