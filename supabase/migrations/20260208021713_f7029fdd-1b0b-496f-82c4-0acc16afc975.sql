
-- Create smartthings_connections table for OAuth tokens
CREATE TABLE public.smartthings_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  installed_app_id text,
  location_id text,
  access_token text,
  refresh_token text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.smartthings_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies: only owner can CRUD
CREATE POLICY "Users can view own smartthings connections"
ON public.smartthings_connections
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own smartthings connections"
ON public.smartthings_connections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own smartthings connections"
ON public.smartthings_connections
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own smartthings connections"
ON public.smartthings_connections
FOR DELETE
USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_smartthings_connections_updated_at
BEFORE UPDATE ON public.smartthings_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
