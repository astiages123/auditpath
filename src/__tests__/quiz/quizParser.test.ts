import { describe, expect, it } from 'vitest';
import {
  determineNodeStrategy,
  parseJsonResponse,
} from '../../features/quiz/logic/quizParser';

describe('quizParser - Testleri', () => {
  describe('parseJsonResponse', () => {
    it('1. Temiz bir JSON objesini başarıyla ayrıştırır', () => {
      const input = '{"test": "ok"}';
      expect(parseJsonResponse(input, 'object')).toEqual({ test: 'ok' });
    });

    it('2. Markdown blokları içindeki JSONu ayıklar', () => {
      const input = 'Metin... ```json\n{"val": 1}\n```';
      expect(parseJsonResponse(input, 'object')).toEqual({ val: 1 });
    });

    it('3. <think> bloklarını başarıyla temizler', () => {
      const input = '<think>Analiz yapıyorum...</think>{"status": "ready"}';
      expect(parseJsonResponse(input, 'object')).toEqual({
        status: 'ready',
      });
    });

    it('4. LaTeX backslash (\\) karakterlerini kaçış karakterine çevirir', () => {
      const input = '{"math": "x = \\frac{1}{2}"}';
      // parseJsonResponse içindeki regex \\ -> \\\\ çeviriyor
      const result = parseJsonResponse(input, 'object') as { math: string };
      expect(result.math).toBe('x = \\frac{1}{2}');
    });

    it('5. Yarım kalmış (truncated) JSONları deneme-yanılma ile kurtarır', () => {
      const input = '{"title": "Eksik"'; // Kapanış parantezi yok
      const result = parseJsonResponse(input, 'object');
      expect(result).toEqual({ title: 'Eksik' });
    });

    it('6. Array tipinde veri beklerken doğru ayrıştırma yapar', () => {
      const input = '[{"id": 1}, {"id": 2}]';
      expect(parseJsonResponse(input, 'array')).toHaveLength(2);
    });
  });

  describe('determineNodeStrategy', () => {
    it('7. Kavram haritasındaki seviyeye göre doğru Bloom seviyesini döner', () => {
      expect(
        determineNodeStrategy(0, {
          baslik: '',
          odak: '',
          seviye: 'Analiz',
          gorsel: null,
        }).bloomLevel
      ).toBe('analysis');
      expect(
        determineNodeStrategy(0, {
          baslik: '',
          odak: '',
          seviye: 'Uygulama',
          gorsel: null,
        }).bloomLevel
      ).toBe('application');
      expect(
        determineNodeStrategy(0, {
          baslik: '',
          odak: '',
          seviye: 'Bilgi',
          gorsel: null,
        }).bloomLevel
      ).toBe('knowledge');
    });

    it('8. Seviye verilmediğinde kategori bazlı dağılıma döner', () => {
      // Default kategori için 0. index 'knowledge' olabilir (dağılıma bağlı)
      const strategy = determineNodeStrategy(0, undefined, 'Genel Muhasebe');
      expect(strategy).toHaveProperty('bloomLevel');
      expect(strategy).toHaveProperty('instruction');
    });
  });
});
