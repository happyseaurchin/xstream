// ============================================================
// PSCALE COORDINATE TYPES
// Phase 0.8: Hard-LLM & Narrative Aperture
// ============================================================

/**
 * Pscale coordinate string.
 * Format: digits + optional decimal + digits
 * 
 * Position = pscale level (right of decimal is negative)
 * Value = semantic ID at that level
 * 
 * Example: "13.4"
 *   - Position 0 (rightmost before decimal): digit 3 = pscale 0 (room level)
 *   - Position 1: digit 1 = pscale +1 (building level)
 *   - Position 0 after decimal: digit 4 = pscale -1 (furniture level)
 * 
 * Reading: "keep → kitchen → fireplace"
 */
export type PscaleCoordinate = string;

/**
 * Proximity states based on coordinate prefix overlap.
 */
export type ProximityState = 'close' | 'nearby' | 'distant' | 'far';

// ============================================================
// DATABASE ENTITY TYPES
// ============================================================

/**
 * Semantic tabulation: maps digit values to names at each pscale level.
 * Used by cosmologies to give meaning to coordinate digits.
 * 
 * Structure: { "pscale_level": { "digit": "name" } }
 * Example: { "+1": { "1": "keep", "2": "tower" }, "0": { "3": "kitchen" } }
 */
export interface SemanticTabulation {
  [pscaleLevel: string]: {
    [digit: string]: string;
  };
}

/**
 * Cosmology: A fictional world with semantic tabulations.
 * Lives at pscale +16 - the world-container level.
 */
export interface Cosmology {
  id: string;
  name: string;
  description?: string;
  physics_rules?: 'magical' | 'realistic' | 'sci-fi' | 'mixed';
  spatial_tabulation: SemanticTabulation;
  temporal_tabulation: SemanticTabulation;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Character: A player vessel or NPC in a cosmology.
 */
export interface Character {
  id: string;
  cosmology_id: string;
  created_by?: string;
  inhabited_by?: string;  // NULL = NPC, operated by Character-LLM
  name: string;
  description?: string;
  is_npc: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Character's current position in narrative space.
 * Updated by Hard-LLM after synthesis.
 */
export interface CharacterCoordinates {
  character_id: string;
  frame_id: string;
  spatial: PscaleCoordinate;
  temporal: PscaleCoordinate;
  focus?: string;
  updated_at: string;
  updated_by: 'hard-llm' | 'player-action' | 'system';
}

/**
 * Discovered proximity relationships between characters.
 * Determined by coordinate prefix overlap.
 */
export interface CharacterProximity {
  character_id: string;
  close: string[];    // ≥2 digit prefix overlap
  nearby: string[];   // 1 digit prefix overlap
  distant: string[];  // 0 digits, same cosmology
  coordinated_at: string;
}

/**
 * Cached operational context for a character.
 * Hard-LLM output that Medium-LLM receives.
 */
export interface CharacterContext {
  character_id: string;
  frame_id: string;
  context_content: OperationalFrame;
  aperture_floor?: number;
  aperture_ceiling?: number;
  compiled_at: string;
  expires_at?: string;
}

// ============================================================
// APERTURE & OPERATIONAL FRAME TYPES
// ============================================================

/**
 * Attention scope: defines what pscale range is visible.
 * 
 * floor = minimum pscale (detail level, e.g., -2 for objects)
 * ceiling = maximum pscale (scope level, e.g., +2 for neighborhood)
 */
export interface Aperture {
  floor: number;
  ceiling: number;
}

/**
 * Content entry with pscale coordinates.
 * Used in operational frame assembly.
 */
export interface ContentEntry {
  id: string;
  content_type: string;
  name: string;
  data: Record<string, unknown>;
  spatial?: PscaleCoordinate;
  temporal?: PscaleCoordinate;
  pscale_floor?: number;
  pscale_ceiling?: number;
}

/**
 * Hard-LLM output: assembled operational context.
 * Everything Medium-LLM needs for synthesis.
 */
export interface OperationalFrame {
  character_id: string;
  frame_id: string;
  
  // Current position
  coordinates: {
    spatial: PscaleCoordinate;
    temporal: PscaleCoordinate;
  };
  
  // Who's here
  proximity: {
    close: CharacterState[];   // Full state for close characters
    nearby: string[];          // Just IDs for nearby
  };
  
  // What's relevant (filtered by aperture)
  content: ContentEntry[];
  
  // Attention scope used for filtering
  aperture: Aperture;
  
  compiled_at: string;
}

/**
 * Character state for inclusion in operational frame.
 * Subset of full character + coordinates.
 */
export interface CharacterState {
  character_id: string;
  name: string;
  description?: string;
  spatial: PscaleCoordinate;
  temporal: PscaleCoordinate;
  is_npc: boolean;
}

// ============================================================
// LAMINA TYPES (Face-specific shelf coordinates)
// ============================================================

/**
 * Player lamina: character position and action scale.
 */
export interface LaminaPlayer {
  character_id: string;
  spatial: PscaleCoordinate;
  temporal: PscaleCoordinate;
  action_pscale: number;  // What scale is this action? (-1=furniture, +2=neighborhood)
}

/**
 * Author lamina: content position and scope.
 */
export interface LaminaAuthor {
  content_id?: string;
  spatial: PscaleCoordinate;
  temporal?: PscaleCoordinate;
  pscale_floor: number;
  pscale_ceiling: number;
  determinancy: number;  // 0-1: how fixed is this content
}

/**
 * Designer lamina: skill targeting and meta-info.
 */
export interface LaminaDesigner {
  skill_target?: string;
  package_target?: string;
  affected_faces: ('player' | 'author' | 'designer')[];
  stack_depth: number;
}

export type Lamina = LaminaPlayer | LaminaAuthor | LaminaDesigner;

// ============================================================
// HARD-LLM OPERATION TYPES
// ============================================================

/**
 * Input for coordinate update operation.
 */
export interface CoordinateUpdateInput {
  character_id: string;
  current_spatial: PscaleCoordinate;
  current_temporal: PscaleCoordinate;
  narrative: string;
  cosmology: {
    spatial_tabulation: SemanticTabulation;
    temporal_tabulation: SemanticTabulation;
  };
}

/**
 * Output from coordinate update operation.
 */
export interface CoordinateUpdateOutput {
  spatial: {
    changed: boolean;
    new_value?: PscaleCoordinate;
    decoded?: string[];
    reasoning: string;
  };
  temporal: {
    changed: boolean;
    new_value?: PscaleCoordinate;
    decoded?: string[];
    reasoning: string;
  };
  overall_confidence: 'high' | 'medium' | 'low';
}

/**
 * Input for proximity discovery operation.
 */
export interface ProximityDiscoveryInput {
  character_id: string;
  frame_id: string;
  spatial: PscaleCoordinate;
}

/**
 * Output from proximity discovery operation.
 */
export interface ProximityDiscoveryOutput {
  character_id: string;
  close: string[];
  nearby: string[];
  distant: string[];
  coordinated_at: string;
}
