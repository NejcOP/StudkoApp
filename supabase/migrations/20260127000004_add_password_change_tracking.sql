-- Add password change tracking to prevent frequent changes
-- Users can only change password once per 30 days

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_password_change_at TIMESTAMPTZ;

-- Update the column when password changes in auth.users
CREATE OR REPLACE FUNCTION update_last_password_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the timestamp when password changes
  IF OLD.id IS NOT NULL AND NEW.encrypted_password != OLD.encrypted_password THEN
    UPDATE public.profiles 
    SET last_password_change_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users to track password changes
DROP TRIGGER IF EXISTS on_auth_user_password_change ON auth.users;
CREATE TRIGGER on_auth_user_password_change
  AFTER UPDATE OF encrypted_password ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION update_last_password_change();
