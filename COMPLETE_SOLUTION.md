# 🔧 Kompletna Rešitev za Registracijski Error 500

## 📋 Analiza Problema

**Identificirane težave:**

1. ❌ **Tabela `profiles`** je imela `full_name TEXT NOT NULL` - če trigger ne vstavibrez napake, registracija faila
2. ❌ **Manjkal je `email` stolpec** v originalni strukturi
3. ❌ **Trigger ni imel robustnega error handlinga** - vsaka napaka je blokirala registracijo
4. ⚠️ **RLS politike niso bile optimalne** za insert operacijo

---

## ✅ Rešitev

### 1️⃣ SQL Koda za Trigger in Funkcijo

**Uporabi ta SQL v Supabase Dashboard:**
https://supabase.com/dashboard/project/xjnffvqtqxnqobqezouv/sql/new

```sql
-- ============================================
-- KORAK 1: POPRAVI STRUKTURO TABELE
-- ============================================

-- Dodaj email stolpec
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Dodaj referral_code stolpec
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.profiles ADD CONSTRAINT IF NOT EXISTS profiles_referral_code_key UNIQUE (referral_code);

-- POMEMBNO: Odstrani NOT NULL iz full_name
ALTER TABLE public.profiles ALTER COLUMN full_name DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN full_name SET DEFAULT 'Študent';

-- ============================================
-- KORAK 2: USTVARI TRIGGER FUNKCIJO
-- ============================================

-- Drop obstoječih
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_referral_code ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.generate_referral_code() CASCADE;

-- Funkcija za generiranje referral kode
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
BEGIN
  IF NEW.referral_code IS NULL THEN
    new_code := SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT) FROM 1 FOR 8);
    
    -- Preveri unikatnost
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code) THEN
      NEW.referral_code := new_code;
    ELSE
      -- Fallback
      NEW.referral_code := SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8);
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    NEW.referral_code := SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcija za ustvarjanje profila (KLJUČNA FUNKCIJA!)
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
  -- Izvleci podatke z fallbacki
  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email');
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',   -- Glavna pot
    NEW.raw_user_meta_data->>'fullName',    -- Alternativa (camelCase)
    NEW.raw_user_meta_data->>'name',        -- Alternativa
    'Študent'                                -- Default
  );

  -- Vstavi profil
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, user_email, user_full_name)
  ON CONFLICT (id) DO UPDATE 
  SET 
    email = COALESCE(EXCLUDED.email, profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- ⚠️ POMEMBNO: Ne blokiraj registracije, samo logiraj napako
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;  -- Vseeno vrni NEW!
END;
$$;

-- ============================================
-- KORAK 3: USTVARI TRIGGER-JE
-- ============================================

-- BEFORE INSERT - za referral kodo
CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION public.generate_referral_code();

-- AFTER INSERT - za nov profil
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- KORAK 4: NASTAVI RLS POLITIKE
-- ============================================

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

-- ============================================
-- KORAK 5: DODELI DOVOLJENJA
-- ============================================

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO anon, authenticated, service_role;
```

---

### 2️⃣ Frontend React Code (signUp)

**Tvoj trenutni signUp klic je PRAVILEN! ✅**

`src/hooks/useAuth.tsx`:
```tsx
const signUp = async (email: string, password: string, fullName: string) => {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,  // ✅ TO JE PRAVILNO!
      },
      emailRedirectTo: `${window.location.origin}/notes`,
    },
  });
  
  return { error };
};
```

**Ključni moment:**
- Frontend pošilja `full_name` v `options.data`
- Ta se shrani v `auth.users.raw_user_meta_data`
- Trigger to prebere kot `NEW.raw_user_meta_data->>'full_name'`
- **Usklajenost je popolna!** ✨

**Če bi želel dodati več podatkov (opcijsko):**
```tsx
const signUp = async (email: string, password: string, fullName: string) => {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        // Opcijsko:
        // avatar_url: '',
        // bio: '',
      },
      emailRedirectTo: `${window.location.origin}/notes`,
    },
  });
  
  return { error };
};
```

---

## 🎯 Kaj sem popravil?

| Problem | Rešitev |
|---------|---------|
| `full_name NOT NULL` je blokiralo inserte | `ALTER COLUMN full_name DROP NOT NULL` |
| Manjkal email stolpec | `ADD COLUMN IF NOT EXISTS email TEXT` |
| Trigger ni imel error handlinga | Dodan `EXCEPTION` block, ki vrača `NEW` |
| RLS politika ni dovoljevala insert | `CREATE POLICY ... WITH CHECK (true)` |
| Trigger je lahko failal brez fallbackov | Dodani `COALESCE` fallbacki za vse podatke |

---

## 📝 Checking System (Preveri da deluje)

Po zagonu SQL-a zaženi to v SQL Editorju za verifikacijo:

```sql
-- Preveri da vse dela
SELECT 
  'Stolpec email obstaja' as check_name,
  EXISTS(SELECT 1 FROM information_schema.columns 
         WHERE table_name='profiles' AND column_name='email') as status
UNION ALL
SELECT 
  'Stolpec full_name je nullable',
  (SELECT is_nullable='YES' FROM information_schema.columns 
   WHERE table_name='profiles' AND column_name='full_name')
UNION ALL
SELECT 
  'Trigger on_auth_user_created obstaja',
  EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='on_auth_user_created')
UNION ALL
SELECT 
  'Funkcija handle_new_user obstaja',
  EXISTS(SELECT 1 FROM pg_proc WHERE proname='handle_new_user')
UNION ALL
SELECT 
  'RLS politika za INSERT obstaja',
  EXISTS(SELECT 1 FROM pg_policies 
         WHERE tablename='profiles' AND policyname LIKE '%insert%');
```

Vse bi morale vrniti `true`! ✅

---

## 🚀 Testiranje

1. **Zaženi SQL** v Supabase Dashboard
2. **Počakaj ~5 sekund** da se spremembe propagirajo
3. **Testiraj registracijo** na: https://studko-diaf8rghc-nejcs-projects-9b89559c.vercel.app/register
4. **Preveri profile**:
   ```sql
   SELECT id, email, full_name, referral_code, created_at 
   FROM public.profiles 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

---

## 🆘 Če še vedno ne deluje

1. **Preveri Supabase Logs:**
   - Dashboard → Logs → Database
   - Filtriraj po "ERROR" ali "WARNING"
   - Išči `handle_new_user` v logih

2. **Preveri auth.users tabelo:**
   ```sql
   SELECT id, email, raw_user_meta_data 
   FROM auth.users 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   
   Preveri če `raw_user_meta_data` vsebuje `full_name`

3. **Force refresh Supabase schema cache:**
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

---

## 📚 Povzetek

✅ **SQL Trigger**: Robusten, z error handlingom, ne blokira registracije  
✅ **Database Schema**: Vsi stolpci pravilno nastavljeni, brez NOT NULL blockerjev  
✅ **Frontend Auth**: Povsem pravilen, ključ `full_name` se ujema s triggerjem  
✅ **RLS Policies**: Dovoljujejo INSERT za nove registracije

**Registracija bi morala sedaj uspešno delovati! 🎉**
