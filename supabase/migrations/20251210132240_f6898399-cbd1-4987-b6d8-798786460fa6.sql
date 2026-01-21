-- Add is_instructor column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_instructor boolean DEFAULT false;