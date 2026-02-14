import { z, type ZodSchema, type ZodError } from 'zod';
import type { Json } from '@/shared/types/database.types';

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
 *
 * @example
 * const result = safeParse(QuizQuestionSchema, jsonData);
 * if (result.success) {
 *   console.log(result.data.q); // Type-safe access
 * } else {
 *   console.error('Validation failed:', result.issues);
 * }
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
 * Use when you expect data to always be valid (e.g., after pre-validation)
 *
 * @example
 * const question = parseOrThrow(QuizQuestionSchema, jsonData);
 */
export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Parses a Supabase JSON column value
 * Handles the Json type constraint and validates structure
 *
 * @example
 * const question = parseJsonColumn(QuizQuestionSchema, row.question_data);
 */
export function parseJsonColumn<T>(schema: ZodSchema<T>, data: Json): T {
  // Json type is string | number | boolean | null | Json[] | { [key: string]: Json }
  // We need to validate it as unknown first
  return schema.parse(data);
}

/**
 * Safely parses a JSON column with error handling
 *
 * @example
 * const result = safeParseJsonColumn(QuizQuestionSchema, row.question_data);
 * if (!result.success) {
 *   console.error('Invalid question_data:', result.issues);
 * }
 */
export function safeParseJsonColumn<T>(
  schema: ZodSchema<T>,
  data: Json
): SafeParseResult<T> {
  return safeParse(schema, data);
}

/**
 * Validates and maps an array of items
 * Returns successfully parsed items and logs errors for invalid ones
 *
 * @example
 * const questions = parseArray(QuizQuestionSchema, rows.map(r => r.question_data));
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
      options.onError?.(result, index);
    }
  });

  return results;
}

/**
 * Type guard that validates and narrows type
 *
 * @example
 * if (isValid(QuizQuestionSchema, data)) {
 *   console.log(data.q); // TypeScript knows this is QuizQuestion
 * }
 */
export function isValid<T>(schema: ZodSchema<T>, data: unknown): data is T {
  return schema.safeParse(data).success;
}

/**
 * Creates a partial schema validator (all fields optional)
 * Useful for validating partial updates
 *
 * @example
 * const partialValidator = createPartialValidator(QuizQuestionSchema);
 * const updates = partialValidator.validate(someData);
 */
export function createPartialValidator<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
) {
  const partialSchema = schema.partial();
  return {
    validate: (data: unknown) => safeParse(partialSchema, data),
    parse: (data: unknown) => partialSchema.parse(data),
  };
}

/**
 * Asserts that data matches schema at runtime
 * Useful in test assertions or debug builds
 *
 * @example
 * assertValid(QuizQuestionSchema, data, 'Question data must be valid');
 */
export function assertValid<T>(
  schema: ZodSchema<T>,
  data: unknown,
  message = 'Data validation failed'
): asserts data is T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    throw new Error(`${message}: ${issues}`);
  }
}

/**
 * Maps database rows to typed objects with validation
 * Returns null for invalid rows instead of throwing
 *
 * @example
 * const questions = rows
 *   .map(row => parseRow(QuizQuestionSchema, row.question_data))
 *   .filter((q): q is QuizQuestion => q !== null);
 */
export function parseRow<T>(schema: ZodSchema<T>, data: unknown): T | null {
  const result = safeParse(schema, data);
  return result.success ? result.data : null;
}
