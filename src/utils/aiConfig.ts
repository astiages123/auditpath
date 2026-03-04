// ===========================
// === TİP TANIMLAMALARI ===
// ===========================

/**
 * Desteklenen AI görev tiplerinin listesi.
 */
export const AI_TASKS = [
  'analysis',
  'drafting',
  'validation',
  'revision',
  'diagnosis',
  'followup',
] as const;

/** Bir AI görevinin tipi */
export type AITask = (typeof AI_TASKS)[number];

/**
 * AI model yapılandırma arayüzü.
 */
export interface AIConfig {
  /** Model sağlayıcısı (Google, DeepSeek vb.) */
  provider: 'mimo' | 'deepseek' | 'google' | 'cerebras';
  /** Kullanılacak modelin tam adı */
  model: string;
  /** Yaratıcılık/Kesinlik ayarı (0.0 - 1.0) */
  temperature: number;
  /** Sistem istemine eklenecek varsayılan önek */
  systemPromptPrefix?: string;
}

// ===========================
// === GÖREV YAPILANDIRMALARI ===
// ===========================

/**
 * Her bir görev tipi için varsayılan model ve parametre ayarları.
 */
const TASK_CONFIGS: Record<AITask, AIConfig> = {
  /** Veri ve içerik analizi */
  analysis: {
    provider: 'google',
    model: 'gemini-3-flash-preview',
    temperature: 0.7,
  },
  validation: {
    provider: 'cerebras',
    model: 'gpt-oss-120b',
    temperature: 0.1,
  },
  /** İlk taslak oluşturma */
  drafting: {
    provider: 'deepseek',
    model: 'deepseek-chat',
    temperature: 0.7,
  },
  /** İçerik revizyonu ve düzeltme */
  revision: {
    provider: 'deepseek',
    model: 'deepseek-chat',
    temperature: 0.5,
  },
  /** Durum teşhisi ve detaylı analiz */
  diagnosis: {
    provider: 'deepseek',
    model: 'deepseek-chat',
    temperature: 0.3,
  },
  /** Takip soruları ve etkileşim */
  followup: {
    provider: 'deepseek',
    model: 'deepseek-chat',
    temperature: 0.6,
  },
};

// ===========================
// === YARDIMCI FONKSİYONLAR ===
// ===========================

/**
 * Belirtilen görev tipine uygun AI yapılandırmasını döner.
 * Eğer görev tipi bulunamazsa varsayılan olarak 'drafting' yapılandırmasını kullanır.
 *
 * @param task - Sorgulanan AI görev tipi
 * @returns Seçilen göreve özel AI yapılandırması
 */
export const getTaskConfig = (task: AITask): AIConfig => {
  return TASK_CONFIGS[task] || TASK_CONFIGS.drafting;
};
