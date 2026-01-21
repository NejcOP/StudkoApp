-- Create profiles table for user information
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  created_at timestamp with time zone not null default now(),
  primary key (id)
);

alter table public.profiles enable row level security;

-- Create trigger function to create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Študent'));
  return new;
end;
$$;

-- Trigger to automatically create profile
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create notes table
create table public.notes (
  id uuid not null default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  subject text not null,
  level text not null,
  type text not null,
  school_type text not null,
  price numeric not null default 0,
  file_url text,
  created_at timestamp with time zone not null default now(),
  primary key (id)
);

alter table public.notes enable row level security;

-- RLS Policies for profiles
create policy "Profiles are viewable by everyone"
  on public.profiles
  for select
  using (true);

create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

-- RLS Policies for notes
create policy "Notes are viewable by everyone"
  on public.notes
  for select
  using (true);

create policy "Users can insert their own notes"
  on public.notes
  for insert
  with check (auth.uid() = author_id);

create policy "Users can update their own notes"
  on public.notes
  for update
  using (auth.uid() = author_id);

create policy "Users can delete their own notes"
  on public.notes
  for delete
  using (auth.uid() = author_id);