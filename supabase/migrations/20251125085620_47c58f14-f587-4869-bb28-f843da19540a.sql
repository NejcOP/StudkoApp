-- Create profile_reviews table
CREATE TABLE public.profile_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT unique_review_per_user UNIQUE (reviewer_id, target_profile_id),
  CONSTRAINT no_self_review CHECK (reviewer_id != target_profile_id)
);

-- Enable RLS
ALTER TABLE public.profile_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert reviews (only for other users)
CREATE POLICY "Users can insert their own reviews"
ON public.profile_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reviewer_id 
  AND reviewer_id != target_profile_id
);

-- Policy: Users can update their own reviews (optional)
CREATE POLICY "Users can update their own reviews"
ON public.profile_reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = reviewer_id)
WITH CHECK (auth.uid() = reviewer_id);

-- Policy: Users can read visible reviews
CREATE POLICY "Users can view visible reviews"
ON public.profile_reviews
FOR SELECT
TO authenticated
USING (is_hidden = false);

-- Policy: Public can read visible reviews (for public profiles)
CREATE POLICY "Public can view visible reviews"
ON public.profile_reviews
FOR SELECT
TO anon
USING (is_hidden = false);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_profile_reviews_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for updating updated_at
CREATE TRIGGER update_profile_reviews_updated_at
BEFORE UPDATE ON public.profile_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_reviews_updated_at();

-- Create index for faster queries
CREATE INDEX idx_profile_reviews_target ON public.profile_reviews(target_profile_id) WHERE is_hidden = false;
CREATE INDEX idx_profile_reviews_reviewer ON public.profile_reviews(reviewer_id);