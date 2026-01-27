-- Add email field to profiles and sync with auth.users
-- This ensures email is always in sync between auth.users and public.profiles

-- Add email column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Sync existing emails from auth.users to profiles
UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE public.profiles.id = auth.users.id;

-- Update handle_new_user to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Študent'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Create function to sync email changes from auth.users to profiles
CREATE OR REPLACE FUNCTION sync_email_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
  -- Update email in profiles when it changes in auth.users
  UPDATE public.profiles 
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_email_change_sync ON auth.users;

-- Create trigger to sync email changes
CREATE TRIGGER on_auth_user_email_change_sync
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION sync_email_to_profiles();
