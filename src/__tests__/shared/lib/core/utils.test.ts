import {
  cn,
  formatDuration,
  slugify,
  toCamelCase,
  toSnakeCase,
} from '@/shared/lib/core/utils';
import { describe, expect, it } from 'vitest';

describe('utils.ts', () => {
  describe('toCamelCase', () => {
    it('should convert simple objects from snake_case to camelCase', () => {
      const input = { user_id: 1, first_name: 'John' };
      const expected = { userId: 1, firstName: 'John' };
      expect(toCamelCase(input)).toEqual(expected);
    });

    it('should convert nested objects', () => {
      const input = {
        user_info: {
          first_name: 'John',
          last_name: 'Doe',
          contact_details: {
            phone_number: '123',
          },
        },
      };
      const expected = {
        userInfo: {
          firstName: 'John',
          lastName: 'Doe',
          contactDetails: {
            phoneNumber: '123',
          },
        },
      };
      expect(toCamelCase(input)).toEqual(expected);
    });

    it('should convert arrays of objects', () => {
      const input = [
        { item_id: 1, item_name: 'A' },
        { item_id: 2, item_name: 'B' },
      ];
      const expected = [
        { itemId: 1, itemName: 'A' },
        { itemId: 2, itemName: 'B' },
      ];
      expect(toCamelCase(input)).toEqual(expected);
    });

    it('should preserve null and undefined values', () => {
      expect(toCamelCase(null)).toBeNull();
      expect(toCamelCase(undefined)).toBeUndefined();

      const input = { key_one: null, key_two: undefined };
      const expected = { keyOne: null, keyTwo: undefined };
      expect(toCamelCase(input)).toEqual(expected);
    });

    it('should handle deep structures (stack control)', () => {
      const deepInput: Record<string, unknown> = {
        level_1: {
          level_2: {
            level_3: {
              level_4: { level_5: { deep_key: 'value' } },
            },
          },
        },
      };
      const deepExpected: Record<string, unknown> = {
        level1: {
          level2: {
            level3: { level4: { level5: { deepKey: 'value' } } },
          },
        },
      };
      expect(toCamelCase(deepInput)).toEqual(deepExpected);
    });
  });

  describe('toSnakeCase', () => {
    it('should convert userId to user_id', () => {
      const input = { userId: 1, firstName: 'John' };
      const expected = { user_id: 1, first_name: 'John' };
      expect(toSnakeCase(input)).toEqual(expected);
    });

    it('should handle complex combinations of arrays and objects', () => {
      const input = {
        userList: [{ userId: 1, metaData: { lastLogin: '2023-01-01' } }],
      };
      const expected = {
        user_list: [{ user_id: 1, meta_data: { last_login: '2023-01-01' } }],
      };
      expect(toSnakeCase(input)).toEqual(expected);
    });
  });

  describe('slugify', () => {
    it('should correctly convert Turkish characters', () => {
      const text = 'ğüşiöç ĞÜŞİÖÇ';
      const expected = 'gusioc-gusioc';
      expect(slugify(text)).toBe(expected);
    });

    it('should convert spaces to hyphens and clean double hyphens', () => {
      const text = 'Hello   World -- Test';
      const expected = 'hello-world-test';
      expect(slugify(text)).toBe(expected);
    });

    it('should handle special characters and trim', () => {
      const text = '  !Hello World!  ';
      const expected = 'hello-world';
      expect(slugify(text)).toBe(expected);
    });
  });

  describe('formatDuration', () => {
    it('should format 2.5 to "2 sa 30 dk"', () => {
      expect(formatDuration(2.5)).toBe('2 sa 30 dk');
    });

    it('should format 0.75 to "0 sa 45 dk"', () => {
      expect(formatDuration(0.75)).toBe('0 sa 45 dk');
    });

    it('should format integers correctly', () => {
      expect(formatDuration(2)).toBe('2 sa 0 dk');
    });
  });

  describe('cn', () => {
    it('should merge tailwind classes without conflict', () => {
      // Basic merging
      expect(cn('px-2', 'py-2')).toBe('px-2 py-2');

      // Tailwind merge conflict resolution
      expect(cn('px-2', 'px-4')).toBe('px-4');

      // Conditional classes
      expect(cn('text-red-500', 'bg-blue-500')).toBe(
        'text-red-500 bg-blue-500'
      );
    });
  });
});
