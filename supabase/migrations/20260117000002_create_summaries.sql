-- Create summaries table for storing AI-generated summaries
CREATE TABLE IF NOT EXISTS public.summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_text TEXT NOT NULL,
  short_summary TEXT NOT NULL,
  long_summary TEXT NOT NULL,
  bullet_points TEXT[] NOT NULL DEFAULT '{}',
  key_definitions JSONB NOT NULL DEFAULT '[]',
  glossary JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS summaries_user_id_idx ON public.summaries(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS summaries_created_at_idx ON public.summaries(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can view their own summaries
CREATE POLICY "Users can view own summaries"
  ON public.summaries
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own summaries
CREATE POLICY "Users can insert own summaries"
  ON public.summaries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own summaries
CREATE POLICY "Users can update own summaries"
  ON public.summaries
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy: Users can delete their own summaries
CREATE POLICY "Users can delete own summaries"
  ON public.summaries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_summaries_updated_at
  BEFORE UPDATE ON public.summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
