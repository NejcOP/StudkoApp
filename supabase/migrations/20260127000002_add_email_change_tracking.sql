-- Add email change tracking to prevent frequent changes
-- Users can only change email once per 30 days

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_email_change_at TIMESTAMPTZ;

-- Create function to update last_email_change_at when email changes
CREATE OR REPLACE FUNCTION update_last_email_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the timestamp when email changes
  IF OLD.id IS NOT NULL AND NEW.email != OLD.email THEN
    UPDATE profiles 
    SET last_email_change_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users to track email changes
DROP TRIGGER IF EXISTS on_auth_user_email_change ON auth.users;
CREATE TRIGGER on_auth_user_email_change
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION update_last_email_change();
