-- ===================================================
-- Migration: Add payment capture tracking for bookings
-- Date: 2026-02-23
-- Purpose: Track whether payment has been captured after lesson completion
-- ===================================================

-- Add payment_captured column to track if funds have been released to instructor
ALTER TABLE public.tutor_bookings
ADD COLUMN IF NOT EXISTS payment_captured BOOLEAN DEFAULT FALSE;

-- Add index for querying uncaptured paid bookings
CREATE INDEX IF NOT EXISTS idx_tutor_bookings_payment_capture 
ON public.tutor_bookings(payment_captured, paid, end_time)
WHERE paid = true AND payment_captured = false;

-- Comment
COMMENT ON COLUMN public.tutor_bookings.payment_captured IS 
'Indicates if payment has been captured and released to instructor after lesson completion. Payment is held until lesson is confirmed as completed.';
