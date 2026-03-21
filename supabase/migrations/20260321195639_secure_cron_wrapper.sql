-- ==============================================================================
-- ENABLE REQUIRED EXTENSIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ==============================================================================
-- SECURE CRON JOB WRAPPER
-- Fetches the Service Role Key from Vault in-memory to trigger Edge Functions
-- ==============================================================================

-- 1. Create the secure wrapper function
CREATE OR REPLACE FUNCTION public.invoke_secure_edge_function(endpoint_name TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault
AS $$
DECLARE
  v_service_key TEXT;
  v_base_url TEXT;
  v_url TEXT;
BEGIN
  -- 1. Fetch the environment-specific base URL from Vault
  SELECT decrypted_secret INTO v_base_url
  FROM vault.decrypted_secrets
  WHERE name = 'edge_function_base_url';

  -- Fail safely if the environment isn't configured
  IF v_base_url IS NULL THEN
    RAISE EXCEPTION 'edge_function_base_url is not set in Vault. Cannot execute cron.';
  END IF;

  -- Construct the final URL dynamically
  v_url := v_base_url || endpoint_name;
  
  -- 2. Fetch the secret dynamically from the Vault
  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'backend_service_role_key';

  IF v_service_key IS NULL THEN
    RAISE EXCEPTION 'backend_service_role_key is not set in Vault.';
  END IF;

  -- 3. Dispatch the network request
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  );
END;
$$;

-- 2. LOCKDOWN: Prevent anyone except the database admin/cron from running this
REVOKE ALL ON FUNCTION public.invoke_secure_edge_function(TEXT) FROM public, anon, authenticated;


-- ==============================================================================
-- CRON JOB SCHEDULING
-- ==============================================================================

-- 3. Safely unschedule old jobs ONLY if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-pacing-alerts') THEN
    PERFORM cron.unschedule('daily-pacing-alerts');
  END IF;
  
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-summaries') THEN
    PERFORM cron.unschedule('weekly-summaries');
  END IF;
END $$;

-- 4. Schedule the clean, secure jobs
SELECT cron.schedule(
  'daily-pacing-alerts', 
  '0 16 * * 1-5', 
  $$ SELECT public.invoke_secure_edge_function('pacing-alert'); $$
);

SELECT cron.schedule(
  'weekly-summaries', 
  '0 8 * * 0', 
  $$ SELECT public.invoke_secure_edge_function('create-weekly-summaries'); $$
);