-- Create flashcards table for storing flashcard sets
CREATE TABLE IF NOT EXISTS public.flashcard_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  source_text text,
  subject text,
  title text NOT NULL
);

-- Create flashcard items table for individual question/answer pairs
CREATE TABLE IF NOT EXISTS public.flashcard_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flashcard_set_id uuid NOT NULL REFERENCES public.flashcard_sets(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on flashcard_sets
ALTER TABLE public.flashcard_sets ENABLE ROW LEVEL SECURITY;

-- Enable RLS on flashcard_items
ALTER TABLE public.flashcard_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for flashcard_sets
CREATE POLICY "Users can view their own flashcard sets"
  ON public.flashcard_sets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcard sets"
  ON public.flashcard_sets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcard sets"
  ON public.flashcard_sets
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for flashcard_items
CREATE POLICY "Users can view flashcard items from their sets"
  ON public.flashcard_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.flashcard_sets
      WHERE id = flashcard_items.flashcard_set_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert flashcard items to their sets"
  ON public.flashcard_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.flashcard_sets
      WHERE id = flashcard_items.flashcard_set_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete flashcard items from their sets"
  ON public.flashcard_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.flashcard_sets
      WHERE id = flashcard_items.flashcard_set_id
      AND user_id = auth.uid()
    )
  );

-- Create index for better query performance
CREATE INDEX idx_flashcard_sets_user_id ON public.flashcard_sets(user_id);
CREATE INDEX idx_flashcard_items_set_id ON public.flashcard_items(flashcard_set_id);