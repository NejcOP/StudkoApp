-- Add trial_used column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE;

-- Add pro_since column to track when user became PRO
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pro_since TIMESTAMP WITH TIME ZONE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_trial_used ON public.profiles(trial_used);
