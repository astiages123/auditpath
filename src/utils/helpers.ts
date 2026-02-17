import { z, type ZodError, type ZodSchema } from "zod";
import type { Json } from "@/types/database.types";
import { RANKS } from "@/utils/constants";
export { RANKS };
import type { Rank } from "@/types/auth";

/**
 * Tarih işlemleri için yardımcı fonksiyonlar.
 * Virtual Day Logic ve Date Formatting burada merkezi olarak yönetilir.
 */

/**
 * Sanal gün mantığı: Gece 04:00'dan önce ise bir önceki güne ait sayılır.
 * Bu, gece geç saatlere kadar çalışan kullanıcıların aynı "gün" içinde kalmasını sağlar.
 * @param date - İşlenecek tarih (default: şimdi)
 * @returns Sanal gün olarak ayarlanmış Date nesnesi (mutate edilmez, yeni Date döner)
 */
export function getVirtualDate(date?: Date): Date {
  const d = date ? new Date(date) : new Date();
  if (d.getHours() < 4) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

/**
 * Bugünün sanal gün başlangıcını döner (04:00 AM).
 * Genellikle veritabanı sorguları için kullanılır.
 * @returns Bugünün 04:00'ındaki Date nesnesi
 */
export function getVirtualDayStart(date?: Date): Date {
  const now = date ? new Date(date) : new Date();
  const today = new Date(now);

  // 00:00 - 04:00 arası ise bir önceki güne ait
  if (now.getHours() < 4) {
    today.setDate(today.getDate() - 1);
  }
  today.setHours(4, 0, 0, 0);
  return today;
}

/**
 * Tarihi YYYY-MM-DD formatına çevirir.
 * @param date - Formatlanacak tarih
 * @returns "2026-01-28" gibi string
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Sanal gün mantığıyla YYYY-MM-DD key oluşturur.
 * Virtual day adjustment uygulanır, sonra format edilir.
 * @param date - İşlenecek tarih (default: şimdi)
 * @returns "2026-01-28" gibi string, sanal gün mantığıyla
 */
export function getVirtualDateKey(date?: Date): string {
  const virtualDate = getVirtualDate(date);
  return formatDateKey(virtualDate);
}

/**
 * Zaman ve süre formatlama fonksiyonları.
 * Bu modül, projede tekrar eden format fonksiyonlarını tek bir merkezde toplar.
 */

/**
 * Saniye cinsinden süreyi "Xsa Ydk" formatına çevirir.
 * 0 dakika ise sadece "0dk" döner.
 * @example formatTimeFromSeconds(3665) → "1sa 1dk"
 * @example formatTimeFromSeconds(120) → "2dk"
 */
export function formatTimeFromSeconds(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}sa ${m}dk`;
  return `${m}dk`;
}

/**
 * Ondalık saat cinsinden süreyi "X sa Y dk" formatına çevirir.
 * @example formatDuration(1.5) → "1 sa 30 dk"
 * @example formatDuration(0.5) → "0 sa 30 dk"
 */
export function formatDuration(decimalHours: number): string {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours} sa ${minutes} dk`;
}

export { formatDuration as formatDurationFromHours };

/**
 * Kısa format: "Xs Yd" (ProgressHeader vb. için).
 * @example formatDurationShort(1.5) → "1s 30d"
 */
export function formatDurationShort(decimalHours: number): string {
  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}s ${minutes}d`;
}

/**
 * Get the rank for a given progress percentage.
 *
 * @param percentage Progress percentage (0-100)
 * @returns The appropriate rank for the percentage
 */
export function getRankForPercentage(percentage: number): Rank {
  // Sort by minPercentage descending to find the highest matching rank
  const sortedRanks = [...RANKS].sort(
    (a, b) => b.minPercentage - a.minPercentage,
  );
  for (const rank of sortedRanks) {
    if (percentage >= rank.minPercentage) {
      return rank;
    }
  }
  return RANKS[0]; // Fallback
}

/**
 * Get the next rank after the current rank.
 *
 * @param currentRankId Current rank ID
 * @returns Next rank or null if already at max rank
 */
export function getNextRank(currentRankId: string): Rank | null {
  const currentIndex = RANKS.findIndex((r: Rank) => r.id === currentRankId);
  if (currentIndex === -1 || currentIndex === RANKS.length - 1) return null;
  return RANKS[currentIndex + 1];
}

/**
 * Category normalization utilities.
 * Centralizes category slug mapping logic to avoid duplication.
 */

/**
 * Normalize category names to database slugs for consistent matching.
 *
 * @param rawName Raw category name
 * @returns Normalized category slug
 */
export function normalizeCategorySlug(rawName: string): string {
  const slugMap: Record<string, string> = {
    EKONOMİ: "EKONOMI",
    HUKUK: "HUKUK",
    "MUHASEBE VE MALİYE": "MUHASEBE_MALIYE",
    "GENEL YETENEK VE İNGİZLİCE": "GENEL_YETENEK",
  };
  return slugMap[rawName] || rawName;
}

// --- Validation Helpers (formerly type-guards.ts) ---

/**
 * Result type for safe parsing operations
 */
export interface ParseResult<T> {
  success: true;
  data: T;
  error?: never;
}

export interface ParseError {
  success: false;
  data?: never;
  error: ZodError;
  issues: string[];
}

export type SafeParseResult<T> = ParseResult<T> | ParseError;

/**
 * Safely parses unknown data using a Zod schema
 * Returns a result object with success flag, data, and error details
 */
export function safeParse<T>(
  schema: ZodSchema<T>,
  data: unknown,
): SafeParseResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    error: result.error,
    issues: result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    ),
  };
}

/**
 * Parses data with a schema, throwing on validation failure
 */
export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Parses a Supabase JSON column value
 */
export function parseJsonColumn<T>(schema: ZodSchema<T>, data: Json): T {
  return schema.parse(data);
}

/**
 * Safely parses a JSON column with error handling
 */
export function safeParseJsonColumn<T>(
  schema: ZodSchema<T>,
  data: Json,
): SafeParseResult<T> {
  return safeParse(schema, data);
}

/**
 * Validates and maps an array of items
 * Returns successfully parsed items and logs errors for invalid ones
 */
export function parseArray<T>(
  schema: ZodSchema<T>,
  items: unknown[],
  options: { onError?: (error: ParseError, index: number) => void } = {},
): T[] {
  const results: T[] = [];

  items.forEach((item, index) => {
    const result = safeParse(schema, item);
    if (result.success) {
      results.push(result.data);
    } else {
      options.onError?.(result, index);
    }
  });

  return results;
}

/**
 * Type guard that validates and narrows type
 */
export function isValid<T>(schema: ZodSchema<T>, data: unknown): data is T {
  return schema.safeParse(data).success;
}

/**
 * Creates a partial schema validator (all fields optional)
 */
export function createPartialValidator<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
) {
  const partialSchema = schema.partial();
  return {
    validate: (data: unknown) => safeParse(partialSchema, data),
    parse: (data: unknown) => partialSchema.parse(data),
  };
}

/**
 * Asserts that data matches schema at runtime
 */
export function assertValid<T>(
  schema: ZodSchema<T>,
  data: unknown,
  message = "Data validation failed",
): asserts data is T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new Error(`${message}: ${issues}`);
  }
}

/**
 * Maps database rows to typed objects with validation
 * Returns null for invalid rows instead of throwing
 */
export function parseRow<T>(schema: ZodSchema<T>, data: unknown): T | null {
  const result = safeParse(schema, data);
  return result.success ? result.data : null;
}
