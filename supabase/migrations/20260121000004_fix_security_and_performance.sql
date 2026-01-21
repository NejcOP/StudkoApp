-- Fix Security Issues: Enable RLS on public tables
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bookings table
CREATE POLICY "Users can view their own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = student_id OR auth.uid() IN (
    SELECT id FROM profiles WHERE id = (
      SELECT tutor_id FROM tutors WHERE id = bookings.tutor_id
    )
  ));

CREATE POLICY "Users can create their own bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can update their own bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = student_id OR auth.uid() IN (
    SELECT id FROM profiles WHERE id = (
      SELECT tutor_id FROM tutors WHERE id = bookings.tutor_id
    )
  ));

-- RLS Policies for tutors table
CREATE POLICY "Anyone can view approved tutors"
  ON public.tutors FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id);

CREATE POLICY "Tutors can update their own profile"
  ON public.tutors FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can apply as tutors"
  ON public.tutors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for subjects table (read-only for all authenticated users)
CREATE POLICY "Anyone can view subjects"
  ON public.subjects FOR SELECT
  USING (true);

-- Fix Performance Issues: Update functions with stable search_path
-- Drop and recreate functions with proper security settings

-- Function: calculate_level
DROP FUNCTION IF EXISTS public.calculate_level(integer);
CREATE OR REPLACE FUNCTION public.calculate_level(p_xp integer)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_xp < 100 THEN RETURN 1;
  ELSIF p_xp < 250 THEN RETURN 2;
  ELSIF p_xp < 500 THEN RETURN 3;
  ELSIF p_xp < 1000 THEN RETURN 4;
  ELSIF p_xp < 2000 THEN RETURN 5;
  ELSIF p_xp < 3500 THEN RETURN 6;
  ELSIF p_xp < 5500 THEN RETURN 7;
  ELSIF p_xp < 8000 THEN RETURN 8;
  ELSIF p_xp < 11000 THEN RETURN 9;
  ELSE RETURN 10;
  END IF;
END;
$$;

-- Function: get_level_title
DROP FUNCTION IF EXISTS public.get_level_title(integer);
CREATE OR REPLACE FUNCTION public.get_level_title(p_level integer)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  CASE p_level
    WHEN 1 THEN RETURN 'Začetnik';
    WHEN 2 THEN RETURN 'Učenec';
    WHEN 3 THEN RETURN 'Napredni učenec';
    WHEN 4 THEN RETURN 'Poznavalec';
    WHEN 5 THEN RETURN 'Strokovnjak';
    WHEN 6 THEN RETURN 'Mojster';
    WHEN 7 THEN RETURN 'Veliki mojster';
    WHEN 8 THEN RETURN 'Legenda';
    WHEN 9 THEN RETURN 'Velemojster';
    WHEN 10 THEN RETURN 'Bog znanja';
    ELSE RETURN 'Neznano';
  END CASE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_level(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_level_title(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_level(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_level_title(integer) TO anon;
