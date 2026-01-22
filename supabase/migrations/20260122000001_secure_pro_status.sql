-- Secure PRO status modifications - prevent users from self-upgrading
-- This migration ensures only service role (Stripe webhook) can modify is_pro status

-- Drop any existing insecure policies on profiles table that allow is_pro updates
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recreate profile update policy with is_pro protection
CREATE POLICY "Users can update own profile (except pro status)"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND (
      -- User cannot change their own is_pro status
      (OLD.is_pro IS NOT DISTINCT FROM NEW.is_pro)
      AND (OLD.subscription_status IS NOT DISTINCT FROM NEW.subscription_status)
      AND (OLD.pro_since IS NOT DISTINCT FROM NEW.pro_since)
      AND (OLD.trial_used IS NOT DISTINCT FROM NEW.trial_used)
      AND (OLD.trial_ends_at IS NOT DISTINCT FROM NEW.trial_ends_at)
      AND (OLD.stripe_subscription_id IS NOT DISTINCT FROM NEW.stripe_subscription_id)
      AND (OLD.stripe_customer_id IS NOT DISTINCT FROM NEW.stripe_customer_id)
      AND (OLD.cancel_at_period_end IS NOT DISTINCT FROM NEW.cancel_at_period_end)
      AND (OLD.current_period_end IS NOT DISTINCT FROM NEW.current_period_end)
    )
  );

-- Create policy for service role to update all profile fields (including is_pro)
CREATE POLICY "Service role can update all profile fields"
  ON public.profiles FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Create audit log function for PRO status changes
CREATE OR REPLACE FUNCTION log_pro_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log if is_pro status changed
  IF OLD.is_pro IS DISTINCT FROM NEW.is_pro THEN
    INSERT INTO security_audit_log (
      user_id,
      action,
      success,
      error_message
    ) VALUES (
      NEW.id,
      'pro_status_change',
      true,
      format('is_pro changed from %s to %s by role: %s', 
        OLD.is_pro, 
        NEW.is_pro, 
        COALESCE(current_setting('request.jwt.claims', true)::json->>'role', 'unknown')
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to audit PRO status changes
DROP TRIGGER IF EXISTS audit_pro_status_change ON public.profiles;
CREATE TRIGGER audit_pro_status_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.is_pro IS DISTINCT FROM NEW.is_pro)
  EXECUTE FUNCTION log_pro_status_change();

-- Add comment for documentation
COMMENT ON POLICY "Users can update own profile (except pro status)" ON public.profiles IS 
  'Users can update their own profile but cannot modify PRO-related fields. Only service role (Stripe webhook) can update is_pro status.';

-- Ensure social_claims modifications are properly secured
DROP POLICY IF EXISTS "Users can update their own claims" ON public.social_claims;

CREATE POLICY "Users cannot update claims after submission"
  ON public.social_claims FOR UPDATE
  USING (false); -- Users cannot update their claims once submitted

-- Service role can update claims (for admin approval)
CREATE POLICY "Service role can update social claims"
  ON public.social_claims FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
