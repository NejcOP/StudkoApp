-- Fix subscription status for users with is_pro=true but subscription_status='none'
-- This migration ensures that active PRO users have correct subscription_status

-- First, add current_period_end column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'current_period_end'
  ) THEN
    ALTER TABLE profiles ADD COLUMN current_period_end TIMESTAMPTZ;
  END IF;
END $$;

-- Update subscription_status for ALL active PRO users (removed stripe_subscription_id requirement)
UPDATE profiles
SET subscription_status = 'active'
WHERE is_pro = true 
  AND (subscription_status = 'none' OR subscription_status IS NULL);

-- Set default current_period_end for active subscriptions (30 days from now)
UPDATE profiles
SET current_period_end = (NOW() + INTERVAL '30 days')
WHERE is_pro = true 
  AND subscription_status = 'active'
  AND current_period_end IS NULL;
