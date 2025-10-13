-- 1. Drop the old RLS policies that rely on auth.uid()
DROP POLICY
IF EXISTS "Allow all authenticated access to own projects" ON public.projects;
DROP POLICY
IF EXISTS "Allow select access to own summaries" ON public.weekly_summaries;
DROP POLICY
IF EXISTS "Allow all authenticated access to own settings" ON public.settings;
DROP POLICY
IF EXISTS "Allow all authenticated access to own alerts" ON public.pacing_alerts;

-- 2. PROJECTS TABLE
-- Enable RLS and allow anonymous access. Security is handled by the .eq('user_id', browserId) filter in the Edge Function.
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon access to projects"
ON public.projects FOR ALL TO anon, authenticated
USING
(true);

-- 3. WEEKLY_SUMMARIES TABLE
-- Enable RLS and allow anonymous access.
ALTER TABLE public.weekly_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon access to weekly_summaries"
ON public.weekly_summaries FOR ALL TO anon, authenticated
USING
(true);

-- 4. SETTINGS TABLE
-- Enable RLS and allow anonymous access.
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon access to settings"
ON public.settings FOR ALL TO anon, authenticated
USING
(true);

-- 5. PACING_ALERTS TABLE
-- Enable RLS and allow anonymous access.
ALTER TABLE public.pacing_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon access to pacing_alerts"
ON public.pacing_alerts FOR ALL TO anon, authenticated
USING
(true);