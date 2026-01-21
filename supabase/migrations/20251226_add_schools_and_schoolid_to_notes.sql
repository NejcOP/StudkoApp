-- 1. Create schools table
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null
);

-- 2. Add school_id to notes table
alter table public.notes add column if not exists school_id uuid references public.schools(id);

-- 3. Seed some schools
insert into public.schools (name, type) values
  ('Gimnazija Bežigrad', 'Gimnazija'),
  ('FRI', 'Fakulteta'),
  ('OŠ Vič', 'Osnovna šola'),
  ('SŠTS Šiška', 'Srednja strokovna');
