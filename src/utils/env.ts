import { logger } from '@/utils/logger';

// Extend global types for process.env
export interface ProcessEnv {
  [key: string]: string | undefined;
}

// Helper to safely get env vars in both Vite (client) and Node (scripts)
const getEnv = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  // Node.js environment - safely check for process
  const globalProcess = globalThis as { process?: { env: ProcessEnv } };
  if (globalProcess.process?.env) {
    return globalProcess.process.env[key];
  }
  return undefined;
};

// Validate and get environment variables with proper error handling
const getRequiredEnvVar = (key: string): string => {
  const value = getEnv(key);
  if (!value) {
    if (getEnv('PROD') || getEnv('NODE_ENV') === 'production') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    // Safe console warning - only in development using logger
    if (typeof logger !== 'undefined' && logger.warn) {
      logger.warn(
        `Warning: Missing environment variable ${key}. Using empty string.`
      );
    }
    return '';
  }
  return value;
};

export const env = {
  supabase: {
    url: getRequiredEnvVar('VITE_SUPABASE_URL'),
    anonKey: getRequiredEnvVar('VITE_SUPABASE_ANON_KEY'),
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
  }
}
