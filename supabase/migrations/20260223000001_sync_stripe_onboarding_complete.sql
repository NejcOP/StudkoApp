-- ===================================================
-- Migration: Sync stripe_onboarding_complete with stripe_connect_id
-- Date: 2026-02-23
-- Problem: Users with stripe_connect_id but without stripe_onboarding_complete=true
-- Solution: Set stripe_onboarding_complete=true for all users who have stripe_connect_id
-- ===================================================

-- Update all profiles that have stripe_connect_id but don't have stripe_onboarding_complete
UPDATE public.profiles
SET stripe_onboarding_complete = true
WHERE stripe_connect_id IS NOT NULL 
  AND stripe_connect_id != '' 
  AND (stripe_onboarding_complete IS NULL OR stripe_onboarding_complete = false);
