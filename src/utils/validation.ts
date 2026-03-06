import type { ZodError, ZodSchema } from 'zod';

/**
 * Başarılı ayrıştırma (parsing) sonucu.
 */
export interface ParseResult<T> {
  success: true;
  data: T;
  error?: never;
}

/**
 * Hatalı ayrıştırma sonucu ve hata detayları.
 */
export interface ParseError {
  success: false;
  data?: never;
  error: ZodError;
  issues: string[];
}

/**
 * Güvenli ayrıştırma işlemlerinin dönebileceği ortak tip.
 */
export type SafeParseResult<T> = ParseResult<T> | ParseError;

/**
 * Veriyi verilen Zod şemasına göre güvenli şekilde doğrular.
 * @param schema - Zod şeması
 * @param data - Doğrulanacak veri
 * @returns Başarı durumu ve veri/hata içeren nesne
 * @example const res = safeParse(UserSchema, input); if(res.success) { ... }
 */
export function safeParse<T>(
  schema: ZodSchema<T>,
  data: unknown
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
      (issue) => `${issue.path.join('.')}: ${issue.message}`
    ),
  };
}

/**
 * Veriyi şemaya göre doğrular, başarısız olursa hata fırlatır.
 * @param schema - Zod şeması
 * @param data - Veri
 * @returns Doğrulanmış veri
 * @throws ZodError
 */
export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Bir dizi veriyi toplu halde doğrular, sadece geçerli olanları döner.
 * @param schema - Her bir eleman için şema
 * @param items - Doğrulanacak dizi
 * @param options - Hata durumunda çalışacak isteğe bağlı callback
 * @returns Sadece başarıyla doğrulanan elemanların dizisi
 */
export function parseArray<T>(
  schema: ZodSchema<T>,
  items: unknown[],
  options: { onError?: (error: ParseError, index: number) => void } = {}
): T[] {
  const results: T[] = [];

  items.forEach((item, index) => {
    const result = safeParse(schema, item);
    if (result.success) {
      results.push(result.data);
    } else {
      options.onError?.(result as ParseError, index);
    }
  });

  return results;
}

/**
 * Verinin şemaya uygun olup olmadığını kontrol eden Tip Muhafızı (Type Guard).
 * @param schema - Zod şeması
 * @param data - Veri
 * @returns Boolean
 */
export function isValid<T>(schema: ZodSchema<T>, data: unknown): data is T {
  return schema.safeParse(data).success;
}

/**
 * Verilen string'in geçerli bir UUID formatında olup olmadığını kontrol eder.
 * @param id - Kontrol edilecek ID
 * @returns Boolean
 * @example isValidUuid('550e8400-e29b-41d4-a716-446655440000') // true
 */
export function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id
  );
}
