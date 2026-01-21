-- Add Stripe Connect and tutor fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
ADD COLUMN IF NOT EXISTS is_tutor boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_seller boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tutor_hours_completed numeric DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect ON public.profiles(stripe_connect_account_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_tutor ON public.profiles(is_tutor) WHERE is_tutor = true;

-- Add payment fields to tutor_bookings
ALTER TABLE public.tutor_bookings
ADD COLUMN IF NOT EXISTS paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS price_eur numeric,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- Create index for payment intent lookups
CREATE INDEX IF NOT EXISTS idx_tutor_bookings_payment_intent ON public.tutor_bookings(stripe_payment_intent_id);

-- Create specific date availability table (alongside existing weekly availability)
CREATE TABLE IF NOT EXISTS public.tutor_availability_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  available_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_booked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tutor_availability_dates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tutor_availability_dates
CREATE POLICY "Anyone can view tutor availability dates"
ON public.tutor_availability_dates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Tutors can manage their availability dates"
ON public.tutor_availability_dates
FOR ALL
TO authenticated
USING (
  tutor_id IN (
    SELECT id FROM public.profiles WHERE id = auth.uid() AND is_tutor = true
  )
);

-- Create indexes for availability queries
CREATE INDEX IF NOT EXISTS idx_tutor_availability_dates_tutor ON public.tutor_availability_dates(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_availability_dates_date ON public.tutor_availability_dates(available_date);

-- Function to mark tutor bookings as completed and update hours
CREATE OR REPLACE FUNCTION public.complete_tutor_booking(booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tutor_id uuid;
  v_duration numeric;
BEGIN
  -- Get tutor_id and calculate duration in hours
  SELECT 
    tutor_id,
    EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
  INTO v_tutor_id, v_duration
  FROM public.tutor_bookings
  WHERE id = booking_id AND status = 'confirmed' AND paid = true;
  
  IF v_tutor_id IS NOT NULL THEN
    -- Update booking status
    UPDATE public.tutor_bookings
    SET status = 'completed'
    WHERE id = booking_id;
    
    -- Add hours to tutor profile
    UPDATE public.profiles
    SET tutor_hours_completed = COALESCE(tutor_hours_completed, 0) + v_duration
    WHERE id = v_tutor_id;
  END IF;
END;
$$;

-- Function to check if user has Stripe Connect account
CREATE OR REPLACE FUNCTION public.has_stripe_connect(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT stripe_connect_account_id IS NOT NULL AND stripe_connect_account_id != ''
  FROM public.profiles
  WHERE id = user_id;
$$;