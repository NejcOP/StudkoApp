-- Allow admins to delete any note
CREATE POLICY "Admins can delete any note"
ON public.notes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);
