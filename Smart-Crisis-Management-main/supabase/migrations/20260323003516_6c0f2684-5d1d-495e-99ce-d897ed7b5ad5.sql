
-- Login logs table for security tracking
CREATE TABLE public.login_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  login_time timestamptz NOT NULL DEFAULT now(),
  logout_time timestamptz,
  ip_address text,
  device_info text,
  login_status text NOT NULL DEFAULT 'success',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view all login logs"
ON public.login_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Users can insert their own logs
CREATE POLICY "Users can insert own login logs"
ON public.login_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view own logs
CREATE POLICY "Users can view own login logs"
ON public.login_logs FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can update own logs (for logout time)
CREATE POLICY "Users can update own login logs"
ON public.login_logs FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Add latitude/longitude to profiles for volunteer location matching
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;

-- Add assigned_volunteer_id to incidents for volunteer assignment
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS assigned_volunteer_id uuid;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS category text;

-- Volunteers can view incidents assigned to them
CREATE POLICY "Volunteers can view assigned incidents"
ON public.incidents FOR SELECT TO authenticated
USING (auth.uid() = assigned_volunteer_id);

-- Volunteers can update assigned incidents status
CREATE POLICY "Volunteers can update assigned incidents"
ON public.incidents FOR UPDATE TO authenticated
USING (auth.uid() = assigned_volunteer_id);

-- Create storage bucket for incident images
INSERT INTO storage.buckets (id, name, public) VALUES ('incident-images', 'incident-images', true);

-- Storage policies for incident images
CREATE POLICY "Authenticated users can upload incident images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'incident-images');

CREATE POLICY "Anyone can view incident images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'incident-images');

-- Enable realtime for login_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.login_logs;
