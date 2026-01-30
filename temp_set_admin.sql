-- Set admin status for your user
-- Run this in Supabase SQL Editor
-- Replace YOUR_EMAIL with your actual email

UPDATE public.profiles
SET is_admin = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com'
);
