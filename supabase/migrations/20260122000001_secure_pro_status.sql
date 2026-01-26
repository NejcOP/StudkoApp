-- Secure PRO status modifications - prevent users from self-upgrading
-- This migration ensures only service role (Stripe webhook) can modify is_pro status

-- Drop any existing insecure policies on profiles table that allow is_pro updates
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile (except pro status)" ON public.profiles;

-- Recreate profile update policy - users can only update basic profile fields
-- We use a trigger to enforce protection of PRO fields instead of WITH CHECK
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create policy for service role to update all profile fields (including is_pro)
DROP POLICY IF EXISTS "Service role can update all profile fields" ON public.profiles;
CREATE POLICY "Service role can update all profile fields"
  ON public.profiles FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Create trigger to prevent unauthorized changes to PRO fields
CREATE OR REPLACE FUNCTION protect_pro_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow changes if user is service role
  IF auth.jwt() ->> 'role' != 'service_role' THEN
    -- Prevent modification of PRO-related fields
    NEW.is_pro := OLD.is_pro;
    NEW.subscription_status := OLD.subscription_status;
    NEW.pro_since := OLD.pro_since;
    NEW.trial_used := OLD.trial_used;
    NEW.trial_ends_at := OLD.trial_ends_at;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.cancel_at_period_end := OLD.cancel_at_period_end;
    NEW.current_period_end := OLD.current_period_end;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to protect PRO status fields
DROP TRIGGER IF EXISTS protect_pro_status_trigger ON public.profiles;
CREATE TRIGGER protect_pro_status_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_pro_status();

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
COMMENT ON POLICY "Users can update own profile" ON public.profiles IS 
  'Users can update their own profile. PRO-related fields are protected by protect_pro_status trigger. Only service role (Stripe webhook) can update is_pro status.';

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
