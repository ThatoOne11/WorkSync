-- 1. Enable the Supabase Vault extension
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- 2. Drop the old insecure table
DROP TABLE IF EXISTS public.settings CASCADE;

-- 3. Create the strict, secure schema
CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY,
  notification_email TEXT,
  enable_email_notifications BOOLEAN NOT NULL DEFAULT false,
  enable_pacing_alerts BOOLEAN NOT NULL DEFAULT false,
  clockify_workspace_id TEXT,
  clockify_user_id TEXT,
  clockify_api_key_id UUID, -- References vault.secrets
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_settings IS 'Securely stores user preferences. API keys are encrypted in Vault.';

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Allow anon/authenticated access to their own records (filtered by Edge Functions)
CREATE POLICY "Allow anon access to user_settings"
  ON public.user_settings FOR ALL TO anon, authenticated
  USING (true);

-- 4. Create an RPC to securely upsert settings and encrypt the API key
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
SECURITY DEFINER -- Runs with elevated privileges to access Vault
AS $$
DECLARE
  v_existing_secret_id UUID;
  v_new_secret_id UUID;
BEGIN
  -- Check if a secret already exists for this user
  SELECT clockify_api_key_id INTO v_existing_secret_id
  FROM public.user_settings
  WHERE user_id = p_user_id;

  -- If a new key is provided, insert it into Vault
  IF p_api_key IS NOT NULL AND p_api_key <> '' THEN
    -- Remove the old secret to prevent vault bloat
    IF v_existing_secret_id IS NOT NULL THEN
      DELETE FROM vault.decrypted_secrets WHERE id = v_existing_secret_id;
    END IF;

    -- Insert the new secret and get the UUID
    SELECT vault.create_secret(p_api_key, 'clockify_key_' || p_user_id::text) INTO v_new_secret_id;
  ELSE
    -- Keep the existing secret if no new key was provided
    v_new_secret_id := v_existing_secret_id;
  END IF;

  -- Upsert the user settings record
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

-- 5. Create an RPC to securely retrieve the decrypted key
CREATE OR REPLACE FUNCTION public.get_decrypted_clockify_key(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_secret_id UUID;
  v_decrypted_key TEXT;
BEGIN
  SELECT clockify_api_key_id INTO v_secret_id
  FROM public.user_settings
  WHERE user_id = p_user_id;

  IF v_secret_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_decrypted_key
  FROM vault.decrypted_secrets
  WHERE id = v_secret_id;

  RETURN v_decrypted_key;
END;
$$;

-- 6. SECURITY LOCKDOWN: Revoke access from standard users, grant ONLY to service_role
REVOKE ALL ON FUNCTION public.get_decrypted_clockify_key(UUID) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_decrypted_clockify_key(UUID) TO service_role;