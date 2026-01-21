-- Fix all functions with mutable search_path security issues
-- Set STABLE and proper search_path for all functions

-- Fix: get_xp_for_next_level
DROP FUNCTION IF EXISTS public.get_xp_for_next_level(integer);
CREATE OR REPLACE FUNCTION public.get_xp_for_next_level(current_xp integer)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_level integer;
  next_level integer;
  xp_thresholds integer[] := ARRAY[0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000];
BEGIN
  current_level := calculate_level(current_xp);
  next_level := current_level + 1;
  
  IF next_level > 10 THEN
    RETURN 0;
  END IF;
  
  RETURN xp_thresholds[next_level] - current_xp;
END;
$$;

-- Fix: handle_updated_at (summaries)
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix: update_ai_conversation_timestamp
DROP FUNCTION IF EXISTS public.update_ai_conversation_timestamp() CASCADE;
CREATE OR REPLACE FUNCTION public.update_ai_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix: update_tutor_bookings_updated_at
DROP FUNCTION IF EXISTS public.update_tutor_bookings_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION public.update_tutor_bookings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix: generate_referral_code
DROP FUNCTION IF EXISTS public.generate_referral_code() CASCADE;
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  -- Generate a random 8-character code
  LOOP
    new_code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  NEW.referral_code := new_code;
  RETURN NEW;
END;
$$;

-- Fix: complete_tutor_booking
DROP FUNCTION IF EXISTS public.complete_tutor_booking(uuid);
CREATE OR REPLACE FUNCTION public.complete_tutor_booking(booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE tutor_bookings
  SET status = 'completed',
      updated_at = NOW()
  WHERE id = booking_id;
END;
$$;

-- Fix: has_stripe_connect
DROP FUNCTION IF EXISTS public.has_stripe_connect(uuid);
CREATE OR REPLACE FUNCTION public.has_stripe_connect(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  has_connect boolean;
BEGIN
  SELECT (stripe_connect_id IS NOT NULL AND stripe_connect_id != '')
  INTO has_connect
  FROM profiles
  WHERE id = user_id;
  
  RETURN COALESCE(has_connect, false);
END;
$$;

-- Fix: user_has_purchased_note
DROP FUNCTION IF EXISTS public.user_has_purchased_note(uuid, uuid);
CREATE OR REPLACE FUNCTION public.user_has_purchased_note(p_user_id UUID, p_note_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM note_purchases
    WHERE buyer_id = p_user_id AND note_id = p_note_id
  );
END;
$$;

-- Fix: get_seller_stats
DROP FUNCTION IF EXISTS public.get_seller_stats(uuid);
CREATE OR REPLACE FUNCTION public.get_seller_stats(p_user_id UUID)
RETURNS TABLE (
  total_sales BIGINT,
  average_rating NUMERIC,
  is_verified BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT np.id) AS total_sales,
    COALESCE(AVG(r.rating), 0)::NUMERIC AS average_rating,
    COALESCE(p.is_verified, false) AS is_verified
  FROM profiles p
  LEFT JOIN notes n ON n.author_id = p.id
  LEFT JOIN note_purchases np ON np.note_id = n.id
  LEFT JOIN reviews r ON r.reviewed_user_id = p.id
  WHERE p.id = p_user_id
  GROUP BY p.id, p.is_verified;
END;
$$;

-- Fix: handle_new_user
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_xp_for_next_level(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_tutor_booking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_stripe_connect(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_purchased_note(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_seller_stats(uuid) TO authenticated;

-- Grant to anon for public functions
GRANT EXECUTE ON FUNCTION public.get_xp_for_next_level(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.user_has_purchased_note(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_seller_stats(uuid) TO anon;

-- Recreate triggers after function updates
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_summaries_updated_at ON public.summaries;
CREATE TRIGGER update_summaries_updated_at
  BEFORE UPDATE ON public.summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_referral_code ON public.profiles;
CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION public.generate_referral_code();

DROP TRIGGER IF EXISTS update_ai_conversations_timestamp ON public.ai_conversations;
CREATE TRIGGER update_ai_conversations_timestamp
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_conversation_timestamp();

DROP TRIGGER IF EXISTS update_tutor_bookings_timestamp ON public.tutor_bookings;
CREATE TRIGGER update_tutor_bookings_timestamp
  BEFORE UPDATE ON public.tutor_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tutor_bookings_updated_at();
