/**
 * Phase 0.7 + 0.8: Medium-LLM Synthesis Handler
 * Now triggers Hard-LLM after player synthesis
 */

import type { SynthesisContext, SynthesisResult } from './types.ts';
import { gatherContext } from './gather.ts';
import { compilePlayerPrompt } from './compile-player.ts';
import { compileAuthorPrompt, parseAuthorResponse } from './compile-author.ts';
import { compileDesignerPrompt, parseDesignerResponse } from './compile-designer.ts';
import { routePlayerResult, routeAuthorResult, routeDesignerResult, markLiquidProcessed } from './route.ts';

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
): Promise<{ success: boolean; result?: SynthesisResult; stored?: { solidId: string; contentId?: string; skillId?: string }; error?: string }> {
  try {
    console.log('[Medium-LLM] Gathering context for liquid:', liquidId, informational ? '(informational)' : '');
    const context = await gatherContext(supabase, liquidId);
    const face = context.trigger.entry.face;
    console.log('[Medium-LLM] Face:', face, 'Frame:', context.frame.name);
    console.log('[Medium-LLM] Skills loaded:', Object.keys(context.skills).filter(k => context.skills[k as keyof typeof context.skills]).join(', ') || 'none');
    console.log('[Medium-LLM] Characters:', context.characters.map(c => c.name).join(', ') || 'none');
    
    let compiled;
    switch (face) {
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
    
    switch (face) {
      case 'player': {
        result = { success: true, face: 'player', narrative: generatedText, sourceLiquidIds: context.allLiquid.filter(e => e.committed && e.face === 'player').map(e => e.id), participantUserIds: [...new Set(context.allLiquid.filter(e => e.face === 'player').map(e => e.user_id))], model: 'claude-sonnet-4-20250514', tokens };
        if (!informational) {
          const solidResult = await routePlayerResult(supabase, context, result);
          stored = { solidId: solidResult.id };
          
          // Phase 0.8: Trigger Hard-LLM after player synthesis
          await triggerHardLLM(context, generatedText);
        } else { console.log('[Medium-LLM] Informational mode - skipping solid storage and Hard-LLM'); }
        break;
      }
      case 'author': {
        const parsed = parseAuthorResponse(generatedText);
        if (!parsed) throw new Error('Failed to parse author response');
        result = { success: true, face: 'author', contentData: parsed, sourceLiquidIds: [context.trigger.entry.id], participantUserIds: [context.trigger.userId], model: 'claude-sonnet-4-20250514', tokens };
        const authorResult = await routeAuthorResult(supabase, context, result);
        stored = { solidId: authorResult.solid.id, contentId: authorResult.contentId };
        break;
      }
      case 'designer': {
        const parsed = parseDesignerResponse(generatedText);
        if (!parsed) throw new Error('Failed to parse designer response');
        result = { success: true, face: 'designer', skillData: parsed, sourceLiquidIds: [context.trigger.entry.id], participantUserIds: [context.trigger.userId], model: 'claude-sonnet-4-20250514', tokens };
        if (!getOrCreateFramePackage) throw new Error('Designer mode requires getOrCreateFramePackage');
        const designerResult = await routeDesignerResult(supabase, context, result, getOrCreateFramePackage);
        stored = { solidId: designerResult.solid.id, skillId: designerResult.skillId };
        break;
      }
    }
    
    if (!informational) await markLiquidProcessed(supabase, result.sourceLiquidIds);
    return { success: true, result, stored };
  } catch (error) {
    console.error('[Medium-LLM] Error:', error);
    return { success: false, error: error.message };
  }
}
