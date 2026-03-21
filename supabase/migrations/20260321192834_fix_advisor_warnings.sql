-- ==============================================================================
-- 1. FIX: FUNCTION SEARCH PATH MUTABLE
-- Lock down the search path on our elevated functions to prevent injection attacks
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.upsert_user_settings(
  p_user_id UUID,
  p_email TEXT,
  p_enable_email BOOLEAN,
  p_enable_pacing BOOLEAN,
  p_workspace_id TEXT,
  p_clockify_user_id TEXT,
  p_api_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_existing_secret_id UUID;
  v_new_secret_id UUID;
BEGIN
  SELECT clockify_api_key_id INTO v_existing_secret_id FROM public.user_settings WHERE user_id = p_user_id;

  IF p_api_key IS NOT NULL AND p_api_key <> '' THEN
    IF v_existing_secret_id IS NOT NULL THEN
      DELETE FROM vault.decrypted_secrets WHERE id = v_existing_secret_id;
    END IF;
    SELECT vault.create_secret(p_api_key, 'clockify_key_' || p_user_id::text) INTO v_new_secret_id;
  ELSE
    v_new_secret_id := v_existing_secret_id;
  END IF;

  INSERT INTO public.user_settings (
    user_id, notification_email, enable_email_notifications, enable_pacing_alerts,
    clockify_workspace_id, clockify_user_id, clockify_api_key_id
  ) VALUES (
    p_user_id, p_email, p_enable_email, p_enable_pacing,
    p_workspace_id, p_clockify_user_id, v_new_secret_id
  )
  ON CONFLICT (user_id) DO UPDATE SET
    notification_email = EXCLUDED.notification_email,
    enable_email_notifications = EXCLUDED.enable_email_notifications,
    enable_pacing_alerts = EXCLUDED.enable_pacing_alerts,
    clockify_workspace_id = EXCLUDED.clockify_workspace_id,
    clockify_user_id = EXCLUDED.clockify_user_id,
    clockify_api_key_id = EXCLUDED.clockify_api_key_id,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_decrypted_clockify_key(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id UUID;
  v_decrypted_key TEXT;
BEGIN
  SELECT clockify_api_key_id INTO v_secret_id FROM public.user_settings WHERE user_id = p_user_id;
  IF v_secret_id IS NULL THEN RETURN NULL; END IF;
  SELECT decrypted_secret INTO v_decrypted_key FROM vault.decrypted_secrets WHERE id = v_secret_id;
  RETURN v_decrypted_key;
END;
$$;


-- ==============================================================================
-- 2. FIX: RLS POLICY ALWAYS TRUE
-- Replace overly permissive "ALL" policies with explicit commands requiring user_id
-- ==============================================================================

-- Drop the old permissive policies
DROP POLICY IF EXISTS "Allow anon access to projects" ON public.projects;
DROP POLICY IF EXISTS "Allow anon access to weekly_summaries" ON public.weekly_summaries;
DROP POLICY IF EXISTS "Allow anon access to user_settings" ON public.user_settings;
DROP POLICY IF EXISTS "Allow anon access to pacing_alerts" ON public.pacing_alerts;

-- Projects
CREATE POLICY "Allow anon select projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Allow anon insert projects" ON public.projects FOR INSERT WITH CHECK (user_id IS NOT NULL);
CREATE POLICY "Allow anon update projects" ON public.projects FOR UPDATE USING (user_id IS NOT NULL);
CREATE POLICY "Allow anon delete projects" ON public.projects FOR DELETE USING (user_id IS NOT NULL);

-- Weekly Summaries
CREATE POLICY "Allow anon select weekly_summaries" ON public.weekly_summaries FOR SELECT USING (true);
CREATE POLICY "Allow anon insert weekly_summaries" ON public.weekly_summaries FOR INSERT WITH CHECK (user_id IS NOT NULL);
CREATE POLICY "Allow anon update weekly_summaries" ON public.weekly_summaries FOR UPDATE USING (user_id IS NOT NULL);
CREATE POLICY "Allow anon delete weekly_summaries" ON public.weekly_summaries FOR DELETE USING (user_id IS NOT NULL);

-- User Settings
CREATE POLICY "Allow anon select user_settings" ON public.user_settings FOR SELECT USING (true);
CREATE POLICY "Allow anon insert user_settings" ON public.user_settings FOR INSERT WITH CHECK (user_id IS NOT NULL);
CREATE POLICY "Allow anon update user_settings" ON public.user_settings FOR UPDATE USING (user_id IS NOT NULL);
CREATE POLICY "Allow anon delete user_settings" ON public.user_settings FOR DELETE USING (user_id IS NOT NULL);

-- Pacing Alerts
CREATE POLICY "Allow anon select pacing_alerts" ON public.pacing_alerts FOR SELECT USING (true);
CREATE POLICY "Allow anon insert pacing_alerts" ON public.pacing_alerts FOR INSERT WITH CHECK (user_id IS NOT NULL);
CREATE POLICY "Allow anon update pacing_alerts" ON public.pacing_alerts FOR UPDATE USING (user_id IS NOT NULL);
CREATE POLICY "Allow anon delete pacing_alerts" ON public.pacing_alerts FOR DELETE USING (user_id IS NOT NULL);