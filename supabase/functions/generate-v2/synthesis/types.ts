/**
 * Phase 0.7: Synthesis Types
 * Interfaces for Medium-LLM cross-player synthesis
 */

// Liquid entry from database
export interface LiquidEntry {
  id: string;
  frame_id: string;
  user_id: string;
  user_name: string;
  face: 'player' | 'author' | 'designer';
  content: string;
  soft_llm_response: string | null;
  committed: boolean;
  created_at: string;
  updated_at: string;
}

// Author content from database
export interface ContentEntry {
  id: string;
  frame_id: string;
  author_id: string;
  content_type: string;
  name: string;
  data: Record<string, any>;
  pscale_aperture: number | null;
  active: boolean;
  created_at: string;
}

// Recent solid entries for context
export interface SolidEntry {
  id: string;
  frame_id: string;
  face: 'player' | 'author' | 'designer';
  narrative: string | null;
  content_data: Record<string, any> | null;
  skill_data: Record<string, any> | null;
  source_liquid_ids: string[];
  created_at: string;
}

// Gathered context for synthesis
export interface SynthesisContext {
  // The commit that triggered synthesis
  trigger: {
    entry: LiquidEntry;
    userId: string;
    userName: string;
  };
  
  // All liquid entries in frame (submitted + committed)
  allLiquid: LiquidEntry[];
  
  // Other liquid from other users (for cross-player synthesis)
  otherLiquid: LiquidEntry[];
  
  // Author-created world content
  worldContent: ContentEntry[];
  
  // Recent narrative history
  recentSolid: SolidEntry[];
  
  // Frame metadata
  frame: {
    id: string;
    name: string;
    pscaleFloor: number;
    pscaleCeiling: number;
  };
}

// Compiled prompt ready for LLM
export interface CompiledPrompt {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
}

// Result of synthesis
export interface SynthesisResult {
  success: boolean;
  face: 'player' | 'author' | 'designer';
  
  // Player output
  narrative?: string;
  
  // Author output
  contentData?: {
    type: string;
    name: string;
    data: Record<string, any>;
  };
  
  // Designer output (uses existing skill creation)
  skillData?: {
    name: string;
    category: string;
    applies_to: string[];
    content: string;
  };
  
  // Provenance
  sourceLiquidIds: string[];
  participantUserIds: string[];
  
  // LLM metadata
  model: string;
  tokens: {
    input: number;
    output: number;
  };
  
  // Error if failed
  error?: string;
}

// Stored solid entry
export interface StoredSolid {
  id: string;
  frameId: string;
  face: string;
  createdAt: string;
}
