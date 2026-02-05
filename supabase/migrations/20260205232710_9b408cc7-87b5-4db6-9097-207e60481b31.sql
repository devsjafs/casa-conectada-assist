-- Tabela de pessoas da casa (moradores)
CREATE TABLE public.household_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  face_embedding JSONB, -- Armazena o embedding facial para reconhecimento
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de notificações personalizadas
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.household_members(id) ON DELETE CASCADE, -- null = para todos
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info', -- info, alert, reminder, task
  is_read BOOLEAN DEFAULT false,
  scheduled_for TIMESTAMP WITH TIME ZONE, -- para lembretes agendados
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para household_members
CREATE POLICY "Users can view their household members"
ON public.household_members FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create household members"
ON public.household_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their household members"
ON public.household_members FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their household members"
ON public.household_members FOR DELETE
USING (auth.uid() = user_id);

-- Políticas para notifications
CREATE POLICY "Users can view their notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_household_members_updated_at
BEFORE UPDATE ON public.household_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();