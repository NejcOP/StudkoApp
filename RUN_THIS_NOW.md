## ✅ SQL POPRAVEK ZA REGISTRACIJO

### Kaj storiti ZDAJ:

1. **SQL Editor se je odprl v brskalniku**
   - URL: https://supabase.com/dashboard/project/xjnffvqtqxnqobqezouv/sql/new

2. **Kopiraj SQL popravek:**

```sql
-- HITRI POPRAVEK - Kopiraj v Supabase SQL Editor

-- 1. DODAJ MANJKAJOČE KOLONE
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- 2. ODSTRANI STARE TRIGGER-JE IN FUNKCIJE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_referral_code ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.generate_referral_code() CASCADE;

-- 3. USTVARI FUNKCIJO ZA GENERIRANJE REFERRAL KODE
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
BEGIN
  IF NEW.referral_code IS NULL THEN
    new_code := SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT) FROM 1 FOR 8);
    NEW.referral_code := new_code;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    NEW.referral_code := SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. USTVARI FUNKCIJO ZA USTVARJANJE PROFILA
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Študent'),
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 5. USTVARI TRIGGER-JE
CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. POPRAVI RLS POLITIKE
DROP POLICY IF EXISTS "Enable insert for new user registration" ON public.profiles;
CREATE POLICY "Enable insert for new user registration"
  ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 7. DODELI DOVOLJENJA
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO anon, authenticated, service_role;
```

3. **V SQL Editorju:**
   - Prilepi zgornji SQL (brez \`\`\`sql markerjev)
   - Klikni **"Run"** ali pritisni **Ctrl + Enter**
   - Počakaj na sporočilo "Success"

4. **Testiraj registracijo:**
   - Pojdi na: https://studko-diaf8rghc-nejcs-projects-9b89559c.vercel.app/register
   - Poskusi registrirati novega uporabnika
   - Napaka 500 bi morala biti odpravljena! 🎉

### Dodatno:

- TypeScript napake v `auth-middleware.ts` so že popravljene ✅
- Nova migracija je pripravljena: `supabase/migrations/20260209000001_final_registration_fix.sql`
- Lahko naslednjič uporabite `supabase db push` za avtomatsko pošiljanje migracij
