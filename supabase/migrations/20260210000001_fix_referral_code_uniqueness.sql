-- ===================================================
-- POPRAVEK: Dodaj preverjanje unikatnosti referral kod
-- Datum: 2026-02-10
-- Problem: generate_referral_code ne preverja če je koda že uporabljena
-- Rešitev: Dodaj loop ki preveri unikatnost
-- ===================================================

-- 1. Izboljšaj generate_referral_code funkcijo z LOOP za unikatnost
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  max_attempts INTEGER := 20;
  attempt INTEGER := 0;
  code_exists BOOLEAN;
BEGIN
  -- Če referral_code že obstaja, ne naredi ničesar
  IF NEW.referral_code IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Generiraj unikatno kodo z loop preverjanjem
  LOOP
    -- Generiraj naključno 8-mestno uppercase kodo
    new_code := UPPER(SUBSTRING(
      MD5(RANDOM()::TEXT || NEW.id::TEXT || NOW()::TEXT || attempt::TEXT) 
      FROM 1 FOR 8
    ));
    
    -- Preveri če koda že obstaja
    SELECT EXISTS(
      SELECT 1 FROM public.profiles WHERE referral_code = new_code
    ) INTO code_exists;
    
    -- Če je unikatna, uporabi jo
    IF NOT code_exists THEN
      NEW.referral_code := new_code;
      RAISE LOG 'Generated unique referral code % for user %', new_code, NEW.id;
      EXIT;
    END IF;
    
    attempt := attempt + 1;
    
    -- Po max_attempts poskusih uporabi UUID-based kodo
    IF attempt >= max_attempts THEN
      NEW.referral_code := UPPER(SUBSTRING(
        REPLACE(gen_random_uuid()::TEXT, '-', '') 
        FROM 1 FOR 8
      ));
      RAISE WARNING 'Used UUID fallback for referral code after % attempts for user %', 
        max_attempts, NEW.id;
      EXIT;
    END IF;
  END LOOP;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- V primeru kakršnekoli napake, uporabi UUID in nadaljuj
    RAISE WARNING 'Error in generate_referral_code for user %: % (SQLSTATE: %)', 
      NEW.id, SQLERRM, SQLSTATE;
    NEW.referral_code := UPPER(SUBSTRING(
      REPLACE(gen_random_uuid()::TEXT, '-', '') 
      FROM 1 FOR 8
    ));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Izboljšaj handle_new_user funkcijo z boljšim error handlingom
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
  profile_exists BOOLEAN;
BEGIN
  -- Pridobi email in ime
  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '');
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Študent');

  -- Preveri če profil že obstaja
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE id = NEW.id
  ) INTO profile_exists;

  IF profile_exists THEN
    RAISE LOG 'Profile already exists for user %, updating...', NEW.id;
    
    -- Posodobi obstoječi profil
    UPDATE public.profiles 
    SET 
      full_name = COALESCE(user_name, full_name),
      email = COALESCE(user_email, email),
      updated_at = NOW()
    WHERE id = NEW.id;
  ELSE
    RAISE LOG 'Creating new profile for user % with email %', NEW.id, user_email;
    
    -- Ustvari nov profil
    INSERT INTO public.profiles (
      id, 
      email, 
      full_name,
      updated_at
    )
    VALUES (
      NEW.id,
      user_email,
      user_name,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE 
    SET 
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      email = COALESCE(EXCLUDED.email, profiles.email),
      updated_at = NOW();
  END IF;
  
  RAISE LOG 'Successfully processed profile for user % (email: %)', NEW.id, user_email;
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Specifično obravnavaj duplicate key napake
    RAISE WARNING 'Unique violation in handle_new_user for user % (email: %): %', 
      NEW.id, user_email, SQLERRM;
    -- Ne blokiraj registracije
    RETURN NEW;
  WHEN OTHERS THEN
    -- Vse druge napake
    RAISE WARNING 'Unexpected error in handle_new_user for user % (email: %): % (SQLSTATE: %)', 
      NEW.id, user_email, SQLERRM, SQLSTATE;
    -- Ne blokiraj registracije
    RETURN NEW;
END;
$$;

-- 3. Ponovno ustvari triggerje (da zagotovo uporabljajo nove funkcije)
DROP TRIGGER IF EXISTS set_referral_code ON public.profiles;
CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION public.generate_referral_code();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Zagotovi da imajo vse profile referral_code (popravi stare zapise)
UPDATE public.profiles 
SET referral_code = UPPER(SUBSTRING(
  REPLACE(gen_random_uuid()::TEXT, '-', '') 
  FROM 1 FOR 8
))
WHERE referral_code IS NULL;

-- 5. Preveri rezultat
DO $$
DECLARE
  trigger_count INTEGER;
  function_count INTEGER;
  profiles_without_code INTEGER;
BEGIN
  -- Preštej triggerje
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE t.tgname IN ('set_referral_code', 'on_auth_user_created');
  
  -- Preštej funkcije
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN ('generate_referral_code', 'handle_new_user');
  
  -- Preštej profile brez kode
  SELECT COUNT(*) INTO profiles_without_code
  FROM public.profiles
  WHERE referral_code IS NULL;
  
  RAISE NOTICE '=== MIGRATION RESULTS ===';
  RAISE NOTICE 'Triggers created: % (expected: 2)', trigger_count;
  RAISE NOTICE 'Functions updated: % (expected: 2)', function_count;
  RAISE NOTICE 'Profiles without referral_code: % (expected: 0)', profiles_without_code;
  
  IF trigger_count = 2 AND function_count = 2 AND profiles_without_code = 0 THEN
    RAISE NOTICE '✅ Migration completed successfully!';
  ELSE
    RAISE WARNING '⚠️ Migration may have issues, please verify manually';
  END IF;
END $$;
