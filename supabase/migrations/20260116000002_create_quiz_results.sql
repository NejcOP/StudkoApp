-- Create quiz_results table for storing quiz history
create table public.quiz_results (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  score integer not null,
  total_questions integer not null,
  time_taken integer, -- in seconds
  quiz_data jsonb not null, -- stores questions, answers, and explanations
  created_at timestamp with time zone not null default now(),
  primary key (id)
);

-- Enable RLS
alter table public.quiz_results enable row level security;

-- RLS Policies
-- Users can view their own quiz results
create policy "Users can view own quiz results"
  on public.quiz_results
  for select
  using (auth.uid() = user_id);

-- Users can insert their own quiz results
create policy "Users can insert own quiz results"
  on public.quiz_results
  for insert
  with check (auth.uid() = user_id);

-- Users can delete their own quiz results
create policy "Users can delete own quiz results"
  on public.quiz_results
  for delete
  using (auth.uid() = user_id);

-- Create indexes for faster queries
create index quiz_results_user_id_idx on public.quiz_results(user_id);
create index quiz_results_created_at_idx on public.quiz_results(created_at desc);
