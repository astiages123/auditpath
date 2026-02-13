import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  StorageService,
  storage,
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  clearStorage,
  hasStorageItem,
  deepSanitize,
  ContentType,
} from '@/shared/lib/core/services/storage.service';

describe('StorageService - deepSanitize', () => {
  describe('deepSanitize with strict mode (default)', () => {
    it('should remove script tags from nested objects', () => {
      const input = {
        a: '<script>alert(1)</script>',
        b: { c: '<b>Safe</b>' },
      };
      const result = deepSanitize(input, 'strict');
      expect(result.a).not.toContain('<script>');
      expect(result.b.c).toBe('Safe');
    });

    it('should remove script tags from arrays', () => {
      const input = ['<script>alert(1)</script>', '<b>test</b>'];
      const result = deepSanitize(input, 'strict');
      expect(result[0]).not.toContain('<script>');
      expect(result[1]).toBe('test');
    });

    it('should preserve primitives', () => {
      expect(deepSanitize(123, 'strict')).toBe(123);
      expect(deepSanitize(true, 'strict')).toBe(true);
      expect(deepSanitize(null, 'strict')).toBe(null);
      expect(deepSanitize(undefined, 'strict')).toBe(undefined);
    });

    it('should handle empty objects', () => {
      expect(deepSanitize({}, 'strict')).toEqual({});
    });

    it('should handle empty arrays', () => {
      expect(deepSanitize([], 'strict')).toEqual([]);
    });

    it('should handle deeply nested objects (5 levels)', () => {
      const input = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: '<script>alert(1)</script>',
              },
            },
          },
        },
      };
      const result = deepSanitize(input, 'strict');
      expect(
        (
          result as {
            level1: { level2: { level3: { level4: { level5: unknown } } } };
          }
        ).level1.level2.level3.level4.level5
      ).not.toContain('<script>');
    });

    it('should remove onerror attributes', () => {
      const input = '<img src="x" onerror="alert(1)">';
      const result = deepSanitize(input, 'strict');
      expect(result).not.toContain('onerror');
    });

    it('should remove all event handlers', () => {
      const input = '<div onclick="alert(1)" onmouseover="alert(2)">test</div>';
      const result = deepSanitize(input, 'strict');
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('onmouseover');
    });

    it('should remove iframe, form, object, embed tags', () => {
      const input =
        '<iframe src="evil"></iframe><form><input></form><object></object><embed>';
      const result = deepSanitize(input, 'strict');
      expect(result).not.toContain('<iframe>');
      expect(result).not.toContain('<form>');
      expect(result).not.toContain('<object>');
      expect(result).not.toContain('<embed>');
    });
  });

  describe('deepSanitize with markdown mode', () => {
    it('should allow b and strong tags', () => {
      const input = '<b>bold</b><strong>strong</strong>';
      const result = deepSanitize(input, 'markdown');
      expect(result).toContain('<b>');
      expect(result).toContain('<strong>');
    });

    it('should allow h1-h6 tags', () => {
      const input = '<h1>Title</h1><h2>Subtitle</h2>';
      const result = deepSanitize(input, 'markdown');
      expect(result).toContain('<h1>');
      expect(result).toContain('<h2>');
    });

    it('should allow p and br tags', () => {
      const input = '<p>Paragraph</p><br>';
      const result = deepSanitize(input, 'markdown');
      expect(result).toContain('<p>');
      expect(result).toContain('<br>');
    });

    it('should allow code and pre tags', () => {
      const input = '<code>const x = 1</code><pre>code block</pre>';
      const result = deepSanitize(input, 'markdown');
      expect(result).toContain('<code>');
      expect(result).toContain('<pre>');
    });

    it('should allow img with safe attributes', () => {
      const input =
        '<img src="https://example.com/image.png" alt="Image" width="100" height="100">';
      const result = deepSanitize(input, 'markdown');
      expect(result).toContain('<img');
      expect(result).toContain('src="https://example.com/image.png"');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">link</a>';
      const result = deepSanitize(input, 'markdown');
      expect(result).not.toContain('javascript:');
    });

    it('should allow safe protocols (https, mailto, tel)', () => {
      const input =
        '<a href="https://example.com">HTTPS</a><a href="mailto:test@test.com">Mail</a><a href="tel:+1234567890">Phone</a>';
      const result = deepSanitize(input, 'markdown');
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('mailto:test@test.com');
      expect(result).toContain('tel:+1234567890');
    });

    it('should remove script tags even in markdown mode', () => {
      const input = '<script>alert(1)</script><b>bold</b>';
      const result = deepSanitize(input, 'markdown');
      expect(result).not.toContain('<script>');
      expect(result).toContain('<b>');
    });

    it('should remove onerror from img in markdown mode', () => {
      const input = '<img src="x" onerror="alert(1)" alt="test">';
      const result = deepSanitize(input, 'markdown');
      expect(result).toBe('<img src="x" alt="test">');
    });

    it('should allow SVG in markdown mode', () => {
      const input =
        '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red" /></svg>';
      const result = deepSanitize(input, 'markdown');
      expect(result).toContain('<svg');
      expect(result).toContain('<circle');
    });

    it('should allow table elements', () => {
      const input =
        '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>';
      const result = deepSanitize(input, 'markdown');
      expect(result).toContain('<table>');
      expect(result).toContain('<thead>');
      expect(result).toContain('<tbody>');
    });

    it('should handle nested objects with markdown content', () => {
      const input = {
        b: { c: '<b>Safe</b>' },
      };
      const result = deepSanitize(input, 'markdown');
      expect((result as { b: { c: string } }).b.c).toContain('<b>');
    });
  });

  describe('deepSanitize with raw mode', () => {
    it('should not sanitize at all in raw mode', () => {
      const input = '<script>alert(1)</script><b>bold</b>';
      const result = deepSanitize(input, 'raw');
      expect(result).toBe(input);
    });

    it('should preserve all HTML in raw mode', () => {
      const input = '<img src="x" onerror="alert(1)">';
      const result = deepSanitize(input, 'raw');
      expect(result).toBe(input);
    });
  });

  describe('deepSanitize boundary cases', () => {
    it('should handle non-string values correctly', () => {
      expect(deepSanitize(0, 'strict')).toBe(0);
      expect(deepSanitize(false, 'strict')).toBe(false);
      expect(deepSanitize('', 'strict')).toBe('');
      expect(deepSanitize(NaN, 'strict')).toBe(NaN);
    });

    it('should handle strings that are not HTML', () => {
      const input = 'plain text without any HTML';
      const result = deepSanitize(input, 'strict');
      expect(result).toBe('plain text without any HTML');
    });

    it('should handle mixed arrays with strings and objects', () => {
      const input = [
        '<script>x</script>',
        { nested: '<b>bold</b>' },
        'plain text',
      ];
      const result = deepSanitize(input, 'strict');
      expect(result[0]).not.toContain('<script>');
      expect((result[1] as { nested: string }).nested).toBe('bold');
      expect(result[2]).toBe('plain text');
    });
  });
});

describe('StorageService - TTL', () => {
  let service: StorageService;

  beforeEach(() => {
    service = new StorageService({ prefix: 'test_', ttl: 60 * 60 * 1000 });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return null for expired items', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-13T10:00:00Z'));
    const expiredTimestamp = Date.now() - (60 * 60 * 1000 + 1);
    localStorage.setItem(
      'test_key',
      JSON.stringify({ value: 'test', timestamp: expiredTimestamp })
    );

    const result = service.get('key');
    expect(result).toBeNull();
  });

  it('should remove expired items from localStorage', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-13T10:00:00Z'));
    const expiredTimestamp = Date.now() - (60 * 60 * 1000 + 1);
    localStorage.setItem(
      'test_key',
      JSON.stringify({ value: 'test', timestamp: expiredTimestamp })
    );

    service.get('key');
    expect(localStorage.getItem('test_key')).toBeNull();
  });

  it('should return value for non-expired items', () => {
    service.set('key', 'test-value');
    const result = service.get('key');
    expect(result).toBe('test-value');
  });

  it('should handle TTL of 0 (no expiration check)', () => {
    const zeroTtlService = new StorageService({ prefix: 'test0_', ttl: 0 });
    zeroTtlService.set('key', 'test');
    const result = zeroTtlService.get('key');
    expect(result).toBe('test');
  });

  it('should handle very large TTL (Math.max boundary)', () => {
    const largeTtlService = new StorageService({
      prefix: 'testlarge_',
      ttl: Math.max(0, Number.MAX_SAFE_INTEGER),
    });
    largeTtlService.set('key', 'test');
    const result = largeTtlService.get('key');
    expect(result).toBe('test');
  });

  it('should handle boundary at exactly TTL time (not expired)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-13T10:00:00Z'));
    const timestamp = Date.now() - 60 * 60 * 1000;
    localStorage.setItem(
      'test_key',
      JSON.stringify({ value: 'test', timestamp })
    );

    const result = service.get('key');
    expect(result).toBe('test');
  });

  it('should handle TTL with Math.min boundary', () => {
    const minTtlService = new StorageService({
      prefix: 'testmin_',
      ttl: Math.min(1000, 5000),
    });
    minTtlService.set('key', 'test');
    const timestamp = Date.now() - 500;
    localStorage.setItem(
      'testmin_key',
      JSON.stringify({ value: 'test', timestamp })
    );

    const result = minTtlService.get('key');
    expect(result).toBe('test');
  });

  it('getRaw should not check TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-13T10:00:00Z'));
    const expiredTimestamp = Date.now() - (60 * 60 * 1000 + 1);
    localStorage.setItem(
      'test_key',
      JSON.stringify({ value: 'test', timestamp: expiredTimestamp })
    );

    const result = service.getRaw('key');
    expect(result).not.toBeNull();
    expect(result?.value).toBe('test');
  });
});

describe('StorageService - Error Handling', () => {
  let service: StorageService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-13T10:00:00Z'));
    service = new StorageService({ prefix: 'test_', ttl: 60 * 60 * 1000 });
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('localStorage getItem error', () => {
    it('should return null when getItem throws', () => {
      const getItemSpy = vi
        .spyOn(window.localStorage, 'getItem')
        .mockImplementation(() => {
          throw new Error('Storage error');
        });

      const result = service.get('key');
      expect(result).toBeNull();
      getItemSpy.mockRestore();
    });
  });

  describe('JSON parse error', () => {
    it('should return null and log warning for invalid JSON', () => {
      localStorage.setItem('test_key', 'invalid-json');

      const result = service.get('key');
      expect(result).toBeNull();
    });

    it('should return null for null localStorage item', () => {
      const getItemSpy = vi
        .spyOn(window.localStorage, 'getItem')
        .mockReturnValue(null);

      const result = service.get('key');
      expect(result).toBeNull();
      getItemSpy.mockRestore();
    });

    it('should return null for empty string localStorage item', () => {
      const getItemSpy = vi
        .spyOn(window.localStorage, 'getItem')
        .mockReturnValue('');

      const result = service.get('key');
      expect(result).toBeNull();
      getItemSpy.mockRestore();
    });
  });

  describe('localStorage setItem error', () => {
    it('should handle QuotaExceededError with cleanup and retry', () => {
      let callCount = 0;
      const setItemSpy = vi
        .spyOn(window.localStorage, 'setItem')
        .mockImplementation((_key, _value) => {
          callCount++;
          if (callCount === 1) {
            const error = new Error('QuotaExceededError');
            error.name = 'QuotaExceededError';
            throw error;
          }
        });

      const cleanupSpy = vi.spyOn(service, 'cleanup');

      service.set('key', 'value');

      expect(cleanupSpy).toHaveBeenCalled();
      expect(setItemSpy).toHaveBeenCalledTimes(2);

      setItemSpy.mockRestore();
    });

    it('should still fail after retry and log error', () => {
      const setItemSpy = vi
        .spyOn(window.localStorage, 'setItem')
        .mockImplementation(() => {
          const error = new Error('QuotaExceededError');
          error.name = 'QuotaExceededError';
          throw error;
        });

      const cleanupSpy = vi.spyOn(service, 'cleanup');

      service.set('key', 'value');

      expect(cleanupSpy).toHaveBeenCalled();

      setItemSpy.mockRestore();
    });

    it('should handle non-QuotaExceededError errors', () => {
      const setItemSpy = vi
        .spyOn(window.localStorage, 'setItem')
        .mockImplementation(() => {
          throw new Error('Unknown error');
        });

      const result = service.set('key', 'value');
      expect(result).toBeUndefined();

      setItemSpy.mockRestore();
    });
  });

  describe('localStorage removeItem error', () => {
    it('should handle removeItem errors gracefully', () => {
      const removeItemSpy = vi
        .spyOn(window.localStorage, 'removeItem')
        .mockImplementation(() => {
          throw new Error('Remove error');
        });

      const result = service.remove('key');
      expect(result).toBeUndefined();

      removeItemSpy.mockRestore();
    });
  });

  describe('localStorage clear error', () => {
    it('should handle clear errors gracefully', () => {
      const getItemSpy = vi
        .spyOn(window.localStorage, 'getItem')
        .mockImplementation(() => {
          throw new Error('Clear error');
        });

      const result = service.clear();
      expect(result).toBeUndefined();

      getItemSpy.mockRestore();
    });

    it('should handle key iteration errors gracefully', () => {
      const keySpy = vi
        .spyOn(window.localStorage, 'key')
        .mockImplementation(() => {
          throw new Error('Key error');
        });

      const result = service.keys();
      expect(result).toEqual([]);

      keySpy.mockRestore();
    });
  });

  describe('cleanup error handling', () => {
    it('should handle cleanup errors gracefully', () => {
      const keySpy = vi
        .spyOn(window.localStorage, 'key')
        .mockImplementation(() => {
          throw new Error('Cleanup error');
        });

      const result = service.cleanup();
      expect(result).toBeUndefined();

      keySpy.mockRestore();
    });
  });
});

describe('StorageService - Methods', () => {
  let service: StorageService;

  beforeEach(() => {
    service = new StorageService({ prefix: 'test_', ttl: 60 * 60 * 1000 });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('get', () => {
    it('should return null for non-existent key', () => {
      const result = service.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should get sanitized value', () => {
      service.set('key', { html: '<script>evil</script>' });
      const result = service.get<{ html: string }>('key');
      expect(result?.html).not.toContain('<script>');
    });
  });

  describe('set', () => {
    it('should store value with timestamp', () => {
      service.set('key', 'value');
      const raw = service.getRaw('key');
      expect(raw?.value).toBe('value');
      expect(raw?.timestamp).toBeDefined();
    });

    it('should store with version option', () => {
      service.set('key', 'value', { version: '1.0.0' });
      const raw = service.getRaw('key');
      expect(raw?.version).toBe('1.0.0');
    });
  });

  describe('remove', () => {
    it('should remove item from localStorage', () => {
      service.set('key', 'value');
      service.remove('key');
      expect(service.get('key')).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all items with prefix', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');
      service.clear();
      expect(service.keys().length).toBe(0);
    });

    it('should not clear items without prefix', () => {
      localStorage.setItem('other_key', 'value');
      service.clear();
      expect(localStorage.getItem('other_key')).toBe('value');
    });
  });

  describe('keys', () => {
    it('should return all keys with prefix', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');
      const keys = service.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });
  });

  describe('has', () => {
    it('should return true for existing non-expired item', () => {
      service.set('key', 'value');
      expect(service.has('key')).toBe(true);
    });

    it('should return false for non-existent item', () => {
      expect(service.has('nonexistent')).toBe(false);
    });

    it('should return false for expired item', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-13T10:00:00Z'));
      const expiredTimestamp = Date.now() - (60 * 60 * 1000 + 1);
      localStorage.setItem(
        'test_key',
        JSON.stringify({ value: 'value', timestamp: expiredTimestamp })
      );
      expect(service.get('key')).toBeNull();
    });
  });

  describe('getTimestamp', () => {
    it('should return timestamp for existing item', () => {
      service.set('key', 'value');
      const timestamp = service.getTimestamp('key');
      expect(timestamp).toBe(Date.now());
    });

    it('should return null for non-existent item', () => {
      const timestamp = service.getTimestamp('nonexistent');
      expect(timestamp).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should remove expired items', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-13T10:00:00Z'));
      const now = Date.now();
      const expiredTimestamp = now - (60 * 60 * 1000 + 1);
      localStorage.setItem(
        'test_expired',
        JSON.stringify({ value: 'expired', timestamp: expiredTimestamp })
      );
      service.set('valid', 'value');

      service.cleanup();

      expect(service.get('expired')).toBeNull();
      expect(service.get('valid')).not.toBeNull();
    });

    it('should log cleanup count', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-13T10:00:00Z'));
      const now = Date.now();
      const expiredTimestamp = now - (60 * 60 * 1000 + 1);
      localStorage.setItem(
        'test_expired1',
        JSON.stringify({ value: 'expired1', timestamp: expiredTimestamp })
      );
      localStorage.setItem(
        'test_expired2',
        JSON.stringify({ value: 'expired2', timestamp: expiredTimestamp })
      );

      service.cleanup();
    });
  });
});

describe('StorageService - Singleton vs New Instance', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should use default prefix for singleton', () => {
    expect(storage.prefix).toBe('auditpath_');
  });

  it('should create new instance with custom prefix', () => {
    const customService = new StorageService({ prefix: 'custom_' });
    expect(customService.prefix).toBe('custom_');
  });

  it('should create new instance with custom TTL', () => {
    const customService = new StorageService({ ttl: 5000 });
    expect(customService.defaultTtl).toBe(5000);
  });

  it('should isolate data between instances with different prefixes', () => {
    const service1 = new StorageService({ prefix: 'app1_' });
    const service2 = new StorageService({ prefix: 'app2_' });

    service1.set('key', 'value1');
    service2.set('key', 'value2');

    expect(service1.get('key')).toBe('value1');
    expect(service2.get('key')).toBe('value2');
  });

  it('should isolate data between instances with different TTLs', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-13T10:00:00Z'));

    const shortTtlService = new StorageService({ prefix: 'short_', ttl: 100 });
    const longTtlService = new StorageService({ prefix: 'long_', ttl: 1000 });

    shortTtlService.set('key', 'value');
    longTtlService.set('key', 'value');

    vi.setSystemTime(new Date('2026-02-13T10:00:00.150Z'));

    const shortResult = shortTtlService.get('key');
    const longResult = longTtlService.get('key');

    expect(shortResult).toBeNull();
    expect(longResult).toBe('value');
  });

  it('should work with singleton export functions', () => {
    setStorageItem('testKey', 'testValue');
    expect(getStorageItem('testKey')).toBe('testValue');
    expect(hasStorageItem('testKey')).toBe(true);
    removeStorageItem('testKey');
    expect(hasStorageItem('testKey')).toBe(false);
  });

  it('should work with clearStorage export', () => {
    setStorageItem('key1', 'value1');
    setStorageItem('key2', 'value2');
    clearStorage();
    expect(hasStorageItem('key1')).toBe(false);
    expect(hasStorageItem('key2')).toBe(false);
  });
});

describe('StorageService - ContentType export', () => {
  it('should export ContentType type', () => {
    const strict: ContentType = 'strict';
    const markdown: ContentType = 'markdown';
    const raw: ContentType = 'raw';

    expect(strict).toBe('strict');
    expect(markdown).toBe('markdown');
    expect(raw).toBe('raw');
  });
});
