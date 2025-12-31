/**
 * Phase 0.7: Medium-LLM Synthesis Handler
 * 
 * Orchestrates the full synthesis flow:
 * 1. Gather context
 * 2. Compile prompt based on face
 * 3. Call Claude with extended thinking
 * 4. Parse and route result
 * 
 * This is the heart of cross-player coordination.
 */

import type { SynthesisContext, SynthesisResult } from './types.ts';
import { gatherContext } from './gather.ts';
import { compilePlayerPrompt } from './compile-player.ts';
import { compileAuthorPrompt, parseAuthorResponse } from './compile-author.ts';
import { compileDesignerPrompt, parseDesignerResponse } from './compile-designer.ts';
import { routePlayerResult, routeAuthorResult, routeDesignerResult, markLiquidProcessed } from './route.ts';

/**
 * Main synthesis handler.
 * Called when mode='medium' in the generate-v2 request.
 * 
 * @param informational - If true, returns narrative without storing to solid.
 *                        Used for info requests ("where am I?") that don't affect world state.
 */
export async function handleMediumMode(
  supabase: any,
  anthropicKey: string,
  liquidId: string,
  getOrCreateFramePackage: ((supabase: any, frameId: string, userId: string) => Promise<string>) | null,
  informational: boolean = false
): Promise<{
  success: boolean;
  result?: SynthesisResult;
  stored?: {
    solidId: string;
    contentId?: string;
    skillId?: string;
  };
  error?: string;
}> {
  
  try {
    // 1. GATHER: Collect all context
    console.log('[Medium-LLM] Gathering context for liquid:', liquidId, informational ? '(informational)' : '');
    const context = await gatherContext(supabase, liquidId);
    
    const face = context.trigger.entry.face;
    console.log('[Medium-LLM] Face:', face, 'Frame:', context.frame.name);
    console.log('[Medium-LLM] All liquid count:', context.allLiquid.length);
    console.log('[Medium-LLM] Other liquid count:', context.otherLiquid.length);
    console.log('[Medium-LLM] World content count:', context.worldContent.length);
    
    // 2. COMPILE: Build prompt based on face
    let compiled;
    switch (face) {
      case 'player':
        compiled = compilePlayerPrompt(context);
        break;
      case 'author':
        compiled = compileAuthorPrompt(context);
        break;
      case 'designer':
        compiled = compileDesignerPrompt(context);
        break;
      default:
        throw new Error(`Unknown face: ${face}`);
    }
    
    console.log('[Medium-LLM] Compiled prompt length:', compiled.systemPrompt.length + compiled.userPrompt.length);
    
    // 3. CALL: Claude with extended thinking
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: compiled.maxTokens + 8000, // Add thinking budget
        thinking: {
          type: 'enabled',
          budget_tokens: 8000,
        },
        system: compiled.systemPrompt,
        messages: [{ role: 'user', content: compiled.userPrompt }],
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }
    
    const claudeResponse = await response.json();
    
    // Extract text (skip thinking blocks)
    let generatedText = '';
    for (const block of claudeResponse.content || []) {
      if (block.type === 'text') {
        generatedText = block.text;
        break;
      }
    }
    
    console.log('[Medium-LLM] Generated text length:', generatedText.length);
    
    // 4. PARSE & ROUTE: Handle face-specific output
    const tokens = {
      input: claudeResponse.usage?.input_tokens || 0,
      output: claudeResponse.usage?.output_tokens || 0,
    };
    
    let result: SynthesisResult;
    let stored: { solidId: string; contentId?: string; skillId?: string } | undefined;
    
    switch (face) {
      case 'player': {
        result = {
          success: true,
          face: 'player',
          narrative: generatedText,
          sourceLiquidIds: context.allLiquid.filter(e => e.committed && e.face === 'player').map(e => e.id),
          participantUserIds: [...new Set(context.allLiquid.filter(e => e.face === 'player').map(e => e.user_id))],
          model: 'claude-sonnet-4-20250514',
          tokens,
        };
        
        // Skip solid storage for informational requests
        if (!informational) {
          const solidResult = await routePlayerResult(supabase, context, result);
          stored = { solidId: solidResult.id };
        } else {
          console.log('[Medium-LLM] Informational mode - skipping solid storage');
        }
        break;
      }
      
      case 'author': {
        const parsed = parseAuthorResponse(generatedText);
        if (!parsed) {
          throw new Error('Failed to parse author response as structured content');
        }
        
        result = {
          success: true,
          face: 'author',
          contentData: parsed,
          sourceLiquidIds: [context.trigger.entry.id],
          participantUserIds: [context.trigger.userId],
          model: 'claude-sonnet-4-20250514',
          tokens,
        };
        
        // Authors always store (informational doesn't apply)
        const authorResult = await routeAuthorResult(supabase, context, result);
        stored = {
          solidId: authorResult.solid.id,
          contentId: authorResult.contentId,
        };
        break;
      }
      
      case 'designer': {
        const parsed = parseDesignerResponse(generatedText);
        if (!parsed) {
          throw new Error('Failed to parse designer response as skill document');
        }
        
        result = {
          success: true,
          face: 'designer',
          skillData: parsed,
          sourceLiquidIds: [context.trigger.entry.id],
          participantUserIds: [context.trigger.userId],
          model: 'claude-sonnet-4-20250514',
          tokens,
        };
        
        // Designers always store (informational doesn't apply)
        if (!getOrCreateFramePackage) {
          throw new Error('Designer mode requires getOrCreateFramePackage');
        }
        const designerResult = await routeDesignerResult(
          supabase,
          context,
          result,
          getOrCreateFramePackage
        );
        stored = {
          solidId: designerResult.solid.id,
          skillId: designerResult.skillId,
        };
        break;
      }
      
      default:
        throw new Error(`Unknown face: ${face}`);
    }
    
    // 5. CLEANUP: Mark processed liquid entries (skip for informational)
    if (!informational) {
      await markLiquidProcessed(supabase, result.sourceLiquidIds);
    }
    
    return { success: true, result, stored };
    
  } catch (error) {
    console.error('[Medium-LLM] Error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
