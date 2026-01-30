-- Fix approve_tutor_application function - remove updated_at column reference

CREATE OR REPLACE FUNCTION public.approve_tutor_application(application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  app_record RECORD;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only administrators can approve tutor applications';
  END IF;

  -- Get application data
  SELECT * INTO app_record
  FROM public.tutor_applications
  WHERE id = application_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or already processed';
  END IF;

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

  -- Update application status
  UPDATE public.tutor_applications
  SET status = 'approved'
  WHERE id = application_id;

  -- Set is_instructor in profiles
  UPDATE public.profiles
  SET is_instructor = true
  WHERE id = app_record.user_id;

END;
$$;
