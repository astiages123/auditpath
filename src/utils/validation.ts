import type { ZodError, ZodSchema } from 'zod';

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
 * Parses data with a schema, throwing on validation failure
 */
export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Validates and maps an array of items
 * Returns successfully parsed items and logs errors for invalid ones
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
 * Type guard that validates and narrows type
 */
export function isValid<T>(schema: ZodSchema<T>, data: unknown): data is T {
  return schema.safeParse(data).success;
}

/**
 * Checks if a string is a valid UUID
 */
export function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id
  );
}
