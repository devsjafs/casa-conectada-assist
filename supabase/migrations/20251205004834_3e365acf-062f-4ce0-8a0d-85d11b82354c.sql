-- Drop the partial index and create a proper unique constraint
DROP INDEX IF EXISTS devices_user_external_id_unique;

-- Create a proper unique constraint (not partial index)
ALTER TABLE public.devices ADD CONSTRAINT devices_user_external_id_unique 
UNIQUE (user_id, external_id);