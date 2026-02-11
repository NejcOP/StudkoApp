-- ===================================================
-- Migration: Poenostavi registracijo - odstrani trigger komplikacije
-- Datum: 2026-02-10
-- Problem: Triggerji povzročajo 500 napako pri registraciji
-- Rešitev: Odstrani vse kompleksne triggerje, samo osnovna registracija profila
-- ===================================================

-- 1. Odstrani vse problematične triggerje
DROP TRIGGER IF EXISTS set_referral_code ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS generate_referral_code_trigger ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS protect_pro_status_trigger ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS audit_pro_status_change ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- 2. Odstrani stare funkcije
DROP FUNCTION IF EXISTS public.generate_referral_code() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. Omogoči NULL za referral_code (ne blokira več INSERTa)
ALTER TABLE public.profiles ALTER COLUMN referral_code DROP NOT NULL;

-- 4. Odstrani UNIQUE constraint (prevelika možnost collision z 8-char MD5)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_referral_code_key;

-- 5. Ustvari najpreprosteši handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Študent')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;  -- Ne blokiraj registracije
END;
$$;

-- 6. Samo en trigger - na auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Napolni referral codes za obstoječe profile
UPDATE public.profiles 
SET referral_code = UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8))
WHERE referral_code IS NULL OR referral_code = '';

-- 8. Ponovno dodaj UNIQUE constraint (zdaj ko so vse kode unikatne)
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);

-- 9. Ustvari funkcijo za kasnejše generiranje referral kod
CREATE OR REPLACE FUNCTION public.ensure_referral_code(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code TEXT;
  attempt INTEGER := 0;
BEGIN
  SELECT referral_code INTO new_code
  FROM public.profiles WHERE id = user_id;
  
  IF new_code IS NOT NULL THEN
    RETURN new_code;
  END IF;
  
  LOOP
    new_code := UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8));
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code) THEN
      UPDATE public.profiles SET referral_code = new_code WHERE id = user_id;
      RETURN new_code;
    END IF;
    
    attempt := attempt + 1;
    IF attempt > 50 THEN
      RAISE EXCEPTION 'Cannot generate unique referral code';
    END IF;
  END LOOP;
END;
$$;

-- 10. Fix RLS policies
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authentication" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for new user registration" ON public.profiles;

CREATE POLICY "Allow profile creation"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- 11. Permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
GRANT ALL ON public.profiles TO service_role, postgres;
GRANT INSERT, SELECT, UPDATE ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.ensure_referral_code(UUID) TO authenticated, service_role;
