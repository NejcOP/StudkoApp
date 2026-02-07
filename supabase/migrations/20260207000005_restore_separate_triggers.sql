-- Restore separate trigger system that was removed in emergency simplification
-- This brings back the BEFORE INSERT trigger for referral code generation
-- and separates concerns properly

-- 1. Recreate generate_referral_code function with BEFORE INSERT trigger
DROP FUNCTION IF EXISTS public.generate_referral_code() CASCADE;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  -- Only generate if not already set
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

-- 2. Create BEFORE INSERT trigger for referral code
DROP TRIGGER IF EXISTS set_referral_code ON public.profiles;
DROP TRIGGER IF EXISTS generate_referral_code_trigger ON public.profiles;

CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION public.generate_referral_code();

-- 3. Update handle_new_user to NOT generate referral code (BEFORE trigger handles it)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simply insert profile - BEFORE INSERT trigger will handle referral code
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
    -- Log but don't fail registration
    RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. Recreate AFTER INSERT trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Ensure all RLS policies exist
DROP POLICY IF EXISTS "Enable insert for new user registration" ON public.profiles;
CREATE POLICY "Enable insert for new user registration"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.generate_referral_code() IS 'BEFORE INSERT trigger that generates unique referral codes for new profiles';
COMMENT ON FUNCTION public.handle_new_user() IS 'AFTER INSERT trigger that creates profile when auth user is created';
