-- Drop the old constraint that did not account for multiple users
ALTER TABLE public.weekly_summaries
DROP CONSTRAINT IF EXISTS unique_project_week;

-- Add the correct multi-tenant constraint
ALTER TABLE public.weekly_summaries
ADD CONSTRAINT unique_project_week_user UNIQUE (project_id, week_ending_on, user_id);