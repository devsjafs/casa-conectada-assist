-- Add unique constraint for device upsert by external_id
CREATE UNIQUE INDEX IF NOT EXISTS devices_user_external_id_unique 
ON public.devices (user_id, external_id) 
WHERE external_id IS NOT NULL;

-- Also ensure integrations has unique constraint for upsert
CREATE UNIQUE INDEX IF NOT EXISTS integrations_user_type_unique 
ON public.integrations (user_id, type);