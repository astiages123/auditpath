import { z } from 'zod';

export const ConceptMapSchema = z.preprocess(
  (val: unknown) => {
    const item = val as Record<string, any>;
    if (item && typeof item === 'object' && !item.baslik) {
      item.baslik = item.title || item.kavram || item.başlık || item.topic;
    }
    return item;
  },
  z.object({
    baslik: z.string().min(1),
    odak: z.string().default('Konu kapsamındaki temel kazanım'),
    // seviye alanına preprocess ekleyip metin bazında seviye belirleme
    seviye: z.preprocess(
      (val) => {
        const s = String(val).toLowerCase();
        if (s.includes('uygulama') || s.includes('apply')) {
          return 'Uygulama';
        }
        if (s.includes('analiz') || s.includes('analyze')) return 'Analiz';
        return 'Bilgi';
      },
      z.enum(['Bilgi', 'Uygulama', 'Analiz'])
    ),
    // gorsel alanı boş string gelirse null'a çevir
    gorsel: z.preprocess(
      (val) => (val === '' || val === undefined ? null : val),
      z.string().nullable()
    ),
    altText: z.string().nullable().optional().default(null),
    isException: z.preprocess((val) => !!val, z.boolean().default(false)),
    prerequisites: z.array(z.string()).optional().default([]),
  })
);

export const ConceptMapResponseSchema = z.object({
  difficulty_index: z.preprocess((val) => {
    const num = Number(val);
    return Math.max(1, Math.min(5, isNaN(num) ? 3 : num));
  }, z.number().min(1).max(5).describe('Metnin bilişsel zorluk endeksi (1: Basit, 5: Çok Ağır Doktrin)')),
  concepts: z.array(ConceptMapSchema).nonempty(),
});

export const GeneratedQuestionSchema = z.object({
  q: z.string().min(10, 'Soru metni çok kısa'),
  o: z.array(z.string()).length(5, 'Tam olarak 5 seçenek olmalı'),
  a: z.number().int().min(0).max(4),
  exp: z.string().min(10, 'Açıklama metni çok kısa'),
  evidence: z.string().min(1, 'Kanıt cümlesi zorunludur'),
  img: z.preprocess((val) => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'string') {
      if (val.toLowerCase() === 'null') return null;
      const n = parseInt(val, 10);
      return isNaN(n) ? null : n;
    }
    return val;
  }, z.number().nullable().optional()),
  diagnosis: z.string().max(500).optional(),
  insight: z.string().max(500).nullable().optional(),
});

export const ValidationResultSchema = z.preprocess(
  (data: unknown) => {
    const item = data as Record<string, any>;
    if (item && typeof item === 'object') {
      // total_score alanı yoksa alternatif isimlere bak
      if (item.total_score === undefined) {
        item.total_score = item.score ?? item.puan ?? item.point;
      }
      // decision alanı metnine göre eşle
      if (item.decision && typeof item.decision === 'string') {
        const d = item.decision.toUpperCase();
        if (
          d.includes('APPROV') ||
          d.includes('ONAY') ||
          d.includes('KABUL') ||
          d.includes('OK') ||
          d.includes('TRUE')
        ) {
          item.decision = 'APPROVED';
        } else if (
          d.includes('RED') ||
          d.includes('REJECT') ||
          d.includes('HATA')
        ) {
          item.decision = 'REJECTED';
        }
      }
    }
    return item;
  },
  z.object({
    total_score: z.coerce.number().min(0).max(100),
    decision: z.enum(['APPROVED', 'REJECTED']),
    critical_faults: z.array(z.string()).default([]),
    improvement_suggestion: z.string().default(''),
  })
);

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export type GenerationStep =
  | 'INIT'
  | 'MAPPING'
  | 'GENERATING'
  | 'VALIDATING'
  | 'SAVING'
  | 'COMPLETED'
  | 'ERROR';

export interface GenerationLog {
  id: string;
  step: GenerationStep;
  message: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

export interface GeneratorCallbacks {
  onLog: (log: GenerationLog) => void;
  onQuestionSaved: (totalSaved: number) => void;
  onComplete: (result: { success: boolean; generated: number }) => void;
  onError: (error: string) => void;
}
