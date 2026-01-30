-- Disable auto-approval of tutors
-- Applications will now stay in 'pending' state until manually approved by admin

-- Drop the auto-approve trigger
DROP TRIGGER IF EXISTS on_tutor_application_created ON public.tutor_applications;

-- Drop the auto-approve function
DROP FUNCTION IF EXISTS public.auto_approve_tutor();

-- Create manual approval function that admin can call
CREATE OR REPLACE FUNCTION public.approve_tutor_application(application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  app_record RECORD;
BEGIN
  -- Check if user is admin (you can customize this check)
  -- For now, only allow if user has is_admin=true in profiles
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
    discount_info = EXCLUDED.discount_info,
    updated_at = NOW();

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

-- Grant execute to authenticated users (admin check is inside the function)
GRANT EXECUTE ON FUNCTION public.approve_tutor_application(uuid) TO authenticated;

-- Add rejection function as well
CREATE OR REPLACE FUNCTION public.reject_tutor_application(application_id uuid, rejection_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only administrators can reject tutor applications';
  END IF;

  -- Update application status
  UPDATE public.tutor_applications
  SET 
    status = 'rejected',
    rejection_reason = COALESCE(reject_tutor_application.rejection_reason, 'No reason provided')
  WHERE id = application_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or already processed';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_tutor_application(uuid, text) TO authenticated;

-- Add rejection_reason column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tutor_applications' 
    AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE public.tutor_applications 
    ADD COLUMN rejection_reason TEXT;
  END IF;
END $$;

-- Add is_admin column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;
