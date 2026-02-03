-- Add missing columns to tutors table
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS languages TEXT[];
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS methodology TEXT;
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS video_file_url TEXT;
