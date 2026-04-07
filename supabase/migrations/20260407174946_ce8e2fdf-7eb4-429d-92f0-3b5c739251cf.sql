
CREATE TABLE public.marketplace_bots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  repo_url TEXT NOT NULL,
  pairing_link TEXT,
  image_url TEXT,
  session_var_name TEXT NOT NULL DEFAULT 'SESSION_ID',
  category TEXT NOT NULL DEFAULT 'general',
  featured BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  deploy_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active marketplace bots"
ON public.marketplace_bots FOR SELECT TO authenticated
USING (active = true);

CREATE POLICY "Admins can manage marketplace bots"
ON public.marketplace_bots FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_marketplace_bots_updated_at
BEFORE UPDATE ON public.marketplace_bots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
