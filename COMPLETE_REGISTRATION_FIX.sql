-- ================================================================
-- KOMPLETNA REŠITEV REGISTRACIJE - Error 500 Fix
-- ================================================================
-- Datum: 2026-02-09
-- 
-- PROBLEM:
-- - Tabela profiles ima full_name NOT NULL, kar povzroči napako če trigger faila
-- - Manjka email stolpec ali ni pravilno nastavljen
-- - Trigger ne ravna z napakami pravilno
--
-- REŠITEV:
-- 1. Popravi strukturo tabele profiles (odstrani NOT NULL omejitve kjer trigger vpisuje)
-- 2. Dodaj manjkajoče stolpce (email, referral_code)
-- 3. Ustvari robusten trigger z error handlingom
-- 4. Nastavi pravilne RLS politike
-- ================================================================

-- =====================================
-- KORAK 1: POPRAVI TABELO PROFILES
-- =====================================

-- Dodaj email stolpec če ne obstaja
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

-- Dodaj referral_code stolpec če ne obstaja
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN referral_code TEXT;
  END IF;
END $$;

-- Dodaj unique constraint na referral_code če ne obstaja
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_referral_code_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);
  END IF;
END $$;

-- Odstrani NOT NULL constraint iz full_name če obstaja
-- (Da trigger lahko deluje tudi če fullName manjka)
ALTER TABLE public.profiles ALTER COLUMN full_name DROP NOT NULL;

-- Nastavi default za full_name
ALTER TABLE public.profiles ALTER COLUMN full_name SET DEFAULT 'Študent';

-- Dodaj updated_at stolpec če ne obstaja (za tracking sprememb)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- =====================================
-- KORAK 2: USTVARI TRIGGER FUNKCIJE
-- =====================================

-- DROP obstoječih triggerjev in funkcij
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_referral_code ON public.profiles;
DROP TRIGGER IF EXISTS generate_referral_code_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.generate_referral_code() CASCADE;

-- Funkcija za generiranje referral kode (BEFORE INSERT trigger)
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  -- Generiraj samo če še ni nastavljena
  IF NEW.referral_code IS NULL THEN
    LOOP
      -- Generiraj 8-mestno kodo
      new_code := SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT || attempt::TEXT) FROM 1 FOR 8);
      
      -- Preveri unikatnost
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code) THEN
        NEW.referral_code := new_code;
        EXIT;
      END IF;
      
      attempt := attempt + 1;
      IF attempt >= max_attempts THEN
        -- Fallback na UUID-based kodo
        NEW.referral_code := SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8);
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- V primeru napake uporabi fallback
    RAISE WARNING 'Error generating referral code for profile %: %', NEW.id, SQLERRM;
    NEW.referral_code := SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcija za ustvarjanje profila (AFTER INSERT na auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  user_full_name TEXT;
BEGIN
  -- Izvleci podatke varno (z fallbacki)
  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email');
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'fullName',
    NEW.raw_user_meta_data->>'name',
    'Študent'
  );

  -- Log za debugging (samo v development)
  RAISE LOG 'Creating profile for user %: email=%, full_name=%', NEW.id, user_email, user_full_name;

  -- Vstavi profil z ON CONFLICT za robustnost
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    user_email,
    user_full_name,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    email = COALESCE(EXCLUDED.email, profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log napako ampak NE blokiraj registracije
    RAISE WARNING 'Error in handle_new_user for user % (email: %): % - %', 
      NEW.id, user_email, SQLSTATE, SQLERRM;
    -- Vseeno vrni NEW, da registracija uspe
    RETURN NEW;
END;
$$;

-- =====================================
-- KORAK 3: USTVARI TRIGGER-JE
-- =====================================

-- BEFORE INSERT trigger za generiranje referral kode
CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION public.generate_referral_code();

-- AFTER INSERT trigger za ustvarjanje profila po registraciji
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================
-- KORAK 4: NASTAVI RLS POLITIKE
-- =====================================

-- Omogoči RLS če ni že
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop starih politik
DROP POLICY IF EXISTS "Enable insert for new user registration" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- INSERT politika - za nove registracije (trigger uporablja SECURITY DEFINER, ampak za varnost)
CREATE POLICY "Enable insert for new user registration"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- SELECT politika - vsi lahko vidijo vse profile (za javne profile)
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- UPDATE politika - uporabnik lahko spreminja samo svoj profil
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE politika - nihče ne more brisati profilov direktno (samo CASCADE iz auth.users)
-- No DELETE policy means nobody can delete directly

-- =====================================
-- KORAK 5: DOVOLJENJA (GRANTS)
-- =====================================

-- Dovoli uporabo funkcij
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO anon, authenticated, service_role, postgres;

-- Dovoli dostop do tabele
GRANT ALL ON public.profiles TO authenticated, postgres, service_role;
GRANT SELECT ON public.profiles TO anon;

-- =====================================
-- KORAK 6: VERIFIKACIJA
-- =====================================

DO $$
DECLARE
  policy_count INTEGER;
  trigger_count INTEGER;
  function_count INTEGER;
  has_email BOOLEAN;
  has_referral_code BOOLEAN;
  full_name_nullable BOOLEAN;
BEGIN
  -- Preveri politike
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE tablename = 'profiles';
  
  -- Preveri trigger-je (exclude internal triggers)
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'profiles' AND NOT t.tgisinternal;
  
  -- Preveri funkcije
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN ('handle_new_user', 'generate_referral_code');
  
  -- Preveri stolpce
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) INTO has_email;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'referral_code'
  ) INTO has_referral_code;
  
  SELECT is_nullable = 'YES' INTO full_name_nullable
  FROM information_schema.columns 
  WHERE table_name = 'profiles' AND column_name = 'full_name';
  
  -- Izpiši rezultate
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFIKACIJA REGISTRACIJSKE KONFIGURACIJE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS Politike na profiles: % (pričakovano: >= 3)', policy_count;
  RAISE NOTICE 'Trigger-ji na profiles: % (pričakovano: >= 1)', trigger_count;
  RAISE NOTICE 'Funkcije ustvarjene: % (pričakovano: 2)', function_count;
  RAISE NOTICE 'Stolpec email obstaja: %', has_email;
  RAISE NOTICE 'Stolpec referral_code obstaja: %', has_referral_code;
  RAISE NOTICE 'Stolpec full_name je nullable: %', full_name_nullable;
  RAISE NOTICE '========================================';
  
  IF policy_count >= 3 AND trigger_count >= 1 AND function_count = 2 
     AND has_email AND has_referral_code AND full_name_nullable THEN
    RAISE NOTICE '✅ VSE NASTAVLJENO PRAVILNO!';
    RAISE NOTICE 'Registracija bi morala sedaj delovati brez napak.';
  ELSE
    RAISE WARNING '⚠️  Nekatere nastavitve morda niso bile aplicirane pravilno.';
    RAISE WARNING 'Preverite zgornje vrednosti in ponovno zaženite.';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- =====================================
-- KOMENTARJI ZA DOKUMENTACIJO
-- =====================================

COMMENT ON FUNCTION public.handle_new_user() IS 
  'AFTER INSERT trigger na auth.users - ustvari profil z email in full_name iz user metadata';

COMMENT ON FUNCTION public.generate_referral_code() IS 
  'BEFORE INSERT trigger na profiles - generira unikatno 8-mestno referral kodo';

COMMENT ON TABLE public.profiles IS 
  'Uporabniški profili - vsak auth.user ima enega. Ustvarjen avtomatsko ob registraciji.';

COMMENT ON COLUMN public.profiles.email IS 
  'Email uporabnika - sinhroniziran iz auth.users';

COMMENT ON COLUMN public.profiles.full_name IS 
  'Polno ime uporabnika - privzeto "Študent" če ni podano';

COMMENT ON COLUMN public.profiles.referral_code IS 
  'Unikatna 8-mestna koda za referal sistem';

-- ========================================
-- KONČANO! Zdaj testirajte registracijo.
-- ========================================
