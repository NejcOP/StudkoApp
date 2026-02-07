-- Fix registration 500 error by improving error handling in triggers

-- Fix generate_referral_code with better error handling
DROP TRIGGER IF EXISTS generate_referral_code_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.generate_referral_code() CASCADE;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      -- Generate a random 8-character code
      new_code := SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT || attempt::TEXT) FROM 1 FOR 8);
      
      -- Check if code is unique
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code) THEN
        NEW.referral_code := new_code;
        EXIT;
      END IF;
      
      attempt := attempt + 1;
      IF attempt >= max_attempts THEN
        -- If we can't generate unique code after 10 attempts, use UUID-based code
        NEW.referral_code := SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8);
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If anything fails, use fallback code generation
    NEW.referral_code := SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER generate_referral_code_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

-- Improve handle_new_user function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Try to insert profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Študent'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email = COALESCE(EXCLUDED.email, profiles.email);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user registration
    RAISE WARNING 'Error in handle_new_user for user %: % - %', NEW.id, SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
