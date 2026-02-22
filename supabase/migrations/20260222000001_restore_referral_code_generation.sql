-- ===================================================
-- Migration: Restore automatic referral code generation
-- Date: 2026-02-22
-- Problem: Users created after simplify_registration don't get referral codes
-- Solution: Add back trigger to generate codes automatically on profile creation
-- ===================================================

-- 1. Create function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  attempt INTEGER := 0;
BEGIN
  -- Only generate if referral_code is NULL or empty
  IF NEW.referral_code IS NOT NULL AND NEW.referral_code != '' THEN
    RETURN NEW;
  END IF;
  
  -- Try to generate a unique code
  LOOP
    new_code := UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8));
    
    -- Check if code is unique
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code) THEN
      NEW.referral_code := new_code;
      RETURN NEW;
    END IF;
    
    attempt := attempt + 1;
    IF attempt > 50 THEN
      RAISE WARNING 'Could not generate unique referral code after 50 attempts for user %', NEW.id;
      -- Set a fallback code with timestamp to ensure uniqueness
      NEW.referral_code := UPPER(SUBSTRING(MD5(NEW.id::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT) FROM 1 FOR 8));
      RETURN NEW;
    END IF;
  END LOOP;
END;
$$;

-- 2. Create trigger on profiles table
DROP TRIGGER IF EXISTS set_referral_code_on_insert ON public.profiles;

CREATE TRIGGER set_referral_code_on_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

-- 3. Update existing profiles that have NULL or empty referral codes
DO $$
DECLARE
  profile_record RECORD;
  new_code TEXT;
  attempt INTEGER;
BEGIN
  FOR profile_record IN 
    SELECT id FROM public.profiles 
    WHERE referral_code IS NULL OR referral_code = ''
  LOOP
    attempt := 0;
    LOOP
      new_code := UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8));
      
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code) THEN
        UPDATE public.profiles 
        SET referral_code = new_code 
        WHERE id = profile_record.id;
        EXIT;
      END IF;
      
      attempt := attempt + 1;
      IF attempt > 50 THEN
        -- Fallback with timestamp
        new_code := UPPER(SUBSTRING(MD5(profile_record.id::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT) FROM 1 FOR 8));
        UPDATE public.profiles 
        SET referral_code = new_code 
        WHERE id = profile_record.id;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- 4. Make referral_code NOT NULL again (now that all profiles have codes)
ALTER TABLE public.profiles ALTER COLUMN referral_code SET NOT NULL;

-- 5. Ensure UNIQUE constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_referral_code_key'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);
  END IF;
END $$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO authenticated, service_role, postgres;

-- 7. Add helpful comment
COMMENT ON FUNCTION public.generate_referral_code() IS 'Automatically generates unique 8-character referral codes for new profiles';
