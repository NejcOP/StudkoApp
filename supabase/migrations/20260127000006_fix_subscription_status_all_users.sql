-- Fix subscription status for ALL users with is_pro=true, regardless of stripe_subscription_id
-- This ensures that all PRO users (including test accounts) have correct subscription_status

UPDATE profiles
SET subscription_status = 'active'
WHERE is_pro = true 
  AND (subscription_status = 'none' OR subscription_status IS NULL);

-- Set default current_period_end for users without it (30 days from now)
UPDATE profiles
SET current_period_end = (NOW() + INTERVAL '30 days')
WHERE is_pro = true 
  AND subscription_status = 'active'
  AND current_period_end IS NULL;
