-- Fix tutor_bookings foreign key to reference profiles.id instead of tutors.id
-- This makes it consistent with tutor_availability_dates which uses profiles.id

-- Drop the existing foreign key constraint
ALTER TABLE public.tutor_bookings
  DROP CONSTRAINT IF EXISTS tutor_bookings_tutor_id_fkey;

-- Add new foreign key constraint pointing to auth.users (which profiles also references)
ALTER TABLE public.tutor_bookings
  ADD CONSTRAINT tutor_bookings_tutor_id_fkey 
  FOREIGN KEY (tutor_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Update RLS policies to ensure they still work correctly
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.tutor_bookings;
DROP POLICY IF EXISTS "Tutors can view bookings for them" ON public.tutor_bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.tutor_bookings;
DROP POLICY IF EXISTS "Tutors can update bookings" ON public.tutor_bookings;
DROP POLICY IF EXISTS "Users can cancel their bookings" ON public.tutor_bookings;

-- Recreate policies
CREATE POLICY "Users can view their own bookings"
  ON public.tutor_bookings FOR SELECT
  USING (
    auth.uid() = student_id OR 
    auth.uid() = tutor_id
  );

CREATE POLICY "Users can create bookings"
  ON public.tutor_bookings FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Tutors can update bookings"
  ON public.tutor_bookings FOR UPDATE
  USING (
    auth.uid() = tutor_id AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND is_instructor = true
    )
  );

CREATE POLICY "Users can cancel their bookings"
  ON public.tutor_bookings FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (status = 'cancelled');
