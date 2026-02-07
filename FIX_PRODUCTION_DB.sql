-- ===================================================
-- FIX: Apply missing INSERT policy to production database
-- Go to: https://supabase.com/dashboard/project/xjnffvqtqxnqobqezouv/sql/new
-- Copy and paste this entire SQL and click "Run"
-- ===================================================

-- Add INSERT policy for profiles table
DROP POLICY IF EXISTS "Enable insert for new user registration" ON public.profiles;
CREATE POLICY "Enable insert for new user registration"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- Fix handle_new_user function with error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Študent'),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verify the policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'profiles' AND cmd = 'INSERT';
