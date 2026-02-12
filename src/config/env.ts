// Extend NodeJS namespace to support process.env in TypeScript
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
    }
  }
}

// Helper to safely get env vars in both Vite (client) and Node (scripts)
const getEnv = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process !== null) {
    return process['env']?.[key];
  }
  return undefined;
};

export const env = {
  supabase: {
    url: getEnv('VITE_SUPABASE_URL')!,
    anonKey: getEnv('VITE_SUPABASE_ANON_KEY')!,
  },
  ai: {
    // AI keys are handled by Supabase Edge Functions (ai-proxy)
    // and should NEVER be exposed to the client.
  },
  app: {
    env: getEnv('MODE') || getEnv('NODE_ENV'),
    isDev: getEnv('DEV') || getEnv('NODE_ENV') === 'development',
    isProd: getEnv('PROD') || getEnv('NODE_ENV') === 'production',
    siteUrl:
      getEnv('VITE_SITE_URL') ||
      (typeof window !== 'undefined' ? window.location.origin : ''),
  },
} as const;

// Type validation
if (!env.supabase.url || !env.supabase.anonKey) {
  // In development, we might not have these if just testing UI
  if (env.app.isProd) {
    throw new Error(
      'Missing required environment variables: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY'
    );
  } else {
    console.warn('Missing Supabase environment variables');
  }
}
