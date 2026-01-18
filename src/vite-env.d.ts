/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // Sadece istemci tarafında güvenle kullanılabilecek diğer VITE_ değişkenleri buraya...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
