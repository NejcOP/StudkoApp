-- Add payout_info JSONB column to profiles for storing payout preferences
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS payout_info JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.payout_info IS 'Stores user payout preferences: method (stripe, iban, paypal, revolut), and masked details';