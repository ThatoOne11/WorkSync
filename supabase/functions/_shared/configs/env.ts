function getEnvOrThrow(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`FATAL: Missing required environment variable '${name}'`);
  }
  return value;
}

export const ENV = {
  get SUPABASE_URL() {
    return getEnvOrThrow('SUPABASE_URL');
  },
  get SUPABASE_ANON_KEY() {
    return getEnvOrThrow('SUPABASE_ANON_KEY');
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return getEnvOrThrow('SUPABASE_SERVICE_ROLE_KEY');
  },
  get GEMINI_API_KEY() {
    return getEnvOrThrow('GEMINI_API_KEY');
  },
  get GEMINI_MODEL() {
    return Deno.env.get('GEMINI_MODEL');
  },
  get RESEND_API_KEY() {
    return Deno.env.get('RESEND_API_KEY');
  },
} as const;
