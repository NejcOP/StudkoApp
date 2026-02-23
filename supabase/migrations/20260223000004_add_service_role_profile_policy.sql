-- Allow service_role (backend functions) to update profiles
-- This is needed for Stripe Connect onboarding to save stripe_connect_id

-- Drop existing policies if they exist (ignore errors if they don't)
DROP POLICY IF EXISTS "Service role can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

-- Create policies
CREATE POLICY "Service role can update profiles"
  ON public.profiles
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Also allow service_role to insert profiles (for edge cases)
CREATE POLICY "Service role can insert profiles"
  ON public.profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);
