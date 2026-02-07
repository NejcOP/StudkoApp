-- Test manual user creation to debug registration issue
-- Run this in Supabase SQL Editor to test if triggers work

-- 1. Try to manually insert a user in auth.users (this simulates Supabase auth.signUp)
-- Note: This is just a test, you cannot actually manually insert into auth.users
-- But we can test the profile creation trigger

-- First, check if there are any errors in recent registrations
SELECT 
    id,
    email,
    created_at,
    confirmed_at,
    email_confirmed_at,
    raw_user_meta_data
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- Check if profiles were created for recent users
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.referral_code,
    p.created_at,
    au.email as auth_email,
    au.confirmed_at
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at DESC
LIMIT 10;

-- Check what triggers exist on auth.users
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    CASE t.tgtype::integer & 66
        WHEN 2 THEN 'BEFORE'
        WHEN 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END as trigger_timing,
    CASE 
        WHEN t.tgtype::integer & 4 = 4 THEN 'INSERT'
        WHEN t.tgtype::integer & 8 = 8 THEN 'DELETE'
        WHEN t.tgtype::integer & 16 = 16 THEN 'UPDATE'
    END as trigger_event
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' 
AND c.relname = 'users'
AND t.tgisinternal = false;

-- Check all policies on profiles table
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd;

-- Test if the handle_new_user function exists and can be executed
SELECT pg_get_functiondef(oid)
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Check if there are any issues with the profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY ordinal_position;
