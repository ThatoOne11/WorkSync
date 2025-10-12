-- 1. PROJECTS TABLE
-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to perform all CRUD operations on their own projects
CREATE POLICY "Allow all authenticated access to own projects"
ON public.projects FOR ALL TO authenticated USING
(auth.uid
() = user_id);


-- 2. WEEKLY_SUMMARIES TABLE
-- Enable RLS
ALTER TABLE public.weekly_summaries ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read their own weekly summaries
CREATE POLICY "Allow select access to own summaries"
ON public.weekly_summaries FOR
SELECT TO authenticated
USING
(auth.uid
() = user_id);

-- Note: INSERT/UPDATE access is intentionally omitted for summaries as it is done by the privileged Edge Functions.


-- 3. SETTINGS TABLE
-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to perform all CRUD operations on their own settings
CREATE POLICY "Allow all authenticated access to own settings"
ON public.settings FOR ALL TO authenticated USING
(auth.uid
() = user_id);


-- 4. PACING_ALERTS TABLE
-- Enable RLS
ALTER TABLE public.pacing_alerts ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to perform all CRUD operations on their own alerts
CREATE POLICY "Allow all authenticated access to own alerts"
ON public.pacing_alerts FOR ALL TO authenticated USING
(auth.uid
() = user_id);

-- Note: The Edge Functions running with the SERVICE_ROLE key will automatically bypass these policies.