// Helper to safely get env vars in both Vite (client) and Node (scripts)
const getEnv = (key: string): string | undefined => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env[key];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof process !== "undefined" && (process as any).env) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (process as any).env[key];
  }
  return undefined;
};

export const env = {
  supabase: {
    url: getEnv("VITE_SUPABASE_URL")!,
    anonKey: getEnv("VITE_SUPABASE_ANON_KEY")!,
  },
  ai: {
    cerebrasApiKey: getEnv("VITE_CEREBRAS_API_KEY"),
    mimoApiKey: getEnv("VITE_MIMO_API_KEY"),
  },
  app: {
    env: getEnv("MODE") || getEnv("NODE_ENV"),
    isDev: getEnv("DEV") || getEnv("NODE_ENV") === "development",
    isProd: getEnv("PROD") || getEnv("NODE_ENV") === "production",
    siteUrl: getEnv("VITE_SITE_URL") ||
      (typeof window !== "undefined" ? window.location.origin : ""),
  },
} as const;

// Type validation
if (!env.supabase.url || !env.supabase.anonKey) {
  // In development, we might not have these if just testing UI
  if (env.app.isProd) {
    throw new Error(
      "Missing required environment variables: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY",
    );
  } else {
    console.warn("Missing Supabase environment variables");
  }
}
