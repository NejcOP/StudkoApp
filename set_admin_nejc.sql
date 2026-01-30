-- Manual SQL to run in Supabase Dashboard SQL Editor
-- Go to: https://supabase.com/dashboard/project/xjnffvqtqxnqobqezouv/sql/new

-- Set admin status
UPDATE public.profiles
SET is_admin = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'nejcopavlin6@gmail.com'
);

-- Verify it worked
SELECT p.id, p.full_name, p.is_admin, u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'nejcopavlin6@gmail.com';
