/**
 * Phase 0.7 + 0.8 + 0.9.3: Synthesis Types
 */

// Face type includes both legacy 'player' and new 'character'
export type Face = 'player' | 'character' | 'author' | 'designer';

export interface LiquidEntry {
  id: string;
  frame_id: string;
  user_id: string;
  user_name: string;
  face: Face;
  content: string;
  committed: boolean;
  character_id?: string;  // Phase 0.9.3: Which character user is operating as
  created_at: string;
}

export interface ContentEntry {
  id: string;
  frame_id: string;
  content_type: string;
  name: string;
  data: Record<string, any>;
  active: boolean;
  created_at: string;
  created_by: string;
}

export interface SolidEntry {
  id: string;
  frame_id: string;
  face: Face;
  narrative?: string;
  content_data?: Record<string, any>;
  skill_data?: Record<string, any>;
  source_liquid_ids: string[];
  triggering_user_id?: string;
  participant_user_ids: string[];
  model_used?: string;
  tokens_used?: { input: number; output: number };
  created_at: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  applies_to: string[];
  content: string;
  package_name?: string;
  package_level?: string;
}

export interface SkillSet {
  format?: Skill;
  guard?: Skill;
  gathering?: Skill;
  aperture?: Skill;
  weighting?: Skill;
  routing?: Skill;
  constraint?: Skill;
  parsing?: Skill;
  display?: Skill;
}

// Phase 0.8: Character info for Hard-LLM coordination
export interface CharacterInfo {
  id: string;
  name: string;
  user_id: string | null;  // inhabited_by
  is_npc: boolean;
}

export interface SynthesisContext {
  trigger: {
    entry: LiquidEntry;
    userId: string;
    userName: string;
  };
  allLiquid: LiquidEntry[];
  otherLiquid: LiquidEntry[];
  worldContent: ContentEntry[];
  recentSolid: SolidEntry[];
  frame: {
    id: string;
    name: string;
    pscaleFloor: number;
    pscaleCeiling: number;
    cosmologyId?: string;  // Phase 0.8: for Hard-LLM
  };
  skills: SkillSet;
  // Phase 0.8: Characters involved in this synthesis
  characters: CharacterInfo[];
}

export interface CompiledPrompt {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
}

export interface SynthesisResult {
  success: boolean;
  face: Face;
  narrative?: string;
  contentData?: { type: string; name: string; description: string; data?: Record<string, any> };
  skillData?: { name: string; category: string; applies_to: string[]; content: string };
  sourceLiquidIds: string[];
  participantUserIds: string[];
  model: string;
  tokens: { input: number; output: number };
}

// Used by route.ts for storing synthesis results
export interface StoredSolid {
  id: string;
  frameId: string;
  face: Face;
  createdAt: string;
}
