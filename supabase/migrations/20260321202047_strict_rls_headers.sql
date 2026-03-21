-- ==============================================================================
-- FIX: STRICT RLS WITH CUSTOM HEADERS
-- Replaces the overly permissive "IS NOT NULL" checks with strict ownership
-- checks using the dynamically injected 'x-browser-id' HTTP header.
-- ==============================================================================

-- Drop the flawed policies
DROP POLICY IF EXISTS "Allow anon insert projects" ON public.projects;
DROP POLICY IF EXISTS "Allow anon update projects" ON public.projects;
DROP POLICY IF EXISTS "Allow anon delete projects" ON public.projects;

DROP POLICY IF EXISTS "Allow anon insert weekly_summaries" ON public.weekly_summaries;
DROP POLICY IF EXISTS "Allow anon update weekly_summaries" ON public.weekly_summaries;
DROP POLICY IF EXISTS "Allow anon delete weekly_summaries" ON public.weekly_summaries;

DROP POLICY IF EXISTS "Allow anon insert user_settings" ON public.user_settings;
DROP POLICY IF EXISTS "Allow anon update user_settings" ON public.user_settings;
DROP POLICY IF EXISTS "Allow anon delete user_settings" ON public.user_settings;

DROP POLICY IF EXISTS "Allow anon insert pacing_alerts" ON public.pacing_alerts;
DROP POLICY IF EXISTS "Allow anon update pacing_alerts" ON public.pacing_alerts;
DROP POLICY IF EXISTS "Allow anon delete pacing_alerts" ON public.pacing_alerts;

-- Projects
CREATE POLICY "Allow anon insert projects" ON public.projects FOR INSERT 
WITH CHECK (user_id::text = current_setting('request.headers', true)::json->>'x-browser-id');

CREATE POLICY "Allow anon update projects" ON public.projects FOR UPDATE 
USING (user_id::text = current_setting('request.headers', true)::json->>'x-browser-id');

CREATE POLICY "Allow anon delete projects" ON public.projects FOR DELETE 
USING (user_id::text = current_setting('request.headers', true)::json->>'x-browser-id');

-- Weekly Summaries
CREATE POLICY "Allow anon insert weekly_summaries" ON public.weekly_summaries FOR INSERT 
WITH CHECK (user_id::text = current_setting('request.headers', true)::json->>'x-browser-id');

CREATE POLICY "Allow anon update weekly_summaries" ON public.weekly_summaries FOR UPDATE 
USING (user_id::text = current_setting('request.headers', true)::json->>'x-browser-id');

CREATE POLICY "Allow anon delete weekly_summaries" ON public.weekly_summaries FOR DELETE 
USING (user_id::text = current_setting('request.headers', true)::json->>'x-browser-id');

-- User Settings
CREATE POLICY "Allow anon insert user_settings" ON public.user_settings FOR INSERT 
WITH CHECK (user_id::text = current_setting('request.headers', true)::json->>'x-browser-id');

CREATE POLICY "Allow anon update user_settings" ON public.user_settings FOR UPDATE 
USING (user_id::text = current_setting('request.headers', true)::json->>'x-browser-id');

CREATE POLICY "Allow anon delete user_settings" ON public.user_settings FOR DELETE 
USING (user_id::text = current_setting('request.headers', true)::json->>'x-browser-id');

-- Pacing Alerts
CREATE POLICY "Allow anon insert pacing_alerts" ON public.pacing_alerts FOR INSERT 
WITH CHECK (user_id::text = current_setting('request.headers', true)::json->>'x-browser-id');

CREATE POLICY "Allow anon update pacing_alerts" ON public.pacing_alerts FOR UPDATE 
USING (user_id::text = current_setting('request.headers', true)::json->>'x-browser-id');

CREATE POLICY "Allow anon delete pacing_alerts" ON public.pacing_alerts FOR DELETE 
USING (user_id::text = current_setting('request.headers', true)::json->>'x-browser-id');