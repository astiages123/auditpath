import { logger } from '@/utils/logger';

export interface EnvConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  app: {
    env: string;
    isDev: boolean;
    isProd: boolean;
    siteUrl: string;
  };
}

// Helper to safely get env vars in both Vite (client) and Node (scripts)
const getEnv = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  // Node.js environment - safely check for process
  const globalProcess = globalThis as {
    process?: { env: Record<string, string | undefined> };
  };
  if (globalProcess.process?.env) {
    return globalProcess.process.env[key];
  }
  return undefined;
};

// Validate and get environment variables
const getRequiredEnvVar = (key: string): string => {
  const value = getEnv(key);
  if (!value) {
    if (getEnv('PROD') || getEnv('NODE_ENV') === 'production') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    // Safe console warning in development
    logger.warn(`Missing environment variable ${key}. Using empty string.`);
    return '';
  }
  return value;
};

const appEnv = getEnv('MODE') || getEnv('NODE_ENV') || 'development';

export const env: EnvConfig = {
  supabase: {
    url: getRequiredEnvVar('VITE_SUPABASE_URL'),
    anonKey: getRequiredEnvVar('VITE_SUPABASE_ANON_KEY'),
  },
  app: {
    env: appEnv,
    isDev: appEnv === 'development',
    isProd: appEnv === 'production',
    siteUrl:
      getEnv('VITE_SITE_URL') ||
      (typeof window !== 'undefined' ? window.location.origin : ''),
  },
} as const;

// Type validation
if (env.app.isProd && (!env.supabase.url || !env.supabase.anonKey)) {
  throw new Error(
    'Missing required environment variables: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY'
  );
}
