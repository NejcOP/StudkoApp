-- Add improved_file_url to notes table
ALTER TABLE public.notes ADD COLUMN improved_file_url TEXT;

-- Create flashcards table
CREATE TABLE public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on flashcards
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

-- Flashcards RLS policies
CREATE POLICY "Users can view their own flashcards"
  ON public.flashcards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcards"
  ON public.flashcards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcards"
  ON public.flashcards FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_flashcards_note_id ON public.flashcards(note_id);
CREATE INDEX idx_flashcards_user_id ON public.flashcards(user_id);