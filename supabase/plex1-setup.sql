-- PLEX 1 SETUP
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/piqxyfmzzywxzqkzmpmm/sql
-- This creates the content table and seeds the 0.x skills

-- ============================================
-- PART 1: Content Table
-- ============================================

CREATE TABLE IF NOT EXISTS content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The three coordinates (hierarchical digit strings)
  t TEXT NOT NULL,        -- temporal: "348.1" = day 3, hour 4, block 8, minute 1
  s TEXT NOT NULL,        -- spatial: "13.4" = building 1, room 3, furniture 4
  i TEXT NOT NULL,        -- identity: "21." = group 2, individual 1

  -- Shelf state
  shelf TEXT NOT NULL CHECK (shelf IN ('vapor', 'liquid', 'solid')),

  -- The content
  text TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for proximity queries (prefix matching)
CREATE INDEX IF NOT EXISTS idx_content_t ON content (t text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_content_s ON content (s text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_content_i ON content (i text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_content_shelf ON content (shelf);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE content;

-- Row Level Security
ALTER TABLE content ENABLE ROW LEVEL SECURITY;

-- Everyone can read solid content
CREATE POLICY "Solid content is public" ON content
  FOR SELECT USING (shelf = 'solid');

-- Users can read proximate liquid (others' submitted content)
CREATE POLICY "Liquid is visible to authenticated users" ON content
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND shelf = 'liquid'
  );

-- Users can read their own vapor
CREATE POLICY "Users can read own vapor" ON content
  FOR SELECT USING (
    auth.uid() = created_by
    AND shelf = 'vapor'
  );

-- Users can insert their own content
CREATE POLICY "Users can insert own content" ON content
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update their own vapor/liquid (not solid)
CREATE POLICY "Users can update own vapor/liquid" ON content
  FOR UPDATE USING (
    auth.uid() = created_by
    AND shelf IN ('vapor', 'liquid')
  );

-- Users can delete their own vapor/liquid
CREATE POLICY "Users can delete own vapor/liquid" ON content
  FOR DELETE USING (
    auth.uid() = created_by
    AND shelf IN ('vapor', 'liquid')
  );

-- ============================================
-- PART 2: Seed 0.x Skills
-- ============================================

-- Soft-LLM skill
INSERT INTO content (t, s, i, shelf, text, created_by) VALUES (
  '0.31', '0.31', '0.31', 'solid',
  '# Soft-LLM

You refine player vapor into character liquid.

## Your Role
- Receive raw player input (vapor)
- Interpret as character intention
- Output refined action statement (liquid)

## Instructions
- Write in first person as the character
- Keep to 1-2 sentences
- Express intention, not outcome
- Be specific about the action
- Medium-LLM will synthesize with other characters

## Output
Return only the refined text. No metadata, no explanation.',
  NULL
);

-- Medium-LLM skill
INSERT INTO content (t, s, i, shelf, text, created_by) VALUES (
  '0.32', '0.32', '0.32', 'solid',
  '# Medium-LLM

You synthesize multiple characters'' liquid into shared narrative solid.

## Your Role
- Receive all liquid from proximate characters
- Weave into coherent narrative moment
- Output solid narrative

## Instructions
- Third person narration
- Include all characters'' actions
- Show how actions interact
- Maintain spatial/temporal coherence
- 2-4 sentences typical

## Output
Return only the narrative. No metadata.',
  NULL
);

-- Hard-LLM skill
INSERT INTO content (t, s, i, shelf, text, created_by) VALUES (
  '0.33', '0.33', '0.33', 'solid',
  '# Hard-LLM

You maintain coordinates and world state after narrative commits.

## Your Role
- Analyze solid narrative
- Determine coordinate changes
- Update character positions
- Advance temporal coordinate

## Instructions
- Extract spatial movements
- Note significant events
- Update determinancy (what is now known/fixed)
- Prepare context for next round

## Output Format
JSON with coordinate updates:
{
  "characters": [{"id": "...", "s": "new-coord", "t": "new-coord"}],
  "events": [{"description": "...", "t": "...", "s": "..."}]
}',
  NULL
);

-- Entry point: the tavern
INSERT INTO content (t, s, i, shelf, text, created_by) VALUES (
  '1.', '1.', '1.', 'solid',
  '# The Wayfarer''s Rest

A weathered tavern at the crossroads. Firelight flickers across worn wooden tables. The smell of ale and woodsmoke. A few patrons scattered about.

This is where travelers meet. Where stories begin.',
  NULL
);

-- Verify
SELECT t, s, i, shelf, LEFT(text, 50) as text_preview FROM content ORDER BY s;
