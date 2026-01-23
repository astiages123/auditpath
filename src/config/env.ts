export const env = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL!,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
  },
  ai: {
    cerebrasApiKey: import.meta.env.VITE_CEREBRAS_API_KEY,
    mimoApiKey: import.meta.env.VITE_MIMO_API_KEY,
  },
  app: {
    env: import.meta.env.MODE,
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
    siteUrl: import.meta.env.VITE_SITE_URL || window.location.origin,
  },
} as const;

// Type validation
if (!env.supabase.url || !env.supabase.anonKey) {
  // In development, we might not have these if just testing UI
  if (env.app.isProd) {
    throw new Error('Missing required environment variables: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  } else {
    console.warn('Missing Supabase environment variables');
  }
}
