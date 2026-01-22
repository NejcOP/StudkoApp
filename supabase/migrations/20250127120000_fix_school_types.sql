-- Fix school types to match lowercase format used in Notes.tsx filters
UPDATE public.schools 
SET type = 'srednja strokovna' 
WHERE type = 'Srednja strokovna';

UPDATE public.schools 
SET type = 'fakulteta' 
WHERE type = 'Fakulteta';

UPDATE public.schools 
SET type = 'poklicna' 
WHERE type = 'Poklicna' OR type = 'poklicna';

-- Keep Gimnazija with capital G as it's used that way in filters
-- (Gimnazija is the only one that uses capital letter)

-- Add more schools for different types
insert into public.schools (name, type) values
  -- More fakultete
  ('FER - Fakulteta za elektrotehniko', 'fakulteta'),
  ('Ekonomska fakulteta Ljubljana', 'fakulteta'),
  ('Medicinska fakulteta Ljubljana', 'fakulteta'),
  ('Pravna fakulteta Ljubljana', 'fakulteta'),
  ('Fakulteta za gradbeništvo in geodezijo', 'fakulteta'),
  ('Fakulteta za kemijo in kemijsko tehnologijo', 'fakulteta'),
  ('Fakulteta za strojništvo', 'fakulteta'),
  ('Fakulteta za družbene vede', 'fakulteta'),
  ('Fakulteta za matematiko in fiziko', 'fakulteta'),
  ('Biotehniška fakulteta', 'fakulteta'),
  ('Pedagoška fakulteta', 'fakulteta'),
  ('Filozofska fakulteta Ljubljana', 'fakulteta'),
  ('Fakulteta za računalništvo in informatiko Maribor', 'fakulteta'),
  
  -- Srednje strokovne šole
  ('Srednja trgovska šola Ljubljana', 'srednja strokovna'),
  ('Srednja zdravstvena šola Ljubljana', 'srednja strokovna'),
  ('Srednja ekonomska šola Ljubljana', 'srednja strokovna'),
  ('Srednja šola za gostinstvo in turizem Ljubljana', 'srednja strokovna'),
  ('Srednja šola za oblikovanje in fotografijo', 'srednja strokovna'),
  ('Srednja šola tehniških strok Šiška', 'srednja strokovna'),
  ('Srednja gradbena šola Ljubljana', 'srednja strokovna'),
  ('Srednja šola za kemijo, elektrotehniko in računalništvo', 'srednja strokovna'),
  
  -- Poklicne šole
  ('Srednja poklicna in strokovna šola Bežigrad', 'poklicna'),
  ('Srednja poklicna šola Vicenca Rojca Maribor', 'poklicna'),
  ('Srednja poklicna šola Celje', 'poklicna')
ON CONFLICT DO NOTHING;
