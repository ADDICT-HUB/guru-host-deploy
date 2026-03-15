
-- Function to set referred_by when a new user profile is created
CREATE OR REPLACE FUNCTION public.handle_referral_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ref_record RECORD;
BEGIN
  -- Check if there's a pending referral for this user
  SELECT * INTO ref_record FROM public.referrals 
  WHERE referred_id = NEW.id AND status = 'pending' LIMIT 1;
  
  IF FOUND THEN
    UPDATE public.profiles SET referred_by = ref_record.referrer_id WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger after profile insert
CREATE TRIGGER on_profile_created_referral
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_referral_on_signup();
