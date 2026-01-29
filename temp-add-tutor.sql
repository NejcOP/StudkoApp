-- Začasni SQL za dodajanje sebe kot inštruktorja (za testiranje)
-- IMPORTANT: Zamenjaj 'tvoj-email@primer.si' s svojim dejanskim emailom!

-- 1. Dodaj vnos v tutors tabelo
INSERT INTO public.tutors (
  user_id,
  full_name,
  email,
  subjects,
  price_per_hour,
  mode,
  bio,
  education_level,
  school_type,
  status,
  languages
)
SELECT 
  auth.uid(),
  p.full_name,
  auth.email(),
  ARRAY['Matematika', 'Programiranje']::text[],  -- Spremeni predmete po želji
  25.00,  -- Cena na uro
  'Online,Osebno',  -- Način poučevanja
  'Izkušen inštruktor z več let izkušenj.',  -- Bio
  'Univerzitetna',  -- Stopnja izobrazbe
  'Fakulteta',  -- Tip šole
  'approved',  -- Status - POMEMBNO!
  ARRAY['Slovenski', 'Angleški']::text[]  -- Jeziki
FROM public.profiles p
WHERE p.id = auth.uid()
ON CONFLICT (user_id) DO UPDATE SET
  status = 'approved',
  updated_at = NOW();

-- 2. Nastavi is_instructor = true v profiles
UPDATE public.profiles
SET is_instructor = true
WHERE id = auth.uid();
