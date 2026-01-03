/**
 * Phase 0.7 + 0.9.0 + 0.10.3: Output Router
 * 
 * Routes synthesis results to the appropriate storage:
 * - Character (was Player) → solid table (narrative)
 * - Author → content table (structured)
 * - Designer → skills table (skill doc)
 * 
 * Also broadcasts to Realtime for live updates.
 * 
 * Phase 0.10.3: Added placeholder solid creation for shared spinner.
 * All players see the solid appear immediately (with null narrative = spinner),
 * then see the narrative appear when synthesis completes.
 */

import type { SynthesisContext, SynthesisResult, StoredSolid } from './types.ts';

/**
 * Ensure user exists in database before FK operations.
 */
async function ensureUserExists(
  supabase: any,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .upsert(
      { id: userId, name: `user-${userId.slice(0, 8)}` },
      { onConflict: 'id', ignoreDuplicates: true }
    );

  if (error) {
    console.error('Error ensuring user exists:', error);
    throw new Error('Failed to ensure user exists');
  }
}

/**
 * Helper: Check if face is character-type (includes legacy 'player')
 */
function isCharacterFace(face: string): boolean {
  return face === 'character' || face === 'player';
}

/**
 * Create a placeholder solid entry with null narrative.
 * This appears immediately for all players (showing spinner).
 * Returns the solid ID for later update.
 */
export async function createPlaceholderSolid(
  supabase: any,
  context: SynthesisContext,
  face: 'character' | 'author' | 'designer'
): Promise<string> {
  const solidId = crypto.randomUUID();
  
  // Get participant IDs for character face
  let participantIds: string[];
  let sourceLiquidIds: string[];
  
  if (isCharacterFace(face)) {
    participantIds = [...new Set(
      context.allLiquid
        .filter(e => isCharacterFace(e.face))
        .map(e => e.user_id)
    )];
    sourceLiquidIds = context.allLiquid
      .filter(e => isCharacterFace(e.face) && e.committed)
      .map(e => e.id);
  } else {
    participantIds = [context.trigger.userId];
    sourceLiquidIds = [context.trigger.entry.id];
  }
  
  const { error } = await supabase
    .from('solid')
    .insert({
      id: solidId,
      frame_id: context.frame.id,
      face: face === 'player' ? 'character' : face,
      narrative: null,  // NULL = spinner shows for all players
      source_liquid_ids: sourceLiquidIds,
      triggering_user_id: context.trigger.userId,
      participant_user_ids: participantIds,
      model_used: null,
      tokens_used: null,
    });
  
  if (error) {
    console.error('Error creating placeholder solid:', error);
    throw new Error(`Failed to create placeholder solid: ${error.message}`);
  }
  
  console.log('[Router] Created placeholder solid:', solidId);
  return solidId;
}

/**
 * Update an existing solid entry with the synthesis result.
 * This triggers the realtime subscription for all players.
 */
export async function updateSolidNarrative(
  supabase: any,
  solidId: string,
  narrative: string,
  model: string,
  tokens: { input: number; output: number }
): Promise<void> {
  const { error } = await supabase
    .from('solid')
    .update({
      narrative,
      model_used: model,
      tokens_used: tokens,
    })
    .eq('id', solidId);
  
  if (error) {
    console.error('Error updating solid narrative:', error);
    throw new Error(`Failed to update solid: ${error.message}`);
  }
  
  console.log('[Router] Updated solid with narrative:', solidId);
}

/**
 * Update solid with content_data (for author face).
 */
export async function updateSolidContentData(
  supabase: any,
  solidId: string,
  contentData: any,
  model: string,
  tokens: { input: number; output: number }
): Promise<void> {
  const { error } = await supabase
    .from('solid')
    .update({
      content_data: contentData,
      model_used: model,
      tokens_used: tokens,
    })
    .eq('id', solidId);
  
  if (error) {
    console.error('Error updating solid content_data:', error);
    throw new Error(`Failed to update solid: ${error.message}`);
  }
  
  console.log('[Router] Updated solid with content_data:', solidId);
}

/**
 * Update solid with skill_data (for designer face).
 */
export async function updateSolidSkillData(
  supabase: any,
  solidId: string,
  skillData: any,
  model: string,
  tokens: { input: number; output: number }
): Promise<void> {
  const { error } = await supabase
    .from('solid')
    .update({
      skill_data: skillData,
      model_used: model,
      tokens_used: tokens,
    })
    .eq('id', solidId);
  
  if (error) {
    console.error('Error updating solid skill_data:', error);
    throw new Error(`Failed to update solid: ${error.message}`);
  }
  
  console.log('[Router] Updated solid with skill_data:', solidId);
}

/**
 * Route character (player) synthesis result to solid table.
 * LEGACY: Use createPlaceholderSolid + updateSolidNarrative instead.
 */
export async function routePlayerResult(
  supabase: any,
  context: SynthesisContext,
  result: SynthesisResult
): Promise<StoredSolid> {
  
  // Get all participant user IDs (handle both 'player' and 'character' for backward compat)
  const participantIds = [...new Set(
    context.allLiquid
      .filter(e => isCharacterFace(e.face))
      .map(e => e.user_id)
  )];
  
  // Get source liquid IDs (committed entries that contributed)
  const sourceLiquidIds = context.allLiquid
    .filter(e => isCharacterFace(e.face) && e.committed)
    .map(e => e.id);
  
  // Phase 0.9.0: Use 'character' not 'player' for solid.face
  const { data, error } = await supabase
    .from('solid')
    .insert({
      frame_id: context.frame.id,
      face: 'character',  // Changed from 'player' to match CHECK constraint
      narrative: result.narrative,
      source_liquid_ids: sourceLiquidIds,
      triggering_user_id: context.trigger.userId,
      participant_user_ids: participantIds,
      model_used: result.model,
      tokens_used: result.tokens,
    })
    .select('id, frame_id, face, created_at')
    .single();
  
  if (error) {
    console.error('Error storing player result:', error);
    throw new Error(`Failed to store player result: ${error.message}`);
  }
  
  return {
    id: data.id,
    frameId: data.frame_id,
    face: data.face,
    createdAt: data.created_at,
  };
}

/**
 * Route author synthesis result to content table.
 */
export async function routeAuthorResult(
  supabase: any,
  context: SynthesisContext,
  result: SynthesisResult
): Promise<{ contentId: string; solid: StoredSolid }> {
  
  if (!result.contentData) {
    throw new Error('Author result missing contentData');
  }
  
  // Ensure user exists before FK insert
  await ensureUserExists(supabase, context.trigger.userId);
  
  // First, store in content table
  const { data: contentData, error: contentError } = await supabase
    .from('content')
    .insert({
      frame_id: context.frame.id,
      author_id: context.trigger.userId,
      content_type: result.contentData.type,
      name: result.contentData.name,
      data: result.contentData.data,
      active: true,
    })
    .select('id')
    .single();
  
  if (contentError) {
    console.error('Error storing content:', contentError);
    throw new Error(`Failed to store content: ${contentError.message}`);
  }
  
  // Also store reference in solid table for audit trail
  const { data: solidData, error: solidError } = await supabase
    .from('solid')
    .insert({
      frame_id: context.frame.id,
      face: 'author',
      content_data: {
        content_id: contentData.id,
        ...result.contentData,
      },
      source_liquid_ids: [context.trigger.entry.id],
      triggering_user_id: context.trigger.userId,
      participant_user_ids: [context.trigger.userId],
      model_used: result.model,
      tokens_used: result.tokens,
    })
    .select('id, frame_id, face, created_at')
    .single();
  
  if (solidError) {
    console.error('Error storing author solid:', solidError);
    throw new Error(`Failed to store author solid: ${solidError.message}`);
  }
  
  return {
    contentId: contentData.id,
    solid: {
      id: solidData.id,
      frameId: solidData.frame_id,
      face: solidData.face,
      createdAt: solidData.created_at,
    },
  };
}

/**
 * Route designer synthesis result to skills table.
 * Uses existing skill creation logic from index.ts.
 */
export async function routeDesignerResult(
  supabase: any,
  context: SynthesisContext,
  result: SynthesisResult,
  getOrCreateFramePackage: (supabase: any, frameId: string, userId: string) => Promise<string>
): Promise<{ skillId: string; solid: StoredSolid }> {
  
  if (!result.skillData) {
    throw new Error('Designer result missing skillData');
  }
  
  // Get or create frame package for the skill
  const packageId = await getOrCreateFramePackage(
    supabase,
    context.frame.id,
    context.trigger.userId
  );
  
  // Create the skill
  const skillId = crypto.randomUUID();
  const { error: skillError } = await supabase
    .from('skills')
    .insert({
      id: skillId,
      name: result.skillData.name,
      package_id: packageId,
      category: result.skillData.category,
      applies_to: result.skillData.applies_to,
      content: result.skillData.content,
    });
  
  if (skillError) {
    console.error('Error creating skill:', skillError);
    throw new Error(`Failed to create skill: ${skillError.message}`);
  }
  
  // Store reference in solid table
  const { data: solidData, error: solidError } = await supabase
    .from('solid')
    .insert({
      frame_id: context.frame.id,
      face: 'designer',
      skill_data: {
        skill_id: skillId,
        ...result.skillData,
      },
      source_liquid_ids: [context.trigger.entry.id],
      triggering_user_id: context.trigger.userId,
      participant_user_ids: [context.trigger.userId],
      model_used: result.model,
      tokens_used: result.tokens,
    })
    .select('id, frame_id, face, created_at')
    .single();
  
  if (solidError) {
    console.error('Error storing designer solid:', solidError);
    throw new Error(`Failed to store designer solid: ${solidError.message}`);
  }
  
  return {
    skillId,
    solid: {
      id: solidData.id,
      frameId: solidData.frame_id,
      face: solidData.face,
      createdAt: solidData.created_at,
    },
  };
}

/**
 * Clean up liquid entries after synthesis.
 * Mark committed entries as processed (don't delete - keep as audit trail).
 * 
 * Note: For Phase 0.7, we don't delete liquid entries.
 * They remain as a record of what was submitted.
 * Cleanup strategy may evolve in Phase 0.8.
 */
export async function markLiquidProcessed(
  supabase: any,
  liquidIds: string[]
): Promise<void> {
  // For now, we keep liquid entries as-is
  // The 'committed' flag already marks them as processed
  // Future: may add 'processed_at' timestamp or 'solid_id' reference
  console.log(`Liquid entries processed: ${liquidIds.join(', ')}`);
}
