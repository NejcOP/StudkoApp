-- Sync email changes to all related tables when user updates email in auth.users
-- This ensures email consistency across profiles, tutors, and tutor_applications

-- Improved function to sync email to all tables
CREATE OR REPLACE FUNCTION sync_email_to_all_tables()
RETURNS TRIGGER AS $$
BEGIN
  -- Update email in profiles
  UPDATE public.profiles 
  SET email = NEW.email
  WHERE id = NEW.id;
  
  -- Update email in tutors table (for instructors)
  UPDATE public.tutors
  SET email = NEW.email
  WHERE user_id = NEW.id;
  
  -- Update email in tutor_applications table (for pending applications)
  UPDATE public.tutor_applications
  SET email = NEW.email
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_email_change_sync ON auth.users;

-- Create new trigger to sync email changes to all tables
CREATE TRIGGER on_auth_user_email_change_sync
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION sync_email_to_all_tables();

-- Also sync existing emails to tutors and tutor_applications (one-time sync)
UPDATE public.tutors t
SET email = au.email
FROM auth.users au
WHERE t.user_id = au.id;

UPDATE public.tutor_applications ta
SET email = au.email
FROM auth.users au
WHERE ta.user_id = au.id;
