export const SUPABASE_CONFIG = {
  url: Deno.env.get('SUPABASE_URL')!,
  anonKey: Deno.env.get('SUPABASE_ANON_KEY')!,
  serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
};

export const EMAIL_CONFIG = {
  resendApiKey: Deno.env.get('RESEND_API_KEY'),
  fromAddress: 'WorkSync <onboarding@resend.dev>',
};
