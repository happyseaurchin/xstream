-- Plex 1: Single content table with pscale coordinates
-- Everything is text at coordinates. No categories. No types.

CREATE TABLE content (
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
CREATE INDEX idx_content_t ON content (t text_pattern_ops);
CREATE INDEX idx_content_s ON content (s text_pattern_ops);
CREATE INDEX idx_content_i ON content (i text_pattern_ops);
CREATE INDEX idx_content_shelf ON content (shelf);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE content;

-- Row Level Security
ALTER TABLE content ENABLE ROW LEVEL SECURITY;

-- Everyone can read solid content
CREATE POLICY "Solid content is public" ON content
  FOR SELECT USING (shelf = 'solid');

-- Users can read their own vapor/liquid
CREATE POLICY "Users can read own vapor/liquid" ON content
  FOR SELECT USING (
    auth.uid() = created_by
    AND shelf IN ('vapor', 'liquid')
  );

-- Users can read proximate liquid (others' submitted content)
-- For now, all liquid is visible. Proximity filtering happens client-side.
CREATE POLICY "Liquid is visible to authenticated users" ON content
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND shelf = 'liquid'
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

-- Service role can do anything (for edge functions)
CREATE POLICY "Service role full access" ON content
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
