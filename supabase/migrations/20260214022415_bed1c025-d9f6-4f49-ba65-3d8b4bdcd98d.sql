-- Add unique constraint on cameras.device_id for upsert support
ALTER TABLE public.cameras ADD CONSTRAINT cameras_device_id_unique UNIQUE (device_id);
