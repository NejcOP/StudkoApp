-- Create social_claims table for TikTok and other social media challenges
CREATE TABLE IF NOT EXISTS social_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('tiktok_challenge', 'instagram_challenge', 'youtube_challenge')),
  video_link_1 TEXT NOT NULL,
  video_link_2 TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Add index for faster queries
CREATE INDEX idx_social_claims_user ON social_claims(user_id);
CREATE INDEX idx_social_claims_status ON social_claims(status);

-- Enable RLS
ALTER TABLE social_claims ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own claims
CREATE POLICY "Users can view their own claims"
  ON social_claims
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own claims
CREATE POLICY "Users can insert their own claims"
  ON social_claims
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all claims (you'll need to add admin role check)
CREATE POLICY "Admins can view all claims"
  ON social_claims
  FOR SELECT
  USING (true);

-- Policy: Admins can update claims
CREATE POLICY "Admins can update claims"
  ON social_claims
  FOR UPDATE
  USING (true);
