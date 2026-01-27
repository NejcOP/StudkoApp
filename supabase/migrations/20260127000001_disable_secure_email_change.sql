-- Disable secure email change (single-step verification on new email only)
-- This will only send a confirmation email to the NEW email address
-- instead of requiring confirmation on both old and new emails

-- Note: This is a dashboard setting, so we document it here for reference
-- In Supabase Dashboard:
-- 1. Go to Authentication > Settings
-- 2. Under "Email Auth", disable "Secure email change"
-- 3. This makes email changes require only one confirmation on the new email

-- For local development, this can be set in config.toml:
-- [auth]
-- enable_signup = true
-- double_confirm_changes = false  -- This disables secure email change

-- This migration file serves as documentation of this configuration choice
