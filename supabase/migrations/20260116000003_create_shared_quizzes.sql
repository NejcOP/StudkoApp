-- Create shared_quizzes table for quiz sharing functionality
create table public.shared_quizzes (
  id uuid not null default gen_random_uuid(),
  quiz_id uuid not null references public.quiz_results(id) on delete cascade,
  share_code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  views_count integer not null default 0,
  primary key (id)
);

-- Enable RLS
alter table public.shared_quizzes enable row level security;

-- RLS Policies
-- Anyone can view shared quizzes by share code
create policy "Anyone can view shared quizzes"
  on public.shared_quizzes
  for select
  using (true);

-- Users can create their own shared quizzes
create policy "Users can create shared quizzes"
  on public.shared_quizzes
  for insert
  with check (auth.uid() = created_by);

-- Users can delete their own shared quizzes
create policy "Users can delete own shared quizzes"
  on public.shared_quizzes
  for delete
  using (auth.uid() = created_by);

-- Create index for faster lookups
create index shared_quizzes_share_code_idx on public.shared_quizzes(share_code);
create index shared_quizzes_quiz_id_idx on public.shared_quizzes(quiz_id);
