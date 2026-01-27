/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_CEREBRAS_API_KEY?: string;
  readonly VITE_MIMO_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
