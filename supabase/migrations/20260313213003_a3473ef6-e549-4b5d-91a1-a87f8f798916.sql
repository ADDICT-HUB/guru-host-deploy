
-- Platform settings table for deploy cost etc
CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage settings" ON public.platform_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read settings" ON public.platform_settings FOR SELECT TO authenticated USING (true);
INSERT INTO public.platform_settings (key, value) VALUES ('deploy_cost', '50');

-- Bot repos table for multiple WhatsApp MD bots
CREATE TABLE public.bot_repos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  repo_url text NOT NULL,
  description text,
  session_var_name text NOT NULL DEFAULT 'SESSION_ID',
  default_vars jsonb DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.bot_repos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage repos" ON public.bot_repos FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can read active repos" ON public.bot_repos FOR SELECT TO authenticated USING (active = true);

-- Seed default GURU-MD repo
INSERT INTO public.bot_repos (name, repo_url, description, session_var_name) VALUES 
('GURU-MD', 'https://github.com/Gurulabstech/GURU-MD/tarball/main', 'GURU-MD WhatsApp Bot', 'SESSION_ID');

-- Add repo_id and custom_vars to bots table
ALTER TABLE public.bots ADD COLUMN repo_id uuid REFERENCES public.bot_repos(id);
ALTER TABLE public.bots ADD COLUMN custom_vars jsonb DEFAULT '{}'::jsonb;
