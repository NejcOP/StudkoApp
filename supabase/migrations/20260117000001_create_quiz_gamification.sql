-- Create user_quiz_stats table for XP, levels, and streaks
create table public.user_quiz_stats (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  total_xp integer not null default 0,
  current_level integer not null default 1,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_quiz_date date,
  total_quizzes_completed integer not null default 0,
  total_questions_answered integer not null default 0,
  total_correct_answers integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  primary key (id),
  unique(user_id)
);

-- Enable RLS
alter table public.user_quiz_stats enable row level security;

-- RLS Policies
create policy "Users can view own quiz stats"
  on public.user_quiz_stats
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own quiz stats"
  on public.user_quiz_stats
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own quiz stats"
  on public.user_quiz_stats
  for update
  using (auth.uid() = user_id);

-- Create index
create index user_quiz_stats_user_id_idx on public.user_quiz_stats(user_id);

-- Update shared_quizzes table to include quiz questions
alter table public.shared_quizzes add column if not exists quiz_data jsonb;
alter table public.shared_quizzes add column if not exists title text;
alter table public.shared_quizzes add column if not exists total_questions integer;

-- Create quiz_challenge_results table
create table public.quiz_challenge_results (
  id uuid not null default gen_random_uuid(),
  challenge_code text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null,
  total_questions integer not null,
  time_taken integer,
  percentage integer not null,
  created_at timestamp with time zone not null default now(),
  primary key (id)
);

-- Enable RLS
alter table public.quiz_challenge_results enable row level security;

-- RLS Policies - anyone can view challenge results for comparison
create policy "Anyone can view challenge results"
  on public.quiz_challenge_results
  for select
  using (true);

create policy "Users can insert own challenge results"
  on public.quiz_challenge_results
  for insert
  with check (auth.uid() = user_id);

-- Create index
create index quiz_challenge_results_challenge_code_idx on public.quiz_challenge_results(challenge_code);
create index quiz_challenge_results_user_id_idx on public.quiz_challenge_results(user_id);

-- Function to calculate level from XP
create or replace function calculate_level(xp integer)
returns integer
language plpgsql
as $$
begin
  -- Level 1: 0-99 XP (Bruec)
  -- Level 2: 100-299 XP (Študent)
  -- Level 3: 300-599 XP (Magister)
  -- Level 4: 600-999 XP (Doktor)
  -- Level 5: 1000+ XP (Profesor)
  if xp < 100 then
    return 1;
  elsif xp < 300 then
    return 2;
  elsif xp < 600 then
    return 3;
  elsif xp < 1000 then
    return 4;
  else
    return 5;
  end if;
end;
$$;

-- Function to get level title
create or replace function get_level_title(level integer)
returns text
language plpgsql
as $$
begin
  case level
    when 1 then return 'Bruec';
    when 2 then return 'Študent';
    when 3 then return 'Magister';
    when 4 then return 'Doktor';
    else return 'Profesor';
  end case;
end;
$$;

-- Function to get XP needed for next level
create or replace function get_xp_for_next_level(current_xp integer)
returns integer
language plpgsql
as $$
declare
  current_level integer;
begin
  current_level := calculate_level(current_xp);
  
  case current_level
    when 1 then return 100;
    when 2 then return 300;
    when 3 then return 600;
    when 4 then return 1000;
    else return 1000; -- Max level reached
  end case;
end;
$$;
