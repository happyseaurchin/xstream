-- Add wants_playtester column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS wants_playtester boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.users.wants_playtester IS 'User opted in to playtesting opportunities from Phase 2 onboarding';
