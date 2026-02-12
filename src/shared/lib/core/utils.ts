import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(decimalHours: number): string {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours} sa ${minutes} dk`;
}

type PlainObject = Record<string, unknown>;

/**
 * Converts snake_case keys of an object to camelCase
 */
export function toCamelCase<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    // eslint-disable-next-line no-restricted-syntax
    return obj.map((v) => toCamelCase(v)) as unknown as T;
  } else if (
    obj !== null &&
    typeof obj === 'object' &&
    obj.constructor === Object
  ) {
    const o = obj as PlainObject;
    // eslint-disable-next-line no-restricted-syntax
    return Object.keys(o).reduce(
      (result, key) => ({
        ...result,
        [key.replace(/(_\w)/g, (k) => k[1].toUpperCase())]: toCamelCase(o[key]),
      }),
      {}
    ) as unknown as T;
  }
  return obj as T;
}

/**
 * Converts camelCase keys of an object to snake_case
 */
export function toSnakeCase(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map((v) => toSnakeCase(v));
  } else if (
    obj !== null &&
    typeof obj === 'object' &&
    obj.constructor === Object
  ) {
    const o = obj as PlainObject;
    return Object.keys(o).reduce(
      (result, key) => ({
        ...result,
        [key.replace(/[A-Z]/g, (k) => `_${k.toLowerCase()}`)]: toSnakeCase(
          o[key]
        ),
      }),
      {}
    );
  }
  return obj;
}

export const slugify = (text: string): string => {
  const trMap: { [key: string]: string } = {
    ı: 'i',
    İ: 'i',
    ğ: 'g',
    Ğ: 'g',
    ü: 'u',
    Ü: 'u',
    ş: 's',
    Ş: 's',
    ö: 'o',
    Ö: 'o',
    ç: 'c',
    Ç: 'c',
  };
  return text
    .split('')
    .map((char) => trMap[char] || char)
    .join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};
