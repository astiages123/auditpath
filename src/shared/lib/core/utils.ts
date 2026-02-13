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

type CamelCase<S extends string> = S extends `${infer P}_${infer Q}`
  ? `${P}${Capitalize<CamelCase<Q>>}`
  : S;

type CamelCaseObject<T> =
  T extends Array<infer U>
    ? Array<CamelCaseObject<U>>
    : T extends PlainObject
      ? { [K in keyof T as CamelCase<string & K>]: CamelCaseObject<T[K]> }
      : T;

function isPlainObject(val: unknown): val is PlainObject {
  return val !== null && typeof val === 'object' && val.constructor === Object;
}

type StackArray = unknown[];
type StackObject = Record<string, unknown>;

interface StackItem<T = StackArray | StackObject> {
  t: T;
  s: unknown;
}

export function toCamelCase<T>(obj: T): CamelCaseObject<T> {
  if (obj === null || obj === undefined) {
    return obj as CamelCaseObject<T>;
  }

  if (Array.isArray(obj)) {
    const result = toCamelCaseArray(obj);
    return result as CamelCaseObject<T>;
  }

  if (isPlainObject(obj)) {
    const result = toCamelCaseObject(obj);
    return result as CamelCaseObject<T>;
  }

  return obj as CamelCaseObject<T>;
}

function toCamelCaseArray(arr: unknown[]): unknown[] {
  const result: unknown[] = [];
  const stack: StackItem[] = [];

  for (const item of arr) {
    if (isPlainObject(item)) {
      const newObj: PlainObject = {};
      result.push(newObj);
      stack.push({ t: newObj, s: item });
    } else if (Array.isArray(item)) {
      const newArr: unknown[] = [];
      result.push(newArr);
      processArray(newArr, item, stack);
    } else {
      result.push(item);
    }
  }

  processStack(stack);
  return result;
}

function toCamelCaseObject(obj: PlainObject): PlainObject {
  const result: PlainObject = {};
  const stack: StackItem[] = [];

  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/(_\w)/g, (k) => k[1].toUpperCase());
    const value = obj[key];

    if (isPlainObject(value)) {
      const newObj: PlainObject = {};
      result[camelKey] = newObj;
      stack.push({ t: newObj, s: value });
    } else if (Array.isArray(value)) {
      const newArr: unknown[] = [];
      result[camelKey] = newArr;
      processArray(newArr, value, stack);
    } else {
      result[camelKey] = value;
    }
  }

  processStack(stack);
  return result;
}

function processArray(
  target: unknown[],
  source: unknown[],
  stack: StackItem[]
): void {
  for (const item of source) {
    if (isPlainObject(item)) {
      const newObj: PlainObject = {};
      (target as unknown[]).push(newObj);
      stack.push({ t: newObj, s: item });
    } else if (Array.isArray(item)) {
      const newArr: unknown[] = [];
      (target as unknown[]).push(newArr);
      processArray(newArr, item, stack);
    } else {
      (target as unknown[]).push(item);
    }
  }
}

function processStack(stack: StackItem[]): void {
  while (stack.length > 0) {
    const { t: target, s: source } = stack.pop()!;

    if (isPlainObject(source)) {
      for (const key of Object.keys(source)) {
        const camelKey = key.replace(/(_\w)/g, (k) => k[1].toUpperCase());
        const value = source[key];

        if (isPlainObject(value)) {
          const newObj: PlainObject = {};
          (target as PlainObject)[camelKey] = newObj;
          stack.push({ t: newObj, s: value });
        } else if (Array.isArray(value)) {
          const newArr: unknown[] = [];
          (target as PlainObject)[camelKey] = newArr;
          processArray(newArr, value, stack);
        } else {
          (target as PlainObject)[camelKey] = value;
        }
      }
    }
  }
}

export function toSnakeCase<T>(obj: T): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    const result: unknown[] = [];
    const stack: StackItem[] = [{ t: result, s: obj }];

    while (stack.length > 0) {
      const { t: target, s: source } = stack.pop()!;

      if (Array.isArray(source)) {
        for (const item of source) {
          if (isPlainObject(item)) {
            const newObj: PlainObject = {};
            (target as unknown[]).push(newObj);
            stack.push({ t: newObj, s: item });
          } else if (Array.isArray(item)) {
            const newArr: unknown[] = [];
            (target as unknown[]).push(newArr);
            stack.push({ t: newArr, s: item });
          } else {
            (target as unknown[]).push(item);
          }
        }
      }
    }

    return result;
  }

  if (isPlainObject(obj)) {
    const result: PlainObject = {};
    const stack: StackItem[] = [{ t: result, s: obj }];

    while (stack.length > 0) {
      const { t: target, s: source } = stack.pop()!;

      for (const key of Object.keys(source as PlainObject)) {
        const snakeKey = key.replace(/[A-Z]/g, (k) => `_${k.toLowerCase()}`);
        const value = (source as PlainObject)[key];

        if (isPlainObject(value)) {
          const newObj: PlainObject = {};
          (target as PlainObject)[snakeKey] = newObj;
          stack.push({ t: newObj, s: value });
        } else if (Array.isArray(value)) {
          const newArr: unknown[] = [];
          (target as PlainObject)[snakeKey] = newArr;
          for (const item of value) {
            if (isPlainObject(item)) {
              const arrObj: PlainObject = {};
              newArr.push(arrObj);
              stack.push({ t: arrObj, s: item });
            } else if (Array.isArray(item)) {
              const nestedArr: unknown[] = [];
              newArr.push(nestedArr);
              stack.push({ t: nestedArr, s: item });
            } else {
              newArr.push(item);
            }
          }
        } else {
          (target as PlainObject)[snakeKey] = value;
        }
      }
    }

    return result;
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
