-- Add cancel_at_period_end field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

-- Add stripe_subscription_id field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;