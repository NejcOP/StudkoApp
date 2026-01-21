-- Fix RLS policies that are always true (security risk)

-- Fix notifications table - restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view subjects" ON public.notifications;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Fix profiles table - restrict overly permissive policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Fix referrals table - only allow users to see their own referrals
DROP POLICY IF EXISTS "Enable read access for all users" ON public.referrals;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.referrals;
DROP POLICY IF EXISTS "Users can view referrals they created" ON public.referrals;
DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "System can insert referrals" ON public.referrals;
DROP POLICY IF EXISTS "System can update referrals" ON public.referrals;

CREATE POLICY "Users can view referrals they created"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "System can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update referrals"
  ON public.referrals FOR UPDATE
  USING (true);

-- Fix social_claims table - restrict to authenticated users
DROP POLICY IF EXISTS "Enable read access for all users" ON public.social_claims;
DROP POLICY IF EXISTS "Users can view their own claims" ON public.social_claims;
DROP POLICY IF EXISTS "Users can insert their own claims" ON public.social_claims;
DROP POLICY IF EXISTS "Users can update their own claims" ON public.social_claims;

CREATE POLICY "Users can view their own claims"
  ON public.social_claims FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own claims"
  ON public.social_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own claims"
  ON public.social_claims FOR UPDATE
  USING (auth.uid() = user_id);

-- Fix waiting_list table - authenticated users only
DROP POLICY IF EXISTS "Enable read access for all users" ON public.waiting_list;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.waiting_list;
DROP POLICY IF EXISTS "Users can view their own waiting list entries" ON public.waiting_list;
DROP POLICY IF EXISTS "Anyone can join waiting list" ON public.waiting_list;

CREATE POLICY "Users can view their own waiting list entries"
  ON public.waiting_list FOR SELECT
  USING (auth.uid()::text = email OR auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can join waiting list"
  ON public.waiting_list FOR INSERT
  WITH CHECK (true);

-- Enable leaked password protection for Auth
-- This requires setting in Supabase Dashboard -> Authentication -> Policies
-- Cannot be set via SQL migration, must be done in UI:
-- Go to: https://supabase.com/dashboard/project/xjnffvqtqxnqobqezouv/auth/policies
-- Enable "Leaked Password Protection"
