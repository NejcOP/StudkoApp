-- Create storage bucket for note uploads (PDF and images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('notes', 'notes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- RLS policies for notes bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own notes" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view notes" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own notes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own notes" ON storage.objects;

-- Allow authenticated users to upload their own note files
-- Path format: notes/{user_id}/{filename}
-- storage.foldername returns array: [1]='notes', [2]='{user_id}', [3]='{filename}'
CREATE POLICY "Users can upload their own notes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'notes' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow anyone (including anonymous) to view notes (public bucket)
-- This is needed so buyers can preview and download purchased notes
CREATE POLICY "Anyone can view notes"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'notes');

-- Allow users to update their own uploaded files
CREATE POLICY "Users can update their own notes"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'notes' AND
  auth.uid()::text = (storage.foldername(name))[2]
)
WITH CHECK (
  bucket_id = 'notes' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow users to delete their own uploaded files
CREATE POLICY "Users can delete their own notes"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'notes' AND
  auth.uid()::text = (storage.foldername(name))[2]
);
