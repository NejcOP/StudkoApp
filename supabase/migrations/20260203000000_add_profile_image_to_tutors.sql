-- Add profile_image_url column to tutors table
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Add profile_image_url column to tutor_applications table
ALTER TABLE public.tutor_applications ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Create storage bucket for tutor profile images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutor-profiles', 'tutor-profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own profile images
CREATE POLICY "Users can upload their own profile image"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tutor-profiles' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own profile images
CREATE POLICY "Users can update their own profile image"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tutor-profiles' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own profile images
CREATE POLICY "Users can delete their own profile image"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tutor-profiles' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow everyone to view profile images
CREATE POLICY "Profile images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tutor-profiles');
