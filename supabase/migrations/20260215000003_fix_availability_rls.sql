-- Fix tutor_availability_dates RLS policies - use is_instructor instead of is_tutor

-- Drop old policy
DROP POLICY IF EXISTS "Tutors can manage their availability dates" ON public.tutor_availability_dates;

-- Create new policy with correct column name
CREATE POLICY "Instructors can manage their availability dates"
ON public.tutor_availability_dates
FOR ALL
TO authenticated
USING (
  tutor_id IN (
    SELECT id FROM public.profiles WHERE id = auth.uid() AND is_instructor = true
  )
)
WITH CHECK (
  tutor_id IN (
    SELECT id FROM public.profiles WHERE id = auth.uid() AND is_instructor = true
  )
);

-- Ensure SELECT policy allows anonymous users to view availability
DROP POLICY IF EXISTS "Anyone can view tutor availability dates" ON public.tutor_availability_dates;

CREATE POLICY "Anyone can view tutor availability dates"
ON public.tutor_availability_dates
FOR SELECT
USING (true);
