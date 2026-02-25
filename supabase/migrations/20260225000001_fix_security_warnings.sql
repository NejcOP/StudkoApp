-- Fix security warnings from Supabase
-- 1. Add SET search_path to SECURITY DEFINER functions
-- 2. Fix RLS policies that allow unrestricted access
-- 3. Enable RLS on v_has_policy view

-- ============================================================
-- FIX 1: Add SET search_path to all SECURITY DEFINER functions
-- ============================================================

-- Fix protect_pro_status function
CREATE OR REPLACE FUNCTION protect_pro_status()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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
$$;

-- Fix log_pro_status_change function
CREATE OR REPLACE FUNCTION log_pro_status_change()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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
$$;

-- Fix notify_social_claim_approved function (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_social_claim_approved') THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION notify_social_claim_approved()
      RETURNS TRIGGER 
      SECURITY DEFINER
      SET search_path = public
      LANGUAGE plpgsql
      AS $func$
      BEGIN
        -- Insert notification when claim is approved
        IF NEW.status = ''approved'' AND OLD.status != ''approved'' THEN
          INSERT INTO notifications (user_id, type, message, created_at)
          VALUES (
            NEW.user_id,
            ''claim_approved'',
            ''Your social claim has been approved! Enjoy your PRO access.'',
            NOW()
          );
        END IF;
        RETURN NEW;
      END;
      $func$;
    ';
  END IF;
END $$;

-- Fix update_last_email_change function
CREATE OR REPLACE FUNCTION update_last_email_change()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the timestamp when email changes
  IF OLD.id IS NOT NULL AND NEW.email != OLD.email THEN
    UPDATE profiles 
    SET last_email_change_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix sync_email_to_profiles function
CREATE OR REPLACE FUNCTION sync_email_to_profiles()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Fix update_last_password_change function
CREATE OR REPLACE FUNCTION update_last_password_change()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the timestamp when password changes
  IF NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password THEN
    UPDATE profiles 
    SET last_password_change_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix sync_email_to_all_tables function
CREATE OR REPLACE FUNCTION sync_email_to_all_tables()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update profiles
  UPDATE profiles SET email = NEW.email WHERE id = NEW.id;
  
  -- Update tutors table if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tutors') THEN
    UPDATE tutors SET email = NEW.email WHERE user_id = NEW.id;
  END IF;
  
  -- Update tutor_applications if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tutor_applications') THEN
    UPDATE tutor_applications SET email = NEW.email WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix ensure_referral_code function
CREATE OR REPLACE FUNCTION public.ensure_referral_code(user_id UUID)
RETURNS TEXT 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  existing_code TEXT;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Check if user already has a referral code
  SELECT referral_code INTO existing_code
  FROM profiles
  WHERE id = user_id;

  IF existing_code IS NOT NULL THEN
    RETURN existing_code;
  END IF;

  -- Generate a new unique referral code
  LOOP
    new_code := UPPER(SUBSTR(MD5(RANDOM()::TEXT || user_id::TEXT), 1, 8));
    
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;

  -- Update the user's profile with the new referral code
  UPDATE profiles
  SET referral_code = new_code
  WHERE id = user_id;

  RETURN new_code;
END;
$$;

-- Fix notify_admin_tutor_application function (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_admin_tutor_application') THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION notify_admin_tutor_application()
      RETURNS TRIGGER 
      SECURITY DEFINER
      SET search_path = public
      LANGUAGE plpgsql
      AS $func$
      BEGIN
        -- Notify admins when a new tutor application is submitted
        INSERT INTO notifications (user_id, type, message, created_at)
        SELECT 
          id,
          ''tutor_application'',
          ''New tutor application from '' || NEW.full_name,
          NOW()
        FROM profiles
        WHERE is_admin = true;
        
        RETURN NEW;
      END;
      $func$;
    ';
  END IF;
END $$;

-- ============================================================
-- FIX 2: Fix RLS policies that allow unrestricted access
-- ============================================================

-- Fix notifications table policies
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow functions to insert notifications via definer rights
CREATE POLICY "Functions can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (
    -- Allow if current user is service_role or if called from a SECURITY DEFINER function
    current_setting('role', true) = 'service_role'
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Fix profiles table - restrict profile creation to authenticated users
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
CREATE POLICY "Allow profile creation"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Fix referrals table - only service role can insert/update
DROP POLICY IF EXISTS "System can insert referrals" ON public.referrals;
CREATE POLICY "Service role can insert referrals"
  ON public.referrals FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow SECURITY DEFINER functions to insert
CREATE POLICY "Functions can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (
    current_setting('role', true) = 'service_role'
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

DROP POLICY IF EXISTS "System can update referrals" ON public.referrals;
CREATE POLICY "Service role can update referrals"
  ON public.referrals FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Functions can update referrals"
  ON public.referrals FOR UPDATE
  USING (
    current_setting('role', true) = 'service_role'
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  )
  WITH CHECK (
    current_setting('role', true) = 'service_role'
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Fix social_claims table - restrict admin updates to actual admins
DROP POLICY IF EXISTS "Admins can update claims" ON public.social_claims;
CREATE POLICY "Admins can update claims"
  ON public.social_claims FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Service role can also update claims
CREATE POLICY "Service role can update claims"
  ON public.social_claims FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix waiting_list - keep permissive for landing page, but clean up duplicates
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON public.waiting_list;
DROP POLICY IF EXISTS "Public insert" ON public.waiting_list;
-- Keep "Anyone can join waiting list" as it's needed for landing page

-- ============================================================
-- FIX 3: Enable RLS on v_has_policy view (if it exists)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'v_has_policy'
  ) THEN
    -- Enable RLS on the view
    ALTER VIEW public.v_has_policy SET (security_invoker = true);
    
    -- Or if it's a materialized view
    IF EXISTS (
      SELECT 1 FROM pg_class 
      WHERE relname = 'v_has_policy' 
      AND relkind = 'm'
    ) THEN
      ALTER MATERIALIZED VIEW public.v_has_policy OWNER TO postgres;
    END IF;
  END IF;
END $$;

-- ============================================================
-- GRANT appropriate permissions
-- ============================================================

-- Grant execute permissions on updated functions
GRANT EXECUTE ON FUNCTION protect_pro_status() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION log_pro_status_change() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_last_email_change() TO service_role;
GRANT EXECUTE ON FUNCTION sync_email_to_profiles() TO service_role;
GRANT EXECUTE ON FUNCTION update_last_password_change() TO service_role;
GRANT EXECUTE ON FUNCTION sync_email_to_all_tables() TO service_role;
GRANT EXECUTE ON FUNCTION ensure_referral_code(UUID) TO authenticated, service_role;
