-- Add preferences column to household_members table
ALTER TABLE public.household_members 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Add comment explaining the structure
COMMENT ON COLUMN public.household_members.preferences IS 'User preferences like music genres, sports teams, interests etc. Structure: { "music": [...], "sports": [...], "interests": [...] }';