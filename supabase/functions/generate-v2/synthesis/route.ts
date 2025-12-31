/**
 * Phase 0.7: Output Router
 * 
 * Routes synthesis results to the appropriate storage:
 * - Player → solid table (narrative)
 * - Author → content table (structured)
 * - Designer → skills table (skill doc)
 * 
 * Also broadcasts to Realtime for live updates.
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
 * Route player synthesis result to solid table.
 */
export async function routePlayerResult(
  supabase: any,
  context: SynthesisContext,
  result: SynthesisResult
): Promise<StoredSolid> {
  
  // Get all participant user IDs
  const participantIds = [...new Set(
    context.allLiquid
      .filter(e => e.face === 'player')
      .map(e => e.user_id)
  )];
  
  // Get source liquid IDs (committed entries that contributed)
  const sourceLiquidIds = context.allLiquid
    .filter(e => e.face === 'player' && e.committed)
    .map(e => e.id);
  
  const { data, error } = await supabase
    .from('solid')
    .insert({
      frame_id: context.frame.id,
      face: 'player',
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
