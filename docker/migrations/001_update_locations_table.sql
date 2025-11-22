-- Add missing columns to locations table

-- Add family_id column
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES family_groups(id) ON DELETE CASCADE;

-- Add matched_speed_limit column
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS matched_speed_limit INTEGER;

-- Add matched_road_id column
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS matched_road_id INTEGER REFERENCES road_segments(id) ON DELETE SET NULL;

-- Rename position column to coordinates for consistency
ALTER TABLE locations 
RENAME COLUMN position TO coordinates;

-- Create index on family_id for faster queries
CREATE INDEX IF NOT EXISTS idx_locations_family ON locations(family_id, timestamp DESC);

-- Update existing records to set family_id from family_members
UPDATE locations l
SET family_id = (
    SELECT fm.family_id 
    FROM family_members fm 
    WHERE fm.user_id = l.user_id 
    LIMIT 1
)
WHERE family_id IS NULL AND user_id IN (SELECT user_id FROM family_members);
