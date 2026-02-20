-- Fix RLS policy for approve_tutor_application function
-- Problem: INSERT policy only allows auth.uid() = user_id, but admin approval uses different user_id

-- Drop old restrictive INSERT policy
DROP POLICY IF EXISTS "Users can apply as tutors" ON public.tutors;

-- Create new INSERT policy that allows both user self-application and admin approval
CREATE POLICY "Users and admins can insert tutors"
  ON public.tutors FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR -- Users can apply as tutors
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) -- Admins can approve tutors
  );

-- Ensure UPDATE policy allows admin modifications
DROP POLICY IF EXISTS "Tutors can update their own profile" ON public.tutors;

CREATE POLICY "Tutors and admins can update tutor profiles"
  ON public.tutors FOR UPDATE
  USING (
    auth.uid() = user_id OR -- Tutors can update their own profile
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) -- Admins can update any tutor
  );
