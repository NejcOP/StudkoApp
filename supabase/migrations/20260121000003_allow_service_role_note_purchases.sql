-- Allow service role to insert note purchases (for webhook)
DROP POLICY IF EXISTS "Users can insert their own purchases" ON public.note_purchases;

CREATE POLICY "Users can insert their own purchases"
  ON public.note_purchases
  FOR INSERT
  WITH CHECK (
    auth.uid() = buyer_id 
    OR auth.jwt() ->> 'role' = 'service_role'
  );
