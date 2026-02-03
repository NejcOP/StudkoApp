-- Create storage bucket for tutor videos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutor-videos', 'tutor-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own videos
CREATE POLICY "Users can upload their own videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tutor-videos' AND
  auth.uid()::text = substring(name from 'video_([^_]+)_')
);

-- Allow authenticated users to update their own videos
CREATE POLICY "Users can update their own videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tutor-videos' AND
  auth.uid()::text = substring(name from 'video_([^_]+)_')
);

-- Allow authenticated users to delete their own videos
CREATE POLICY "Users can delete their own videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tutor-videos' AND
  auth.uid()::text = substring(name from 'video_([^_]+)_')
);

-- Allow everyone to view videos
CREATE POLICY "Videos are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tutor-videos');
