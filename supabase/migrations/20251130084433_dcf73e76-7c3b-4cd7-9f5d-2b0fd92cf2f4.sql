-- Fix tutor PII exposure by restricting access to sensitive columns

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Tutors are viewable by everyone" ON public.tutors;

-- Policy: Tutors can see all their own data
CREATE POLICY "Tutors can view their own full profile"
ON public.tutors
FOR SELECT
USING (auth.uid() = user_id);

-- Create a function to get public tutor info (excludes PII: email, phone, location, age)
CREATE OR REPLACE FUNCTION public.get_public_tutors()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  subjects text[],
  bio text,
  experience text,
  price_per_hour numeric,
  mode text,
  education_level text,
  school_type text,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, user_id, full_name, subjects, bio, experience, 
    price_per_hour, mode, education_level, school_type, 
    status, created_at
  FROM public.tutors
  WHERE status = 'approved';
$$;

-- Create a function to get a single public tutor by ID
CREATE OR REPLACE FUNCTION public.get_public_tutor_by_id(tutor_id_param uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  subjects text[],
  bio text,
  experience text,
  price_per_hour numeric,
  mode text,
  education_level text,
  school_type text,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, user_id, full_name, subjects, bio, experience, 
    price_per_hour, mode, education_level, school_type, 
    status, created_at
  FROM public.tutors
  WHERE id = tutor_id_param AND status = 'approved';
$$;

-- Create a function to get tutor contact info (only for tutor themselves OR students with confirmed paid booking)
CREATE OR REPLACE FUNCTION public.get_tutor_contact_info(tutor_id_param uuid)
RETURNS TABLE (
  email text,
  phone text,
  location text,
  age integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.email, t.phone, t.location, t.age
  FROM public.tutors t
  WHERE t.id = tutor_id_param
    AND t.status = 'approved'
    AND (
      -- Tutor can see their own contact info
      t.user_id = auth.uid()
      OR
      -- Student with confirmed paid booking can see contact info
      EXISTS (
        SELECT 1 FROM public.tutor_bookings tb
        WHERE tb.tutor_id = t.id
          AND tb.student_id = auth.uid()
          AND tb.status IN ('confirmed', 'completed')
          AND tb.paid = true
      )
    );
$$;