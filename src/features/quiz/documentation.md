# Quiz Feature Dokümantasyonu

## Genel Bakış

Quiz Feature, kullanıcının öğrenme sürecini destekleyen, AI destekli uyarlanabilir soru sistemidir. Bu feature, kullanıcının bilgi seviyesini değerlendirmek, zayıf noktalarını tespit etmek ve kişiselleştirilmiş tekrar programları oluşturmak için tasarlanmıştır.

**Sağladığı Değerler:**

- Uyarlanabilir öğrenme: Kullanıcının performansına göre soru zorluğu ayarlanır
- Bilinçli tekrar: SRS (Spaced Repetition System) ile optimum hatırlama aralıkları
- Zayıf konu tespiti: Waterfall mantığıyla hatalı sorular otomatik takibe alınır
- Anti-ezber: Arşivlenen sorular periyodik olarak yenileriyle değiştirilir

## Mimari Yapı

```
src/features/quiz/
├── algoritma/
│   ├── srs.ts              # SRS algoritması, puanlama ve zamanlama
│   ├── strategy.ts         # Sınav stratejisi, Bloom seviyeleri, kategori yönetimi
│   ├── scoring.ts          # Puan hesaplama ve mastery hesaplamaları
│   └── exam.ts             # SAK formülü ile akıllı sınav dağılımı
├── api/
│   ├── client.ts           # Birleşik LLM istemcisi
│   ├── rate-limit.ts       # AI çağrıları için hız limiti
│   └── repository.ts       # Veri erişim katmanı (Supabase)
├── components/
│   ├── contexts/
│   │   ├── QuizSessionContext.tsx    # Context tip tanımlamaları
│   │   └── QuizSessionProvider.tsx   # Ana oturum sağlayıcı
│   ├── engine/
│   │   ├── QuizEngine.tsx            # Ana quiz yönetici
│   │   ├── IntermissionScreen.tsx    # Batch'ler arası ekran
│   │   └── PostTestDashboard.tsx     # Sonuç dashboard'u
│   ├── modal/              # Quiz modal ve alt bileşenleri
│   └── ui/                 # UI kartları ve yardımcı bileşenler
├── core/
│   ├── engine.ts           # Quiz motoru (orkestratör)
│   ├── factory.ts          # QuizFactory (AI üretimi)
│   ├── prompts.ts          # AI promptları
│   ├── schemas.ts          # Zod validasyon şemaları
│   ├── types.ts            # TypeScript tipleri
│   ├── utils.ts            # Yardımcı fonksiyonlar
│   └── tasks/              # AI görev sınıfları
├── hooks/
│   └── use-quiz.ts         # Ana quiz hook'u
└── logic/
    └── submission-calculator.ts  # Gönderim sonuç hesaplamaları
```

### Ana Bileşenlerin Sorumlulukları

**QuizSessionProvider (components/contexts/QuizSessionProvider.tsx)**

- Oturum durumunu yönetir (localStorage persistence)
- Soru kuyruğunu (review queue) oluşturur ve batch'lere böler
- Waterfall mantığına göre soru havuzlarını dengeler
- Scaffolding (destekleyici soru) enjeksiyonu yapar

**QuizEngine (components/engine/QuizEngine.tsx)**

- Soru gösterimini yönetir
- Cevap gönderimlerini işler
- Sonuç hesaplamalarını koordine eder

**QuizFactory (core/factory.ts)**

- AI ile soru üretimi yapar
- Concept mapping analizi gerçekleştirir
- Follow-up ve scaffolding soruları oluşturur

## Teknik Detaylar (Core Logic)

### Waterfall Mantığı (Pending/Active/Archived)

Quiz sistemi, soruları üç aşamalı bir Waterfall modelinde yönetir:

**1. pending_followup (Yüksek Öncelik - Hedef %20)**

- Daha önce yanlış cevaplanan sorular
- Yeni üretilen ana sorular (follow-up durumunda)
- Aktif eğitime geçmeden önce tekrar gözden geçirilmelidir

**2. active (Orta Öncelik - Hedef %70)**

- Halihazırda öğrenilmekte olan sorular
- Hedef chunk'tan gelen sorular
- Waterfall fallback: Zayıf chunk'lar (< %80 mastery) otomatik dahil edilir

**3. archived (Düşük Öncelik - Hedef %10)**

- Ustalık kazanılmış sorular (3 ardışık doğru hızlı cevap)
- Periyodik olarak tekrar sorulur (Anti-Ezber)
- "Arşiv Tazeleme" ile yeni benzer sorular üretilir

**Kuyruk Oluşturma Sırası (getReviewQueue in engine.ts):**

1. **Follow-up Havuzu** (%20 limit) - En yüksek öncelik
2. **Eğitim Havuzu** (%70 limit) - Hedef chunk + waterfall zayıf chunk'lar
3. **Arşiv Mekanizması** (%10 limit) - Ustalaşılmış konuları tazele

### sr_stage (0-4) Seviyeleri ve SESSION_GAPS

**SESSION_GAPS Array:**

```typescript
const SESSION_GAPS = [1, 2, 5, 10, 20];
```

Bu array, başarı sayısına göre tekrar seansları arasındaki aralığı belirler.

**SRS Akışı (calculateShelfStatus in srs.ts):**

- **Success Count 0**: `active` durum, planlanmış tekrar yok
- **Success Count 0.5-2.9**: `pending_followup` durum
- **Success Count >= 3**: `archived` durum

**Sonraki Tekrar Hesaplaması:**

```typescript
calculateNextReviewSession(currentSession, successCount);
// successCount 1 → gap 1 → next = current + 1
// successCount 2 → gap 2 → next = current + 2
// successCount 3 → gap 5 → next = current + 5
// successCount 4 → gap 10 → next = current + 10
// successCount 5+ → gap 20 → next = current + 20
```

**Success Count Artışı:**

- **Hızlı cevap**: +1.0
- **Yavaş cevap**: +0.5
- **Yanlış cevap**: 0'a sıfırlanır

### Scaffolding ve Cursed Topic Mantığı

#### Scaffolding (follow-up-task.ts)

`consecutiveFails >= 2` durumunda tetiklenir:

```typescript
if (consecutiveFails >= 2) {
  if (targetBloomLevel === 'analysis') {
    targetBloomLevel = 'application';
  } else if (targetBloomLevel === 'application') {
    targetBloomLevel = 'knowledge';
  }
  // Prompt'a scaffolding notu eklenir
}
```

**Scaffolding Süreci:**

1. Aynı soruda tekrarlanan hatalar tespit edilir
2. Otomatik olarak **Bloom seviyesi düşürülür** (analysis → application → knowledge)
3. Daha düşük bilişsel seviyede **basitleştirilmiş scaffolding sorusu** üretilir
4. `injectScaffolding()` ile hemen ardından enjekte edilir

#### Cursed Topic (Waterfall Hata Yönetimi)

Kullanıcı yanlış cevap verdiğinde:

- Hata **tanı ile birlikte kaydedilir**
- `generateFollowUp()` ile **takip sorusu üretilir**
- Toast mesajı: "Bu hata analiz edildi ve waterfall mantığıyla sonraki tekrar seanslarına (SRS) enjekte edildi"

### TMax Hesaplama (Dinamik Zaman Eşiği)

```typescript
// Formül: (charCount / 780) * 60 + (15 + conceptCount * 2) * difficultyMultiplier + buffer
calculateTMax(charCount, conceptCount, bloomLevel, (bufferSeconds = 10));
// "Hızlı" vs "yavaş" cevap belirler
```

**Bloom Seviyesi Katsayıları:**

```typescript
const BLOOM_COEFFICIENTS = {
  knowledge: 1.0, // 20s hedef
  application: 1.3, // 35s hedef
  analysis: 1.6, // 50s hedef
};
```

### Puanlama Sabitleri (srs.ts)

```typescript
const POINTS_CORRECT = 10;
const PENALTY_INCORRECT_FIRST = 5;
const PENALTY_BLANK_FIRST = 2;
const PENALTY_REPEATED = 10;
const SLOW_SUCCESS_INCREMENT = 0.5;
```

### Kurs Kategorileri (strategy.ts)

- **SKILL_BASED**: English, Math, Logic, Statistics
- **SCENARIO_BASED**: Law courses, Accounting, Finance
- **THEORY_BASED**: Economics, Management, Marketing

**Bloom Dağılımı (10 soru başına):**

- **SKILL_BASED**: 1 bilgi, 6 uygulama, 3 analiz
- **SCENARIO_BASED**: 2 bilgi, 6 uygulama, 2 analiz
- **THEORY_BASED**: 2 bilgi, 6 uygulama, 2 analiz

### Ustalık Hesaplaması

```typescript
// Kapsam Puanı (%60) + Performans Puanı (%40)
const coverageRatio = Math.min(1, uniqueSolved / totalQuestions);
const coverageScore = coverageRatio * 60;
const scoreComponent = averageScore * 0.4;
const newMastery = Math.round(coverageScore + scoreComponent);
```

### Akıllı Sınav (SAK Formülü)

Her chunk için soru dağılımını şu faktörlere göre hesaplar:

- **Önem** (%40): Kurs önem ağırlığı
- **Ustalık Faktörü** (%30): 1 - normalize edilmiş mastery
- **Zorluk Faktörü** (%20): Zorluk indeksi (difficulty_index)
- **Kapsam Faktörü** (%10): Konsept sayısı oranı (concept_map.length)

## Veri Akışı

### QuizSessionProvider ile Batching Yönetimi

#### Batch Yapılandırması

```typescript
const BATCH_SIZE = 10; // Odaklı Öğrenme Akışı
```

#### Durum Yapısı

```typescript
interface QuizSessionState {
  reviewQueue: ReviewItem[]; // Düzleştirilmiş tam kuyruk
  batches: ReviewItem[][]; // 10'arlı parçalara bölünmüş
  currentBatchIndex: number; // Hangi batch aktif
  totalBatches: number;
  currentReviewIndex: number; // Kuyruktaki global pozisyon
  isReviewPhase: boolean;
}
```

#### Temel Metodlar

**`initializeSession(courseId)`:**

1. Seans bilgisi, kota bilgisi, kurs istatistiklerini getirir
2. İçerik güncellemeleri için versiyon koruması kontrol eder
3. Geçerliyse localStorage'dan kayıtlı oturumu geri yükler
4. Waterfall modeliyle tekrar kuyruğu oluşturur
5. 10 soruluk batch'ler oluşturur
6. localStorage'a kaydeder

**`markReviewComplete()`:**

- `currentReviewIndex`'i artırır
- Yeni indeks ile localStorage'ı günceller
- Seans tamamlandığında depolamayı temizler

**`advanceBatch()`:**

- Batch tamamlandığında çağrılır
- `currentBatchIndex`'i artırır
- Batch'ler arasında IntermissionScreen tetikler

**`injectScaffolding(questionId, chunkId)`:**

- Öncelik 0 ile yeni ReviewItem oluşturur
- Kuyrukta mevcut indeksin ARDINA ekler
- Mevcut batch dizisini doğrudan günceller
- Güncellenmiş kuyruğu localStorage'a kaydeder

### Supabase ile Etkileşim

**Veri Tabloları:**

- `questions`: Soru verileri, SRS durumu, metadata
- `question_attempts`: Kullanıcı deneme kayıtları
- `user_stats`: Kullanıcı istatistikleri
- `courses`: Kurs bilgileri

**State Yönetimi:**

- QuizSessionProvider: Oturum durumunu ve kuyruğu yönetir
- localStorage: Oturum kalıcılığı için kullanılır
- Supabase: Kalıcı veri saklama ve senkronizasyon

### Anti-Ezber (Arşiv Tazeleme)

Arşivlenen sorular kuyrukta göründüğünde:

1. Sistem `arsiv` havuzundan getirmeye çalışır
2. Havuz yetersizse `generateArchiveRefresh()` ile JIT üretim tetikler
3. Aynı konuda yeni soru oluşturarak ezberi önler

## Akış Özeti

1. **Kullanıcı quiz'e tıklar** → `initializeSession()` kuyruğu getirir
2. **Kuyruk oluşturulur** Waterfall ile: %20 pending → %70 active → %10 archived
3. **Kuyruk batch'lere ayrılır** (10 soruluk setler)
4. **Kullanıcı cevap verir** → `submitAnswer()` SRS durumunu hesaplar
5. **Yanlış cevap** → Takip sorusu üretilir, tekrarlanan hatalarda scaffolding
6. **Batch tamamlanır** → IntermissionScreen, sonra `advanceBatch()`
7. **Seans tamamlanır** → PostTestDashboard istatistiklerle
