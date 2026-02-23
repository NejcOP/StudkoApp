-- Fix authorization in complete_tutor_booking function
-- Previously: Any authenticated user could mark ANY booking as complete
-- Now: Only tutor or student involved in the booking can mark it complete

CREATE OR REPLACE FUNCTION public.complete_tutor_booking(booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking RECORD;
  v_caller_id uuid;
BEGIN
  -- Get current user ID
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: You must be logged in';
  END IF;
  
  -- Get booking details
  SELECT * INTO v_booking
  FROM tutor_bookings
  WHERE id = booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  -- Verify caller is either tutor or student
  IF v_booking.tutor_id != v_caller_id AND v_booking.student_id != v_caller_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only complete your own bookings';
  END IF;
  
  -- Update booking status
  UPDATE tutor_bookings
  SET status = 'completed',
      updated_at = NOW()
  WHERE id = booking_id;
END;
$$;

COMMENT ON FUNCTION public.complete_tutor_booking IS 'Marks a booking as completed. Only tutor or student can complete their own bookings.';
