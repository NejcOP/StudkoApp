# FIX MISSING API KEY ERROR

## Problem
The error "No API key found in request" means your Supabase ANON key is not set correctly.

## IMMEDIATE FIX STEPS:

### 1. Get your Supabase ANON key:
   - Go to: https://supabase.com/dashboard/project/xjnffvqtqxnqobqezouv/settings/api
   - Find the "anon" "public" key (starts with "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
   - Copy it

### 2. Update your .env file:
   Replace this line:
   ```
   VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_tV8dHh-hbk_sHihQVqHt_g_ffKnA3v3"
   ```
   
   With:
   ```
   VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```
   (paste your actual anon key from dashboard)

### 3. Restart your dev server:
   ```bash
   # Stop the current server (Ctrl+C)
   # Then start again:
   npm run dev
   # or
   bun dev
   ```

### 4. Update Vercel Environment Variables:
   - Go to: https://vercel.com/nejcs-projects-9b89559c/studko/settings/environment-variables
   - Add/Update:
     - VITE_SUPABASE_ANON_KEY = (paste anon key from Supabase dashboard)
   - Redeploy your app

## Why this happened:
The code was using `VITE_SUPABASE_PUBLISHABLE_KEY` but that's not a real Supabase key.
Supabase uses "anon" key for client-side requests.

I've updated the code to use `VITE_SUPABASE_ANON_KEY` which is the correct name.
