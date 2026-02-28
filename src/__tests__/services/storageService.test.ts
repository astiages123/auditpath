// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { storage } from '../../shared/services/storageService';

// Manual localStorage mock for environment consistency
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('storageService', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('1. Veriyi doğru formatta saklar (timestamp ile)', () => {
    const testData = { foo: 'bar' };
    storage.set('test-key', testData);

    const raw = localStorage.getItem('auditpath_test-key');
    const parsed = JSON.parse(raw!);

    expect(parsed.value).toEqual(testData);
    expect(parsed.timestamp).toBeDefined();
  });

  it('2. Saklanan veriyi başarıyla geri okur', () => {
    const testData = { hello: 'world' };
    storage.set('test-key', testData);

    const result = storage.get('test-key');
    expect(result).toEqual(testData);
  });

  it('3. Süresi dolmuş veriyi siler ve null döner', () => {
    const testData = { old: 'data' };
    const now = Date.now();

    // Manual inject expired data
    const item = {
      value: testData,
      timestamp: now - 25 * 60 * 60 * 1000, // 25 hours ago (TTL is 24)
    };
    localStorage.setItem('auditpath_expired', JSON.stringify(item));

    const result = storage.get('expired');
    expect(result).toBeNull();
    expect(localStorage.getItem('auditpath_expired')).toBeNull();
  });

  it('4. Belirtilen anahtara sahip veriyi siler', () => {
    storage.set('to-delete', 'value');
    storage.remove('to-delete');
    expect(storage.get('to-delete')).toBeNull();
  });

  it('5. cleanup fonksiyonu tüm süresi dolmuş verileri temizler', () => {
    const now = Date.now();
    const ttlMs = 24 * 60 * 60 * 1000;

    // One valid, one expired
    localStorage.setItem(
      'auditpath_valid',
      JSON.stringify({ value: 'ok', timestamp: now })
    );
    localStorage.setItem(
      'auditpath_old',
      JSON.stringify({ value: 'old', timestamp: now - ttlMs - 1000 })
    );

    storage.cleanup();

    expect(localStorage.getItem('auditpath_valid')).not.toBeNull();
    expect(localStorage.getItem('auditpath_old')).toBeNull();
  });
});
