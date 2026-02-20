-- Final fix for approve_tutor_application - ensure INSERT works for admins

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can apply as tutors" ON public.tutors;
DROP POLICY IF EXISTS "Users and admins can insert tutors" ON public.tutors;
DROP POLICY IF EXISTS "Tutors can update their own profile" ON public.tutors;
DROP POLICY IF EXISTS "Tutors and admins can update tutor profiles" ON public.tutors;

-- Create simple, clear policies
-- 1. Anyone authenticated can view approved tutors OR their own profile
CREATE POLICY "View approved tutors or own profile"
  ON public.tutors FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id);

-- 2. Users can insert their own tutor application
CREATE POLICY "Users can apply as tutors"
  ON public.tutors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Admins can insert ANY tutor (for approval process)
CREATE POLICY "Admins can insert any tutor"
  ON public.tutors FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 4. Tutors can update their own profile
CREATE POLICY "Tutors can update own profile"
  ON public.tutors FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Admins can update any tutor
CREATE POLICY "Admins can update any tutor"
  ON public.tutors FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Add debug logging to approve function
CREATE OR REPLACE FUNCTION public.approve_tutor_application(application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  app_record RECORD;
  current_user_id uuid;
  is_user_admin boolean;
BEGIN
  -- Get current user info for debugging
  current_user_id := auth.uid();
  
  -- Check if user is admin
  SELECT is_admin INTO is_user_admin
  FROM public.profiles 
  WHERE id = current_user_id;

  RAISE NOTICE 'Approval attempt by user: %, is_admin: %', current_user_id, is_user_admin;

  IF NOT COALESCE(is_user_admin, false) THEN
    RAISE EXCEPTION 'Only administrators can approve tutor applications';
  END IF;

  -- Get application data
  SELECT * INTO app_record
  FROM public.tutor_applications
  WHERE id = application_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or already processed';
  END IF;

  RAISE NOTICE 'Approving application for user: %', app_record.user_id;

  -- Insert into tutors table
  INSERT INTO public.tutors (
    user_id,
    full_name,
    email,
    phone,
    age,
    location,
    subjects,
    price_per_hour,
    mode,
    bio,
    experience,
    education_level,
    school_type,
    status,
    languages,
    methodology,
    video_url,
    discount_info
  ) VALUES (
    app_record.user_id,
    app_record.full_name,
    app_record.email,
    app_record.phone,
    app_record.age,
    app_record.location,
    app_record.subjects,
    app_record.price_per_hour,
    app_record.mode,
    app_record.bio,
    app_record.experience,
    app_record.education_level,
    app_record.school_type,
    'approved',
    app_record.languages,
    app_record.methodology,
    app_record.video_url,
    app_record.discount_info
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    age = EXCLUDED.age,
    location = EXCLUDED.location,
    subjects = EXCLUDED.subjects,
    price_per_hour = EXCLUDED.price_per_hour,
    mode = EXCLUDED.mode,
    bio = EXCLUDED.bio,
    experience = EXCLUDED.experience,
    education_level = EXCLUDED.education_level,
    school_type = EXCLUDED.school_type,
    status = 'approved',
    languages = EXCLUDED.languages,
    methodology = EXCLUDED.methodology,
    video_url = EXCLUDED.video_url,
    discount_info = EXCLUDED.discount_info;

  RAISE NOTICE 'Tutor record created/updated successfully';

  -- Update application status
  UPDATE public.tutor_applications
  SET status = 'approved'
  WHERE id = application_id;

  RAISE NOTICE 'Application status updated to approved';

  -- Set is_instructor in profiles
  UPDATE public.profiles
  SET is_instructor = true
  WHERE id = app_record.user_id;

  RAISE NOTICE 'Profile updated with is_instructor = true';

END;
$$;

-- Ensure GRANT is correct
GRANT EXECUTE ON FUNCTION public.approve_tutor_application(uuid) TO authenticated;
