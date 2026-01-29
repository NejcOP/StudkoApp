-- Auto-approve tutors on application (samo za development/testing)
-- V produkciji bi moral biti manual approval proces!

CREATE OR REPLACE FUNCTION auto_approve_tutor()
RETURNS TRIGGER AS $$
BEGIN
  -- Avtomatično dodaj v tutors tabelo z approved statusom
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
    NEW.user_id,
    NEW.full_name,
    NEW.email,
    NEW.phone,
    NEW.age,
    NEW.location,
    NEW.subjects,
    NEW.price_per_hour,
    NEW.mode,
    NEW.bio,
    NEW.experience,
    NEW.education_level,
    NEW.school_type,
    'approved',  -- Avtomatsko odobri
    NEW.languages,
    NEW.methodology,
    NEW.video_url,
    NEW.discount_info
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'approved',
    updated_at = NOW();
  
  -- Nastavi is_instructor v profiles
  UPDATE public.profiles
  SET is_instructor = true
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger ki se sproži ob vsaki novi tutor aplikaciji
DROP TRIGGER IF EXISTS on_tutor_application_created ON public.tutor_applications;
CREATE TRIGGER on_tutor_application_created
  AFTER INSERT ON public.tutor_applications
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_tutor();
