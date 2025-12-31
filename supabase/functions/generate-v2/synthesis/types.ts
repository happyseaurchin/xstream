/**
 * Phase 0.7: Synthesis Types
 */

export interface LiquidEntry {
  id: string;
  frame_id: string;
  user_id: string;
  user_name: string;
  face: 'player' | 'author' | 'designer';
  content: string;
  committed: boolean;
  processed: boolean;
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
  face: 'player' | 'author' | 'designer';
  narrative?: string;
  source_liquid_ids: string[];
  participant_user_ids: string[];
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
  };
  skills: SkillSet;  // Loaded skills for the face
}

export interface CompiledPrompt {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
}

export interface SynthesisResult {
  success: boolean;
  face: 'player' | 'author' | 'designer';
  narrative?: string;
  contentData?: { type: string; name: string; description: string };
  skillData?: { name: string; category: string; applies_to: string[]; content: string };
  sourceLiquidIds: string[];
  participantUserIds: string[];
  model: string;
  tokens: { input: number; output: number };
}
