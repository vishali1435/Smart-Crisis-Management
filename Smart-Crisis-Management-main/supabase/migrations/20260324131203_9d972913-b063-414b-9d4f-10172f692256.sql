
-- Resources table for admin resource management
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  quantity INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  last_updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage resources" ON public.resources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- All authenticated users can view resources
CREATE POLICY "Authenticated users can view resources" ON public.resources
  FOR SELECT TO authenticated
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.resources;
