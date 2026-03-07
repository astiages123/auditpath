import { logger } from '@/utils/logger';

/**
 * Uygulama genelinde kullanılan çevre değişkenleri yapılandırması.
 */
export interface EnvConfig {
  /** Supabase bağlantı bilgileri */
  supabase: {
    /** Supabase proje URL'i */
    url: string;
    /** Supabase anonim anahtarı */
    anonKey: string;
  };
  /** Uygulama durum bilgileri */
  app: {
    /** Çalışma ortamı (development, production vb.) */
    env: string;
    /** Geliştirme ortamında mı? */
    isDev: boolean;
    /** Üretim ortamında mı? */
    isProd: boolean;
    /** Uygulamanın yayındaki URL'i */
    siteUrl: string;
  };
}

/**
 * Hem Vite (client) hem de Node.js ortamlarında çevre değişkenlerini güvenli bir şekilde okur.
 *
 * @param key - Okunacak değişkenin adı
 * @returns Değişkenin değeri veya undefined
 */
const getEnvValue = (key: string): string | undefined => {
  // Vite ortamı kontrolü
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }

  // Node.js ortamı kontrolü
  const globalEnvironment = globalThis as {
    process?: { env: Record<string, string | undefined> };
  };

  if (globalEnvironment.process?.env) {
    return globalEnvironment.process.env[key];
  }

  return undefined;
};

/**
 * Zorunlu bir çevre değişkenini okur, yoksa hata fırlatır veya geliştirme modunda uyarır.
 *
 * @param key - Okunacak değişkenin adı
 * @returns Değişkenin değeri
 * @throws Değişken eksikse ve üretim ortamındaysa hata fırlatır
 */
const getRequiredEnvVar = (key: string): string => {
  const value = getEnvValue(key);

  if (!value) {
    const isProduction =
      getEnvValue('PROD') === 'true' ||
      getEnvValue('NODE_ENV') === 'production';

    if (isProduction) {
      throw new Error(`[Env] Kritik çevre değişkeni eksik: ${key}`);
    }

    // Geliştirme ortamında sadece uyarı ver ve boş string dön
    logger.warn(
      'Env',
      'getRequiredEnvVar',
      `Eksik çevre değişkeni: ${key}. Boş değer kullanılıyor.`
    );
    return '';
  }

  return value;
};

const currentMode =
  getEnvValue('MODE') || getEnvValue('NODE_ENV') || 'development';

/**
 * Uygulamanın merkezi çevre değişkenleri nesnesi.
 */
export const env: EnvConfig = {
  supabase: {
    url: getRequiredEnvVar('VITE_SUPABASE_URL'),
    anonKey: getRequiredEnvVar('VITE_SUPABASE_ANON_KEY'),
  },
  app: {
    env: currentMode,
    isDev: currentMode === 'development',
    isProd: currentMode === 'production',
    siteUrl:
      getEnvValue('VITE_SITE_URL') ||
      (typeof window !== 'undefined' ? window.location.origin : ''),
  },
} as const;

// Üretim ortamı için ek doğrulama
if (env.app.isProd && (!env.supabase.url || !env.supabase.anonKey)) {
  throw new Error(
    '[Env] Üretim ortamında kritik Supabase değişkenleri (URL/Key) eksik!'
  );
}
