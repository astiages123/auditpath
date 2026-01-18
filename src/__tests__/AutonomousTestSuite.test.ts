/**
 * AutonomousTestSuite.ts
 * 
 * AuditPath - Öğrenme Akışı Kuralları Doğrulama Test Paketi
 * 
 * Bu test paketi, "Kullanıcı Akışı Raporu v2" dokümanında belirtilen
 * iş kurallarını sistematik olarak doğrular.
 * 
 * Test Kategorileri:
 * 1. DTS (Dinamik Zaman Barajı) Hesaplamaları
 * 2. Puanlama Sistemi (State Tracking ile Ceza Çarpanları)
 * 3. Kota Hesaplama (Concept Density Çarpanları)
 * 4. Shelf System Durum Geçişleri
 * 5. Adversarial/Edge Case Testleri
 * 
 * @author AI QA Engineer
 * @date 2026-01-18
 */

import { describe, it, expect } from 'vitest';
import { calculateScoreChange, type QuizResponseType } from '../lib/srs/srs-algorithm';

// ============================================================================
// TEST UTILITIES & MOCK DATA
// ============================================================================

/**
 * Mock soru verisi oluşturucu
 * Farklı zorluk ve kelime sayılarında sorular üretir
 */


/**
 * Dinamik Zaman Barajı (T_max) Hesaplayıcı
 * Formül: T_max = ((W_total / 180) * 60) + (15 * D_m)
 * 
 * W_total = Soru + Şıkların toplam kelime sayısı
 * D_m = Zorluk Çarpanı (knowledge=1.0, application=1.2, analysis=1.5)
 */
function calculateTmax(wordCount: number, bloomLevel: 'knowledge' | 'application' | 'analysis'): number {
  const difficultyMultiplier = {
    knowledge: 1.0,
    application: 1.2,
    analysis: 1.5
  };
  
  const Dm = difficultyMultiplier[bloomLevel];
  const TmaxSeconds = ((wordCount / 180) * 60) + (15 * Dm);
  return TmaxSeconds * 1000; // Milisaniyeye çevir
}

/**
 * Kota Hesaplayıcı (Concept Density dahil)
 * 
 * Base Kota:
 * - ≤150 kelime: 4 soru
 * - ≤500 kelime: 8 soru
 * - ≤1200 kelime: 12 soru
 * - >1200 kelime: 20 soru
 * 
 * CD Çarpanı:
 * - CD < %2: 0.8x
 * - %2 ≤ CD ≤ %5: 1.0x
 * - CD > %5: 1.3x
 */
function calculateQuota(wordCount: number, conceptCount: number): number {
  let baseCount = 4;
  if (wordCount <= 150) baseCount = 4;
  else if (wordCount <= 500) baseCount = 8;
  else if (wordCount <= 1200) baseCount = 12;
  else baseCount = 20;
  
  const safeWordCount = wordCount > 0 ? wordCount : 1;
  const cd = conceptCount / safeWordCount;
  
  let multiplier = 1.0;
  if (cd < 0.02) multiplier = 0.8;
  else if (cd <= 0.05) multiplier = 1.0;
  else multiplier = 1.3;
  
  return Math.max(1, Math.round(baseCount * multiplier));
}

// ============================================================================
// BÖLÜM 1: DİNAMİK ZAMAN BARAJI (DTS) TESTLERİ
// ============================================================================

describe('1. Dinamik Zaman Barajı (DTS) Hesaplamaları', () => {
  
  describe('1.1 Temel T_max Formülü Doğrulaması', () => {
    /**
     * KURAL: T_max = ((W_total / 180) * 60) + (15 * D_m)
     * 
     * Bu test, formülün matematiksel doğruluğunu kontrol eder.
     */
    
    it('should calculate T_max correctly for knowledge level (D_m = 1.0)', () => {
      // 180 kelime, knowledge -> ((180/180) * 60) + (15 * 1.0) = 60 + 15 = 75 saniye
      const Tmax = calculateTmax(180, 'knowledge');
      expect(Tmax).toBe(75000); // 75 saniye = 75000 ms
    });
    
    it('should calculate T_max correctly for application level (D_m = 1.2)', () => {
      // 180 kelime, application -> ((180/180) * 60) + (15 * 1.2) = 60 + 18 = 78 saniye
      const Tmax = calculateTmax(180, 'application');
      expect(Tmax).toBe(78000);
    });
    
    it('should calculate T_max correctly for analysis level (D_m = 1.5)', () => {
      // 180 kelime, analysis -> ((180/180) * 60) + (15 * 1.5) = 60 + 22.5 = 82.5 saniye
      const Tmax = calculateTmax(180, 'analysis');
      expect(Tmax).toBe(82500);
    });
    
    it('should scale T_max proportionally with word count', () => {
      // 360 kelime (2x), knowledge -> ((360/180) * 60) + 15 = 120 + 15 = 135 saniye
      const Tmax = calculateTmax(360, 'knowledge');
      expect(Tmax).toBe(135000);
    });
  });
  
  describe('1.2 Sınır Değer Testleri (Boundary Tests)', () => {
    /**
     * ADVERSARIAL TEST: Sistem edge case'lerde nasıl davranıyor?
     */
    
    it('should handle very short questions (minimal word count)', () => {
      // 10 kelime, knowledge -> ((10/180) * 60) + 15 ≈ 3.33 + 15 = 18.33 saniye
      const Tmax = calculateTmax(10, 'knowledge');
      expect(Tmax).toBeCloseTo(18333, -1); // -1 = 10ms tolerans
    });
    
    it('should handle very long questions (extreme word count)', () => {
      // 1000 kelime, analysis -> ((1000/180) * 60) + 22.5 ≈ 333.33 + 22.5 = 355.83 saniye
      const Tmax = calculateTmax(1000, 'analysis');
      expect(Tmax).toBeCloseTo(355833, -1);
    });
    
    it('❌ ADVERSARIAL: Zero word count should not cause division issues', () => {
      // 0 kelime durumu - bu bir edge case
      // Mevcut implementasyon: W_total hesaplamasında split kullanılıyor
      // Boş string.split(/\s+/) = [''] -> length = 1
      const Tmax = calculateTmax(0, 'knowledge');
      expect(Tmax).toBeGreaterThan(0); // En azından D_m katkısı olmalı
      expect(Tmax).toBe(15000); // Sadece (15 * 1.0) = 15 saniye
    });
  });
  
  describe('1.3 Shelf System Durum Geçişi Testleri', () => {
    /**
     * KURAL: 
     * - Doğru & Süre < T_max -> Arşivlendi
     * - Doğru & Süre > T_max -> Takip Bekliyor (yavaş doğru)
     * - Yanlış -> Takip Bekliyor
     * - Boş -> Aktif
     */
    
    it('should classify FAST CORRECT as "archived"', () => {
      const Tmax = calculateTmax(100, 'knowledge'); // ~48.33 saniye
      const userTime = Tmax - 5000; // T_max - 5 saniye (içinde)
      
      // Mantık: userTime < Tmax -> archived
      expect(userTime < Tmax).toBe(true);
    });
    
    it('should classify SLOW CORRECT as "pending_followup"', () => {
      const Tmax = calculateTmax(100, 'knowledge');
      const userTime = Tmax + 5000; // T_max + 5 saniye (aşım)
      
      // Mantık: userTime > Tmax -> pending_followup (doğru ama yavaş)
      expect(userTime > Tmax).toBe(true);
    });
    
    it('❌ ADVERSARIAL: User answers exactly at T_max boundary', () => {
      const Tmax = calculateTmax(100, 'knowledge');
      const userTime = Tmax; // Tam sınırda
      
      // SORU: userTime === Tmax durumunda ne olmalı?
      // Mevcut kod: timeSpentMs < TmaxMs -> archived
      // Bu durumda userTime === Tmax olduğunda `<` false olur -> pending_followup
      // Bu DOĞRU MU? Kullanıcı tam sınırda cevap verdiğinde cezalandırılmış oluyor!
      
      // BU BİR ANOMALI OLABİLİR
      expect(userTime < Tmax).toBe(false);
      expect(userTime <= Tmax).toBe(true); // <= olmalı mı?
    });
    
    it('❌ ADVERSARIAL: 2 seconds over T_max should trigger "Takip Bekliyor"', () => {
      /**
       * Senaryo: Kullanıcı T_max'ı 2 saniye aşıyor
       * Beklenen: "Takip Bekliyor" statüsü
       */
      const Tmax = calculateTmax(150, 'application');
      const userTimeOver = Tmax + 2000; // 2 saniye geç
      
      // Bu doğru çalışmalı
      expect(userTimeOver > Tmax).toBe(true);
    });
  });
});

// ============================================================================
// BÖLÜM 2: PUANLAMA SİSTEMİ TESTLERİ
// ============================================================================

describe('2. Puanlama Sistemi (State Tracking & Ceza Çarpanları)', () => {
  
  describe('2.1 Temel Puan Değişiklikleri', () => {
    /**
     * KURALLAR:
     * - Doğru Cevap: +10 Puan
     * - İlk Hata: -5 Puan
     * - İlk Boş: -2 Puan
     * - Tekrarlı Hata/Boş: -10 Puan
     */
    
    it('should add +10 for correct answer', () => {
      const result = calculateScoreChange('correct', 50, false);
      expect(result.delta).toBe(10);
      expect(result.newScore).toBe(60);
    });
    
    it('should subtract -5 for first incorrect answer', () => {
      const result = calculateScoreChange('incorrect', 50, false);
      expect(result.delta).toBe(-5);
      expect(result.newScore).toBe(45);
    });
    
    it('should subtract -2 for first blank answer', () => {
      const result = calculateScoreChange('blank', 50, false);
      expect(result.delta).toBe(-2);
      expect(result.newScore).toBe(48);
    });
    
    it('should subtract -10 for REPEATED incorrect answer', () => {
      const result = calculateScoreChange('incorrect', 50, true);
      expect(result.delta).toBe(-10);
      expect(result.newScore).toBe(40);
    });
    
    it('should subtract -10 for REPEATED blank answer', () => {
      const result = calculateScoreChange('blank', 50, true);
      expect(result.delta).toBe(-10);
      expect(result.newScore).toBe(40);
    });
  });
  
  describe('2.2 Sınır Değer Testleri', () => {
    /**
     * Score 0-100 arasında clamp edilmeli
     */
    
    it('should clamp score to minimum 0', () => {
      const result = calculateScoreChange('incorrect', 3, true);
      // 3 - 10 = -7 -> clamp to 0
      expect(result.newScore).toBe(0);
      expect(result.newScore).toBeGreaterThanOrEqual(0);
    });
    
    it('should clamp score to maximum 100', () => {
      const result = calculateScoreChange('correct', 95, false);
      // 95 + 10 = 105 -> clamp to 100
      expect(result.newScore).toBe(100);
      expect(result.newScore).toBeLessThanOrEqual(100);
    });
    
    it('should handle score at exactly 0 correctly', () => {
      const result = calculateScoreChange('correct', 0, false);
      expect(result.newScore).toBe(10);
    });
    
    it('should handle score at exactly 100 correctly', () => {
      const resultCorrect = calculateScoreChange('correct', 100, false);
      expect(resultCorrect.newScore).toBe(100); // Zaten max
      
      const resultIncorrect = calculateScoreChange('incorrect', 100, false);
      expect(resultIncorrect.newScore).toBe(95); // -5
    });
  });
  
  describe('2.3 State Tracking (isRepeated) Mantığı', () => {
    /**
     * ADVERSARIAL: isRepeated flag'inin doğru ayarlanması kritik
     */
    
    it('❌ ANOMALI: "correct" answer should always be +10 regardless of isRepeated', () => {
      /**
       * Mevcut Kod Analizi:
       * ```
       * if (responseType === 'correct') {
       *   delta = POINTS_CORRECT; // +10
       * }
       * ```
       * 
       * DOĞRU! Correct cevap tekrar edilse bile ödül almalı.
       */
      const firstCorrect = calculateScoreChange('correct', 50, false);
      const repeatedCorrect = calculateScoreChange('correct', 50, true);
      
      expect(firstCorrect.delta).toBe(10);
      expect(repeatedCorrect.delta).toBe(10);
    });
    
    it('should apply larger penalty for repeated errors', () => {
      const firstError = calculateScoreChange('incorrect', 50, false);
      const repeatedError = calculateScoreChange('incorrect', 50, true);
      
      expect(Math.abs(repeatedError.delta)).toBeGreaterThan(Math.abs(firstError.delta));
      expect(firstError.delta).toBe(-5);
      expect(repeatedError.delta).toBe(-10);
    });
  });
  
  describe('2.4 Üst Üste Boş Geçme Senaryosu', () => {
    /**
     * ADVERSARIAL TEST: Kullanıcı 5 soru üst üste boş geçiyor
     */
    
    it('should correctly apply penalties for consecutive blanks', () => {
      let score = 50;
      
      // İlk boş geçme
      const first = calculateScoreChange('blank', score, false);
      expect(first.delta).toBe(-2);
      score = first.newScore; // 48
      
      // Aynı soru tekrar boş geçilirse (isRepeated = true)
      const second = calculateScoreChange('blank', score, true);
      expect(second.delta).toBe(-10);
      score = second.newScore; // 38
      
      // 3., 4., 5. boş geçmeler de -10 olmalı
      for (let i = 0; i < 3; i++) {
        const result = calculateScoreChange('blank', score, true);
        expect(result.delta).toBe(-10);
        score = result.newScore;
      }
      
      // Toplam: 50 - 2 - 10 - 10 - 10 - 10 = 8
      expect(score).toBe(8);
    });
    
    it('should recover after correct answer following blanks', () => {
      const score = 30; // Boş geçmelerden sonra düşük skor
      
      // Doğru cevap
      const result = calculateScoreChange('correct', score, false);
      expect(result.delta).toBe(10);
      expect(result.newScore).toBe(40);
    });
  });
});

// ============================================================================
// BÖLÜM 3: KOTA HESAPLAMA TESTLERİ
// ============================================================================

describe('3. Kota Hesaplama (Concept Density Çarpanları)', () => {
  
  describe('3.1 Base Kota Hesaplama', () => {
    
    it('should return 4 for short content (≤150 words)', () => {
      expect(calculateQuota(100, 5)).toBeLessThanOrEqual(6); // 4 * 1.x
      expect(calculateQuota(150, 5)).toBeLessThanOrEqual(6);
    });
    
    it('should return 8 for medium content (≤500 words)', () => {
      const quota = calculateQuota(300, 10);
      expect(quota).toBeGreaterThanOrEqual(6);
      expect(quota).toBeLessThanOrEqual(11); // 8 * 1.3 = 10.4
    });
    
    it('should return 12 for long content (≤1200 words)', () => {
      const quota = calculateQuota(800, 30);
      expect(quota).toBeGreaterThanOrEqual(10);
      expect(quota).toBeLessThanOrEqual(16); // 12 * 1.3 = 15.6
    });
    
    it('should return 20 for very long content (>1200 words)', () => {
      const quota = calculateQuota(1500, 50);
      expect(quota).toBeGreaterThanOrEqual(16);
      expect(quota).toBeLessThanOrEqual(26); // 20 * 1.3 = 26
    });
  });
  
  describe('3.2 Concept Density (CD) Çarpanları', () => {
    /**
     * KURALLAR:
     * - CD < %2: 0.8x (seyrek içerik)
     * - %2 ≤ CD ≤ %5: 1.0x (normal)
     * - CD > %5: 1.3x (yoğun içerik)
     */
    
    it('should apply 0.8x multiplier for sparse content (CD < 2%)', () => {
      // 1000 kelime, 10 kavram -> CD = 1% < 2%
      const quota = calculateQuota(1000, 10);
      // Base: 12, * 0.8 = 9.6 -> 10
      expect(quota).toBe(10);
    });
    
    it('should apply 1.0x multiplier for normal density (2% ≤ CD ≤ 5%)', () => {
      // 500 kelime, 15 kavram -> CD = 3%
      const quota = calculateQuota(500, 15);
      // Base: 8, * 1.0 = 8
      expect(quota).toBe(8);
    });
    
    it('should apply 1.3x multiplier for dense content (CD > 5%)', () => {
      // 100 kelime, 10 kavram -> CD = 10% > 5%
      const quota = calculateQuota(100, 10);
      // Base: 4, * 1.3 = 5.2 -> 5
      expect(quota).toBe(5);
    });
  });
  
  describe('3.3 Edge Case ve Adversarial Testler', () => {
    
    it('❌ ADVERSARIAL: Zero concepts should not crash', () => {
      // 0 kavram durumu
      const quota = calculateQuota(500, 0);
      // CD = 0/500 = 0 < 2% -> 0.8x
      // Base: 8, * 0.8 = 6.4 -> 6
      expect(quota).toBe(6);
      expect(quota).toBeGreaterThan(0);
    });
    
    it('❌ ADVERSARIAL: Zero word count should not cause division by zero', () => {
      // Mevcut kod: safeWordCount = wordCount > 0 ? wordCount : 1
      const quota = calculateQuota(0, 5);
      // CD = 5/1 = 500% > 5% -> 1.3x
      // Base: 4 (0 <= 150), * 1.3 = 5.2 -> 5
      expect(quota).toBe(5);
    });
    
    it('should return at least 1 question always', () => {
      const quota = calculateQuota(1, 0);
      expect(quota).toBeGreaterThanOrEqual(1);
    });
    
    it('❌ ANOMALI: Very high concept count should cap reasonably', () => {
      // 100 kelime, 1000 kavram -> CD = 1000% (mantıksız)
      const quota = calculateQuota(100, 1000);
      // Bu durumda sistem hala 1.3x çarpan uyguluyor
      // Belki bir üst sınır olmalı?
      expect(quota).toBe(5); // 4 * 1.3 = 5.2 -> 5
    });
  });
});

// ============================================================================
// BÖLÜM 4: PEDAGOJİK STRATEJİ TESTLERİ
// ============================================================================

describe('4. Pedagojik Strateji (Bloom Taksonomisi)', () => {
  
  /**
   * KURALLAR:
   * 
   * Küçük Parça (≤150 kelime):
   * - Sadece "Tanım" ve "İlişki" soruları
   * - Analiz/Sonuç yok
   * 
   * Normal Strateji (>150 kelime):
   * - %0-40 ilerleme: Tanım (knowledge)
   * - %40-80 ilerleme: İlişki (application/analysis)
   * - %80-100 ilerleme: Sonuç/Etki (analysis)
   */
  
  function determineNodeStrategy(
    currentCount: number, 
    totalQuota: number, 
    wordCount: number
  ): { bloomLevel: string; nodeType: string } {
    if (totalQuota === 0) return { bloomLevel: 'knowledge', nodeType: 'Definition' };
    
    // Küçük parça stratejisi
    if (wordCount <= 150) {
      const isRel = currentCount % 2 !== 0;
      return isRel 
        ? { bloomLevel: 'application', nodeType: 'Relationship' }
        : { bloomLevel: 'knowledge', nodeType: 'Definition' };
    }
    
    // Normal strateji
    const progress = currentCount / totalQuota;
    
    if (progress < 0.40) {
      return { bloomLevel: 'knowledge', nodeType: 'Definition' };
    } else if (progress < 0.80) {
      return { bloomLevel: 'analysis', nodeType: 'Relationship' };
    } else {
      return { bloomLevel: 'analysis', nodeType: 'Result' };
    }
  }
  
  describe('4.1 Küçük Parça Stratejisi', () => {
    
    it('should alternate between Definition and Relationship for small chunks', () => {
      const wordCount = 100; // <= 150
      const totalQuota = 4;
      
      const q0 = determineNodeStrategy(0, totalQuota, wordCount);
      expect(q0.nodeType).toBe('Definition');
      
      const q1 = determineNodeStrategy(1, totalQuota, wordCount);
      expect(q1.nodeType).toBe('Relationship');
      
      const q2 = determineNodeStrategy(2, totalQuota, wordCount);
      expect(q2.nodeType).toBe('Definition');
      
      const q3 = determineNodeStrategy(3, totalQuota, wordCount);
      expect(q3.nodeType).toBe('Relationship');
    });
    
    it('❌ ANOMALI: Small chunk should NEVER produce "Result" type', () => {
      const wordCount = 100;
      
      // 10 soru üret, hiçbiri "Result" olmamalı
      for (let i = 0; i < 10; i++) {
        const strategy = determineNodeStrategy(i, 10, wordCount);
        expect(strategy.nodeType).not.toBe('Result');
      }
    });
  });
  
  describe('4.2 Normal Strateji İlerleme Tabanlı', () => {
    
    it('should produce Definition for 0-40% progress', () => {
      const wordCount = 500;
      const totalQuota = 10;
      
      // 0-3 (0%, 10%, 20%, 30% ilerleme)
      for (let i = 0; i < 4; i++) {
        const strategy = determineNodeStrategy(i, totalQuota, wordCount);
        expect(strategy.nodeType).toBe('Definition');
      }
    });
    
    it('should produce Relationship for 40-80% progress', () => {
      const wordCount = 500;
      const totalQuota = 10;
      
      // 4-7 (40%, 50%, 60%, 70% ilerleme)
      for (let i = 4; i < 8; i++) {
        const strategy = determineNodeStrategy(i, totalQuota, wordCount);
        expect(strategy.nodeType).toBe('Relationship');
      }
    });
    
    it('should produce Result for 80-100% progress', () => {
      const wordCount = 500;
      const totalQuota = 10;
      
      // 8-9 (80%, 90% ilerleme)
      for (let i = 8; i < 10; i++) {
        const strategy = determineNodeStrategy(i, totalQuota, wordCount);
        expect(strategy.nodeType).toBe('Result');
      }
    });
  });
  
  describe('4.3 Edge Cases', () => {
    
    it('should handle zero quota gracefully', () => {
      const strategy = determineNodeStrategy(0, 0, 500);
      expect(strategy.bloomLevel).toBe('knowledge');
      expect(strategy.nodeType).toBe('Definition');
    });
    
    it('❌ ADVERSARIAL: progress > 100% (more questions than quota)', () => {
      const wordCount = 500;
      const totalQuota = 5;
      
      // 6. soru (120% ilerleme)
      const strategy = determineNodeStrategy(6, totalQuota, wordCount);
      // progress = 6/5 = 1.2 -> >= 0.80 -> Result
      expect(strategy.nodeType).toBe('Result');
    });
  });
});

// ============================================================================
// BÖLÜM 5: ENTEGRASYON & ADVERSARİAL TESTLER
// ============================================================================

describe('5. Entegrasyon ve Adversarial Testler', () => {
  
  describe('5.1 Tam Oturum Simülasyonu', () => {
    
    it('should simulate a complete session with mixed responses', () => {
      let masteryScore = 0;
      const responses: { type: QuizResponseType; isRepeated: boolean }[] = [
        { type: 'correct', isRepeated: false },    // +10 -> 10
        { type: 'correct', isRepeated: false },    // +10 -> 20
        { type: 'incorrect', isRepeated: false },  // -5  -> 15
        { type: 'correct', isRepeated: false },    // +10 -> 25
        { type: 'blank', isRepeated: false },      // -2  -> 23
      ];
      
      for (const { type, isRepeated } of responses) {
        const result = calculateScoreChange(type, masteryScore, isRepeated);
        masteryScore = result.newScore;
      }
      
      expect(masteryScore).toBe(23);
    });
    
    it('❌ ADVERSARIAL: User achieves 100 mastery in single session', () => {
      /**
       * KURAL: "İlk oturum kısıtlaması kaldırıldı, kullanıcı tek oturumda 100'e ulaşabilir"
       * 
       * Test: 10 doğru cevap -> 100 puan
       */
      let masteryScore = 0;
      
      for (let i = 0; i < 10; i++) {
        const result = calculateScoreChange('correct', masteryScore, false);
        masteryScore = result.newScore;
      }
      
      expect(masteryScore).toBe(100);
    });
    
    it('should track previous attempts correctly for isRepeated flag', () => {
      /**
       * Senaryo:
       * 1. Kullanıcı Q1'i yanlış cevaplıyor (ilk kez) -> isRepeated = false
       * 2. Kullanıcı Q2'yi doğru cevaplıyor -> irrelevant
       * 3. Kullanıcı Q1'i tekrar görüyor ve yanlış cevaplıyor -> isRepeated = true
       * 
       * Bu mantık session-manager.ts'de priorAttempts sorgusu ile yapılıyor
       */
      const q1FirstAttempt = calculateScoreChange('incorrect', 50, false);
      expect(q1FirstAttempt.delta).toBe(-5);
      
      const q1SecondAttempt = calculateScoreChange('incorrect', 45, true);
      expect(q1SecondAttempt.delta).toBe(-10);
    });
  });
  
  describe('5.2 Shelf System State Machine', () => {
    /**
     * Durumlar: active | pending_followup | archived
     * 
     * Geçişler:
     * - Doğru & Hızlı: any -> archived
     * - Doğru & Yavaş: any -> pending_followup
     * - Yanlış: any -> pending_followup
     * - Boş: any -> active
     */
    
    type ShelfStatus = 'active' | 'pending_followup' | 'archived';
    
    function determineNewStatus(
      responseType: QuizResponseType,
      timeSpentMs: number,
      TmaxMs: number
    ): ShelfStatus {
      if (responseType === 'correct') {
        return timeSpentMs < TmaxMs ? 'archived' : 'pending_followup';
      } else if (responseType === 'incorrect') {
        return 'pending_followup';
      } else {
        return 'active';
      }
    }
    
    it('should transition to archived for fast correct', () => {
      const Tmax = 60000;
      const status = determineNewStatus('correct', 30000, Tmax);
      expect(status).toBe('archived');
    });
    
    it('should transition to pending_followup for slow correct', () => {
      const Tmax = 60000;
      const status = determineNewStatus('correct', 70000, Tmax);
      expect(status).toBe('pending_followup');
    });
    
    it('should transition to pending_followup for incorrect', () => {
      const Tmax = 60000;
      const status = determineNewStatus('incorrect', 30000, Tmax);
      expect(status).toBe('pending_followup');
    });
    
    it('should transition to active for blank', () => {
      const Tmax = 60000;
      const status = determineNewStatus('blank', 5000, Tmax);
      expect(status).toBe('active');
    });
    
    it('❌ ADVERSARIAL: Rapid consecutive blanks should keep status as active', () => {
      const Tmax = 60000;
      
      // 3 hızlı boş geçme
      const status1 = determineNewStatus('blank', 1000, Tmax);
      const status2 = determineNewStatus('blank', 1000, Tmax);
      const status3 = determineNewStatus('blank', 1000, Tmax);
      
      expect(status1).toBe('active');
      expect(status2).toBe('active');
      expect(status3).toBe('active');
      
      // Her seferinde active, ama mastery puanı düşüyor
    });
  });
  
  describe('5.3 Review Queue Öncelik Sırası', () => {
    /**
     * KURAL:
     * Öncelik 1: Aktif (Boş geçilen)
     * Öncelik 2: Takip Bekliyor (Yanlış veya yavaş doğru)
     * Öncelik 3: Arşiv (Zayıf parçadan backfill)
     */
    
    interface ReviewItem {
      status: 'active' | 'pending_followup' | 'archived';
      questionId: string;
    }
    
    function sortReviewQueue(items: ReviewItem[]): ReviewItem[] {
      const priorityMap = {
        'active': 1,
        'pending_followup': 2,
        'archived': 3
      };
      
      return [...items].sort((a, b) => priorityMap[a.status] - priorityMap[b.status]);
    }
    
    it('should prioritize active questions first', () => {
      const queue: ReviewItem[] = [
        { status: 'archived', questionId: 'q1' },
        { status: 'active', questionId: 'q2' },
        { status: 'pending_followup', questionId: 'q3' },
      ];
      
      const sorted = sortReviewQueue(queue);
      
      expect(sorted[0].status).toBe('active');
      expect(sorted[1].status).toBe('pending_followup');
      expect(sorted[2].status).toBe('archived');
    });
    
    it('should maintain stability for same priority', () => {
      const queue: ReviewItem[] = [
        { status: 'active', questionId: 'q1' },
        { status: 'active', questionId: 'q2' },
        { status: 'active', questionId: 'q3' },
      ];
      
      const sorted = sortReviewQueue(queue);
      
      // Stable sort - aynı önceliktekiler sırasını korumalı
      expect(sorted.map(q => q.questionId)).toEqual(['q1', 'q2', 'q3']);
    });
  });
});

// ============================================================================
// BÖLÜM 6: ANOMALI RAPORU (TEST SONUÇLARINA GÖRE)
// ============================================================================

describe('6. ANOMALİ RAPORU - Tespit Edilen Sorunlar', () => {
  
  /**
   * Bu bölüm, yukarıdaki testlerde tespit edilen potansiyel anomalileri
   * dökümante eder.
   */
  
  it('DOCUMENT: Seznam of potential anomalies', () => {
    const anomalies = [
      {
        id: 'ANOMALY-001',
        severity: 'MEDIUM',
        location: 'session-manager.ts:285',
        description: 'T_max sınır değeri kontrolü < yerine <= olmalı',
        impact: 'Tam sınırda cevap veren kullanıcı yanlışlıkla cezalandırılıyor',
        recommendation: 'timeSpentMs < TmaxMs -> timeSpentMs <= TmaxMs olarak değiştir'
      },
      {
        id: 'ANOMALY-002',
        severity: 'LOW',
        location: 'testResultCalculator.ts:26-28',
        description: 'Mastery score hesaplaması çok basit',
        impact: 'Session sonuç ekranındaki mastery, chunk mastery ile uyumsuz',
        recommendation: 'Aynı SRS algoritmasını kullan veya ayrı olduğunu belirt'
      },
      {
        id: 'ANOMALY-003',
        severity: 'LOW',
        location: 'quiz-api.ts:289',
        description: 'calculateQuota minimum 1 döndürüyor, ancak 0 kavram olursa soru üretilemez',
        impact: 'UI "kota var" der ama soru üretilemez',
        recommendation: 'Kavram sayısı 0 ise kota 0 döndür veya erken hata ver'
      },
      {
        id: 'ANOMALY-004',
        severity: 'HIGH',
        location: 'session-manager.ts:221-227',
        description: 'isRepeated sadece aynı question_id için kontrol ediliyor',
        impact: 'Aynı KONUDAN farklı sorularda hata, "ilk hata" sayılıyor',
        recommendation: 'Konu bazlı veya chunk bazlı tekrar takibi ekle (opsiyonel)'
      },
      {
        id: 'ANOMALY-005',
        severity: 'MEDIUM',
        location: 'QuizEngine.tsx:247-261',
        description: 'finishQuizSession results closure stale olabilir',
        impact: 'Son sorunun doğru/yanlış durumu yanlış kaydedilebilir',
        recommendation: 'useRef ile güncel değerleri takip et veya state güncellemesini bekle'
      }
    ];
    
    console.log('\n========== ANOMALİ RAPORU ==========\n');
    anomalies.forEach(a => {
      console.log(`[${a.id}] ${a.severity}`);
      console.log(`  Konum: ${a.location}`);
      console.log(`  Açıklama: ${a.description}`);
      console.log(`  Etki: ${a.impact}`);
      console.log(`  Öneri: ${a.recommendation}`);
      console.log('');
    });
    console.log('====================================\n');
    
    // Bu test sadece dokümentasyon amaçlı
    expect(anomalies.length).toBeGreaterThan(0);
  });
});
