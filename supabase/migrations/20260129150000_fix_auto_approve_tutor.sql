-- Fix auto_approve_tutor function to only use existing fields
CREATE OR REPLACE FUNCTION auto_approve_tutor()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-approve tutor by inserting into tutors table
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
    status
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
    'approved'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'approved';
  
  -- Set is_instructor in profiles
  UPDATE public.profiles
  SET is_instructor = true
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
