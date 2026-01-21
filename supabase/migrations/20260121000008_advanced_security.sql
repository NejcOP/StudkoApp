-- Advanced security measures to prevent unauthorized access

-- 1. Add security audit logging table
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_security_audit_user ON security_audit_log(user_id);
CREATE INDEX idx_security_audit_created ON security_audit_log(created_at);
CREATE INDEX idx_security_audit_action ON security_audit_log(action);

-- Enable RLS
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs (you'll need to add admin role separately)
CREATE POLICY "Only service role can insert audit logs"
  ON security_audit_log FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 2. Add rate limiting table to track requests
CREATE TABLE IF NOT EXISTS rate_limit_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address or user_id
  action TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  blocked_until TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_rate_limit_identifier ON rate_limit_tracker(identifier, action);
CREATE INDEX idx_rate_limit_window ON rate_limit_tracker(window_start);

ALTER TABLE rate_limit_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can manage rate limits"
  ON rate_limit_tracker FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 3. Function to check and enforce rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_action TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
  v_blocked_until TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check if currently blocked
  SELECT blocked_until INTO v_blocked_until
  FROM rate_limit_tracker
  WHERE identifier = p_identifier
    AND action = p_action
    AND blocked_until > NOW();
  
  IF v_blocked_until IS NOT NULL THEN
    RETURN FALSE; -- Still blocked
  END IF;
  
  -- Clean up old tracking records
  DELETE FROM rate_limit_tracker
  WHERE window_start < NOW() - INTERVAL '1 hour';
  
  -- Get current count in window
  SELECT request_count INTO v_count
  FROM rate_limit_tracker
  WHERE identifier = p_identifier
    AND action = p_action
    AND window_start > NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  IF v_count IS NULL THEN
    -- First request in this window
    INSERT INTO rate_limit_tracker (identifier, action, request_count, window_start)
    VALUES (p_identifier, p_action, 1, NOW());
    RETURN TRUE;
  ELSIF v_count >= p_max_requests THEN
    -- Rate limit exceeded, block for 15 minutes
    UPDATE rate_limit_tracker
    SET blocked_until = NOW() + INTERVAL '15 minutes'
    WHERE identifier = p_identifier AND action = p_action;
    RETURN FALSE;
  ELSE
    -- Increment counter
    UPDATE rate_limit_tracker
    SET request_count = request_count + 1
    WHERE identifier = p_identifier AND action = p_action;
    RETURN TRUE;
  END IF;
END;
$$;

-- 4. Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id UUID,
  p_action TEXT,
  p_ip_address INET,
  p_user_agent TEXT,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO security_audit_log (user_id, action, ip_address, user_agent, success, error_message)
  VALUES (p_user_id, p_action, p_ip_address, p_user_agent, p_success, p_error_message);
END;
$$;

-- 5. Strengthen existing RLS policies for critical tables

-- Notes table - prevent unauthorized modifications
DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = author_id AND created_at > NOW() - INTERVAL '24 hours');

DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;
CREATE POLICY "Users can delete their own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = author_id);

-- Profiles table - prevent profile takeover
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Note purchases - prevent fake purchases
DROP POLICY IF EXISTS "Users can insert their own purchases" ON public.note_purchases;
CREATE POLICY "Users can insert their own purchases"
  ON public.note_purchases FOR INSERT
  WITH CHECK (auth.uid() = buyer_id OR auth.jwt() ->> 'role' = 'service_role');

-- 6. Prevent SQL injection by validating inputs in triggers
CREATE OR REPLACE FUNCTION validate_text_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Check for suspicious SQL patterns
  IF NEW.title ~* '(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|EXEC|SCRIPT)[\s]+' THEN
    RAISE EXCEPTION 'Suspicious input detected';
  END IF;
  
  IF NEW.description ~* '(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|EXEC|SCRIPT)[\s]+' THEN
    RAISE EXCEPTION 'Suspicious input detected';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply validation to notes table
DROP TRIGGER IF EXISTS validate_notes_input ON public.notes;
CREATE TRIGGER validate_notes_input
  BEFORE INSERT OR UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION validate_text_input();

-- 7. Add timestamp check to prevent replay attacks on critical operations
CREATE OR REPLACE FUNCTION prevent_stale_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Prevent updates to records older than 24 hours (except by service role)
  IF OLD.created_at < NOW() - INTERVAL '24 hours' 
     AND auth.jwt() ->> 'role' != 'service_role' THEN
    RAISE EXCEPTION 'Cannot modify records older than 24 hours';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply to critical tables
DROP TRIGGER IF EXISTS prevent_old_note_updates ON public.notes;
CREATE TRIGGER prevent_old_note_updates
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION prevent_stale_updates();

-- 8. Function to detect and block suspicious activity
CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_recent_count INTEGER;
BEGIN
  -- Check for rapid-fire insertions (more than 5 in 1 minute)
  SELECT COUNT(*) INTO v_recent_count
  FROM notes
  WHERE author_id = NEW.author_id
    AND created_at > NOW() - INTERVAL '1 minute';
  
  IF v_recent_count > 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded - too many notes created';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_note_spam ON public.notes;
CREATE TRIGGER check_note_spam
  BEFORE INSERT ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION detect_suspicious_activity();

-- 9. Add constraint to prevent price manipulation
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_price_check;
ALTER TABLE notes ADD CONSTRAINT notes_price_check 
  CHECK (price >= 0 AND price <= 100);

-- 10. Add email verification requirement for critical actions
CREATE OR REPLACE FUNCTION require_verified_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Check if user's email is verified
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Email verification required for this action';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Require email verification for publishing notes
DROP TRIGGER IF EXISTS require_verified_for_notes ON public.notes;
CREATE TRIGGER require_verified_for_notes
  BEFORE INSERT ON public.notes
  FOR EACH ROW
  WHEN (NEW.price > 0)
  EXECUTE FUNCTION require_verified_email();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION log_security_event(UUID, TEXT, INET, TEXT, BOOLEAN, TEXT) TO service_role;
