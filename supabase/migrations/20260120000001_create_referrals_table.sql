-- Create referrals table to track referral system
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rewarded BOOLEAN DEFAULT FALSE,
  UNIQUE(referrer_id, referred_id)
);

-- Add index for faster queries
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_id);

-- Enable RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own referrals
CREATE POLICY "Users can view their own referrals"
  ON referrals
  FOR SELECT
  USING (auth.uid() = referrer_id);

-- Policy: System can insert referrals
CREATE POLICY "System can insert referrals"
  ON referrals
  FOR INSERT
  WITH CHECK (true);

-- Policy: System can update referrals
CREATE POLICY "System can update referrals"
  ON referrals
  FOR UPDATE
  USING (true);

-- Add referral_code to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'referral_code') THEN
    ALTER TABLE profiles ADD COLUMN referral_code TEXT UNIQUE;
    
    -- Generate referral codes for existing users
    UPDATE profiles 
    SET referral_code = SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 8)
    WHERE referral_code IS NULL;
  END IF;
END $$;

-- Create function to generate referral code on user creation
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT) FROM 1 FOR 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new profiles
DROP TRIGGER IF EXISTS generate_referral_code_trigger ON profiles;
CREATE TRIGGER generate_referral_code_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code();
