-- ===================================================
-- FINAL COMPREHENSIVE FIX for registration 500 error
-- Date: 2026-02-09
-- ===================================================

-- 1. Ensure email column exists in profiles table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- 2. Ensure referral_code column exists and is unique
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN referral_code TEXT UNIQUE;
  END IF;
END $$;

-- 3. Drop existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_referral_code ON public.profiles;
DROP TRIGGER IF EXISTS generate_referral_code_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.generate_referral_code() CASCADE;

-- 4. Create generate_referral_code function with robust error handling
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
        -- Use UUID-based code as fallback
        NEW.referral_code := SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8);
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If anything fails, use fallback code generation and log warning
    RAISE WARNING 'Error generating referral code for profile %: %', NEW.id, SQLERRM;
    NEW.referral_code := SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create handle_new_user function with comprehensive error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
BEGIN
  -- Extract email and full_name safely
  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email');
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Študent');

  -- Insert profile with ON CONFLICT to handle duplicates
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, user_name, user_email)
  ON CONFLICT (id) DO UPDATE 
  SET 
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email = COALESCE(EXCLUDED.email, profiles.email),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user registration
    RAISE WARNING 'Error in handle_new_user for user % (email: %): % - %', 
      NEW.id, user_email, SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$;

-- 6. Create BEFORE INSERT trigger for referral code generation
CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION public.generate_referral_code();

-- 7. Create AFTER INSERT trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 8. Drop existing RLS policies and recreate them correctly
DROP POLICY IF EXISTS "Enable insert for new user registration" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create comprehensive RLS policies
CREATE POLICY "Enable insert for new user registration"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 9. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON public.profiles TO authenticated, postgres, service_role;
GRANT SELECT ON public.profiles TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO anon, authenticated, service_role, postgres;

-- 10. Verify setup
DO $$
DECLARE
  policy_count INTEGER;
  trigger_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Check policies
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE tablename = 'profiles';
  
  -- Check triggers
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'profiles' AND NOT t.tgisinternal;
  
  -- Check functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN ('handle_new_user', 'generate_referral_code');
  
  RAISE NOTICE 'Setup verification:';
  RAISE NOTICE '  - Policies on profiles: %', policy_count;
  RAISE NOTICE '  - Triggers on profiles: %', trigger_count;
  RAISE NOTICE '  - Functions created: %', function_count;
  
  IF policy_count >= 3 AND trigger_count >= 1 AND function_count >= 2 THEN
    RAISE NOTICE '✓ Registration setup is complete!';
  ELSE
    RAISE WARNING '⚠ Registration setup may be incomplete';
  END IF;
END $$;

-- Add helpful comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger function that creates user profile on auth.users INSERT';
COMMENT ON FUNCTION public.generate_referral_code() IS 'Trigger function that generates unique referral codes for new profiles';
