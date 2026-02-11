-- Add profile_image_url to get_public_tutors and get_public_tutor_by_id

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
  created_at timestamptz,
  profile_image_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 
    id, user_id, full_name, subjects, bio, experience, 
    price_per_hour, mode, education_level, school_type, 
    status, created_at, profile_image_url
  FROM public.tutors
  WHERE status = 'approved';
$$;

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
  created_at timestamptz,
  profile_image_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 
    id, user_id, full_name, subjects, bio, experience, 
    price_per_hour, mode, education_level, school_type, 
    status, created_at, profile_image_url
  FROM public.tutors
  WHERE id = tutor_id_param AND status = 'approved';
$$;

GRANT EXECUTE ON FUNCTION public.get_public_tutors() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_public_tutor_by_id(uuid) TO authenticated, anon;
