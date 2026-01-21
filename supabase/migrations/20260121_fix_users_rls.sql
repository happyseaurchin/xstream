-- Fix RLS policies on users table
-- Users should be able to:
-- 1. Read their own row
-- 2. Insert their own row (for first-time registration)
-- 3. Update their own row (for profile changes, onboarding progress)

-- First, ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Create new policies
-- SELECT: Users can read their own row
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- INSERT: Users can insert their own row (id must match their auth.uid)
CREATE POLICY "Users can insert own profile"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- UPDATE: Users can update their own row
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
