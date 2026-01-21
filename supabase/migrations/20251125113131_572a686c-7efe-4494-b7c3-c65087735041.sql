-- Create note_purchases table to track sales
CREATE TABLE IF NOT EXISTS public.note_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(buyer_id, note_id)
);

-- Enable RLS
ALTER TABLE public.note_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own purchases"
  ON public.note_purchases
  FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Users can insert their own purchases"
  ON public.note_purchases
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- Create index for performance
CREATE INDEX idx_note_purchases_buyer ON public.note_purchases(buyer_id);
CREATE INDEX idx_note_purchases_note ON public.note_purchases(note_id);
CREATE INDEX idx_note_purchases_author ON public.note_purchases(buyer_id, note_id);

-- Function to check if user has purchased a note
CREATE OR REPLACE FUNCTION public.user_has_purchased_note(p_user_id UUID, p_note_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.note_purchases 
    WHERE buyer_id = p_user_id AND note_id = p_note_id
  );
$$;

-- Function to get seller statistics
CREATE OR REPLACE FUNCTION public.get_seller_stats(p_user_id UUID)
RETURNS TABLE (
  total_sales BIGINT,
  average_rating NUMERIC,
  total_notes BIGINT,
  is_verified BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sales AS (
    SELECT COUNT(DISTINCT np.id) as sale_count
    FROM public.notes n
    LEFT JOIN public.note_purchases np ON n.id = np.note_id
    WHERE n.author_id = p_user_id
  ),
  ratings AS (
    SELECT AVG(pr.rating) as avg_rating
    FROM public.profile_reviews pr
    WHERE pr.target_profile_id = p_user_id
  ),
  notes_count AS (
    SELECT COUNT(*) as note_count
    FROM public.notes
    WHERE author_id = p_user_id
  )
  SELECT 
    sales.sale_count,
    COALESCE(ratings.avg_rating, 0),
    notes_count.note_count,
    (sales.sale_count >= 10 AND COALESCE(ratings.avg_rating, 0) >= 4.5 AND notes_count.note_count >= 3) as verified
  FROM sales, ratings, notes_count;
$$;