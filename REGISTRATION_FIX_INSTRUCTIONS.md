# 🔧 Rešitev za Napako pri Registraciji

## Problem
Napaka 500 pri registraciji: "Database error finding user"

## Rešitev

### Možnost 1: Supabase Dashboard (Priporočeno)

1. **Pojdite v Supabase Dashboard:**
   https://supabase.com/dashboard/project/xjnffvqtqxnqobqezouv/sql/new

2. **Kopirajte in izvedite SQL:**
   - Odprite datoteko: `supabase/migrations/20260209000001_final_registration_fix.sql`
   - Kopirajte celotno vsebino
   - Prilepite v SQL Editor
   - Kliknite "Run" ali pritisnite `Ctrl + Enter`

3. **Preverite rezultat:**
   - Na dnu bi morali videti sporočilo: "✓ Registration setup is complete!"
   - Če vidite opozorila, poskusite znova

### Možnost 2: Supabase CLI

Če uporabljate Supabase CLI in imate lokalno razvojno okolje:

```powershell
# V korenski mapi projekta
supabase db push
```

## Kaj je bilo popravljeno?

1. ✅ **Dodana RLS politika** - Omogočena vstavljanje novih profilov
2. ✅ **Popravljena handle_new_user funkcija** - Boljše ravnanje z napakami
3. ✅ **Popravljena generate_referral_code funkcija** - Robust generiranje kod
4. ✅ **Dodane manjkajoče kolone** - email, referral_code
5. ✅ **Pravi dovoljenja** - GRANT za vse potrebne vloge
6. ✅ **TypeScript napake** - Popravljene `any` tipe v auth-middleware.ts

## Testiranje

Po aplikaciji popravka preizkusite registracijo:

1. Odprite: https://studko-diaf8rghc-nejcs-projects-9b89559c.vercel.app/register
2. Vnesite:
   - Ime: Test User
   - Email: test@example.com
   - Geslo: Test123!@#
3. Kliknite "Registriraj se"
4. Če ne vidite napake 500, je popravek uspel! 🎉

## Če še vedno ne deluje

Preverite naslednje v Supabase Dashboard:

### 1. Preverite tabelo profiles
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public';
```

Mora vsebovati: id, full_name, email, referral_code, created_at

### 2. Preverite RLS politike
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

Mora biti vsaj 3 politike.

### 3. Preverite trigger-je
```sql
SELECT tgname, proname 
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.profiles'::regclass;
```

Mora biti: set_referral_code trigger

### 4. Poglejte Logs
V Supabase Dashboard:
- Kliknite "Logs" > "Database"
- Filtrirajte po "ERROR" ali "WARNING"
- Poiščite napake povezane z `handle_new_user` ali `generate_referral_code`

## Kontakt

Če napaka še vedno obstaja, pošljite screenshot:
1. Napake v konzoli (F12)
2. Supabase Database Logs
3. Rezultat verifikacijskih SQL poizvedb zgoraj
