-- Add content column to flashcard_sets table if not exists
-- This migration adds the content JSONB column to store flashcard data

-- Add content column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'flashcard_sets' 
    AND column_name = 'content'
  ) THEN
    ALTER TABLE public.flashcard_sets ADD COLUMN content jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Update existing rows to have empty array if null
UPDATE public.flashcard_sets SET content = '[]'::jsonb WHERE content IS NULL;

-- Create indexes if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'flashcard_sets' 
    AND indexname = 'flashcard_sets_user_id_idx'
  ) THEN
    CREATE INDEX flashcard_sets_user_id_idx ON public.flashcard_sets(user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'flashcard_sets' 
    AND indexname = 'flashcard_sets_created_at_idx'
  ) THEN
    CREATE INDEX flashcard_sets_created_at_idx ON public.flashcard_sets(created_at DESC);
  END IF;
END $$;
