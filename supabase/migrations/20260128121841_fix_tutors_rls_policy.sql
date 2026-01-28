-- Fix tutors RLS policy to allow users to view their own tutor profile by any field

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view approved tutors" ON public.tutors;
DROP POLICY IF EXISTS "Tutors can view their own full profile" ON public.tutors;

-- Create new comprehensive policies
CREATE POLICY "Anyone can view approved tutors"
  ON public.tutors FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Users can view their own tutor profile"
  ON public.tutors FOR SELECT
  USING (auth.uid() = user_id OR auth.uid()::text = id::text);
