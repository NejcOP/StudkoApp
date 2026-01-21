-- Fix remaining tutor-related functions

-- Fix: get_public_tutors
DROP FUNCTION IF EXISTS public.get_public_tutors();
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
SET search_path = public, pg_temp
AS $$
  SELECT 
    id, user_id, full_name, subjects, bio, experience, 
    price_per_hour, mode, education_level, school_type, 
    status, created_at
  FROM public.tutors
  WHERE status = 'approved';
$$;

-- Fix: get_public_tutor_by_id
DROP FUNCTION IF EXISTS public.get_public_tutor_by_id(uuid);
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
SET search_path = public, pg_temp
AS $$
  SELECT 
    id, user_id, full_name, subjects, bio, experience, 
    price_per_hour, mode, education_level, school_type, 
    status, created_at
  FROM public.tutors
  WHERE id = tutor_id_param AND status = 'approved';
$$;

-- Fix: get_tutor_contact_info
DROP FUNCTION IF EXISTS public.get_tutor_contact_info(uuid);
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
SET search_path = public, pg_temp
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_public_tutors() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_public_tutor_by_id(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_tutor_contact_info(uuid) TO authenticated;
