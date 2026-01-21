-- Create storage bucket for AI file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-uploads', 'ai-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for ai-uploads bucket
-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload their own AI files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ai-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to read their own uploaded files
CREATE POLICY "Users can read their own AI files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ai-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own uploaded files
CREATE POLICY "Users can delete their own AI files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ai-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);