import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSS sınıflarını güvenli bir şekilde birleştirir ve çakışmaları (conflict) önler.
 * @param inputs - Birleştirilecek sınıf değerleri listesi
 * @returns Birleştirilmiş temiz sınıf string'i
 * @example cn('px-2 py-1', isTrue && 'bg-blue-500', className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Verilen metni URL dostu bir slug haline getirir.
 * Türkçe karakterleri uygun İngilizce karşılıklarına dönüştürür.
 * @param text - Dönüştürülecek metin
 * @returns URL dostu küçük harf string
 * @example slugify('Merhaba Dünya!') // "merhaba-dunya"
 */
export const slugify = (text: string): string => {
  const trMap: Record<string, string> = {
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
