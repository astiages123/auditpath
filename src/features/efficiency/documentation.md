# Efficiency Feature Dokümantasyonu

## Genel Bakış

Efficiency Feature, kullanıcının öğrenme verimliliğini analiz eden, görselleştiren ve optimize eden kapsamlı bir dashboard sistemidir. Bu feature, kullanıcının çalışma alışkanlıklarını, odak düzeyini ve öğrenme akışını ölçerek kişiselleştirilmiş geri bildirim sağlar.

**Sağladığı Değerler:**

- Verimlilik metrikleri: Odak gücü, öğrenme akışı, bilişsel odak skoru
- Görsel analiz: Isı haritası, trend grafikleri, Bloom taksonomi radarı
- Sanal gün sistemi: Gece çalışanlar için 04:00'te başlayan gün mantığı
- AI destekli analiz: Bilişsel içgörüler ve öneriler

## Mimari Yapı

```
src/features/efficiency/
├── index.ts                          # Ana export'lar
├── types.ts                          # TypeScript tip tanımlamaları
├── pages/
│   ├── index.ts
│   └── EfficiencyPage.tsx            # Ana dashboard sayfası
├── hooks/
│   ├── use-efficiency-logic.ts       # Öğrenme akışı hesaplamaları
│   └── use-efficiency-data.ts        # Veri getirme ve işleme
├── components/
│   ├── index.ts
│   ├── cards/
│   │   ├── EfficiencyCards.tsx       # Ana dashboard kartları (6 kart)
│   │   ├── RecentQuizzesCard.tsx     # Quiz geçmişi görünümü
│   │   ├── RecentActivitiesCard.tsx  # Seans listesi ve Odak Gücü
│   │   └── CognitiveInsightsCard.tsx # AI destekli bilişsel analiz
│   ├── visuals/
│   │   ├── EfficiencyCharts.tsx      # Tüm grafik bileşenleri
│   │   └── EfficiencyHeatmap.tsx     # 30 günlük tutarlılık ısı haritası
│   └── modals/
│       └── EfficiencyModals.tsx      # Detaylı modal içerikleri

İlgili Çekirdek Yardımcı Programlar:
src/shared/lib/core/utils/efficiency-math.ts    # Tüm hesaplamalar
src/shared/lib/utils/date-utils.ts              # Sanal Gün mantığı
```

### Ana Bileşenlerin Sorumlulukları

**EfficiencyPage (pages/EfficiencyPage.tsx)**

- Ana dashboard düzenini yönetir
- 3-panel yapı: Sol menü, orta içerik, sağ widget'lar
- Kart grid düzenini koordine eder

**use-efficiency-logic.ts**

- Öğrenme akışı hesaplamalarını yapar
- EFFICIENCY_THRESHOLDS değerlendirmesi
- Video/Pomodoro oranı analizi

**use-efficiency-data.ts**

- Supabase'den veri getirir
- Trend yüzdelerini hesaplar
- Isı haritası verilerini işler
- Bilişsel odak skorunu hesaplar

**EfficiencyCards (components/cards/EfficiencyCards.tsx)**

- 6 ana kartı render eder:
  1. FocusHubCard: Günlük odak özeti
  2. StreakCard: Çalışma serisi
  3. MasteryCard: İlerleme ve mastery
  4. LearningFlowCard: Öğrenme akışı
  5. EfficiencyTrendCard: Verimlilik trendi
  6. CognitiveRadarCard: Bilişsel analiz

## Teknik Detaylar (Core Logic)

### Hesaplamalar (Puanlama ve Trend Yüzdeleri)

#### 1. Odak Gücü Skoru (Focus Power)

**Dosya:** `efficiency-math.ts` (satırlar 138-155)

```typescript
Formül: (WorkSeconds / [BreakSeconds + PauseSeconds]) * 20;
```

**Mantık:**

- Minimum kesinti: 60 saniye (sıfıra bölünmeyi önlemek için)
- Yuvarlanmış tam sayı skoru döndürür

**Skor Yorumu:**

- 100+: Mükemmel (Emerald/Yeşil)
- 70-99: İyi (Amber/Sarı)
- <70: İyileştirme Gerekli (Rose/Kırmızı)

#### 2. Öğrenme Akışı Skoru (Learning Flow)

**Dosyalar:** `use-efficiency-logic.ts` ve `efficiency-math.ts`

```typescript
Formül: VideoMinutes / PomodoroMinutes

Eşikler (EFFICIENCY_THRESHOLDS):
- STUCK: < 0.25      - Kritik Yavaş (Takılma)
- DEEP: 0.25-0.75    - Uyarı Yavaş (Yoğun İnceleme)
- OPTIMAL: 0.75-1.25 - İdeal Denge (Denge)
- SPEED: 1.25-1.75   - Uyarı Hızlı (Hızlı Tarama)
- SHALLOW: > 1.75    - Kritik Hızlı (Yüzeysellik)
```

#### 3. Odak Skoru (Klasik)

**Dosya:** `efficiency-math.ts` (satırlar 165-172)

```typescript
Formül: (Work / (Work + Break)) * 100
Döndürür: 0-100 yüzde
```

#### 4. Bilişsel Odak Skoru

**Dosya:** `use-efficiency-data.ts` (satırlar 504-563)

```typescript
Formül: (Correct / Attempts * 100) - (ConsecutiveFails * 5)
Minimum: 0 (sınırlanmış)
Ceza: Ardışık her başarısızlık için 5 puan
```

#### 5. Ustalık Skoru

**Dosya:** `EfficiencyModals.tsx` (satır 350)

```typescript
Formül: VideoProgress * 0.6 + QuestionProgress * 0.4;
Ağırlıklar: (Video % 60, Sorular % 40);
```

### Trend Yüzdesi Hesaplamaları

**Dosya:** `use-efficiency-data.ts` (satırlar 56-60, 98-104)

İki trend yüzdesi hesaplanır:

#### Günlük Odak Trendi

- Bugünün çalışma dakikalarını önceki günle karşılaştırır
- FocusHubCard'ta günlük trend göstergesi olarak kullanılır
- Pozitifse yeşil yukarı ok, negatifse kırmızı aşağı ok

#### Video Trend Yüzdesi

- Bugünün video sayısını önceki günle karşılaştırır
- Video tüketiminde trend gösterir
- Video sayısının yanında görüntülenir

**Veri Kaynağı:** `getDailyStats()` client-db'den önceden hesaplanmış trend yüzdelerini döndürür

### Sanal Gün Mantığı (04:00'te Başlama)

**Dosya:** `date-utils.ts` (satırlar 1-59)

#### Temel Konsept

Uygulama, günün gece yarısı yerine **04:00 AM'de** başladığı bir "Sanal Gün" sistemi kullanır. Bu, gece geç saatlere kadar çalışan kullanıcıları hesaba katmak için tasarlanmıştır.

#### Temel Fonksiyonlar

```typescript
// getVirtualDate(date?: Date): Date
// Mevcut saat 04:00'dan önceyse bir önceki gün olarak işler
Örnek: 2026-02-12 03:30 → 2026-02-11

// getVirtualDayStart(date?: Date): Date
// Sanal günün 04:00 başlangıcını döndürür
Örnek: 2026-02-12 03:30 → 2026-02-11 04:00:00

// getVirtualDateKey(date?: Date): string
// Sanal gün mantığıyla "YYYY-MM-DD" formatını döndürür
// Tüm veritabanı tarih anahtarları için kullanılır
```

#### Efficiency Feature'da Kullanımı

- Tüm pomodoro seansları `getVirtualDateKey(started_at)` ile toplanır
- Gece geç saatlere kadar çalışmayı (örn. 02:00 AM'e kadar) aynı "çalışma günü"ne dahil eder
- DST sorunlarını önlemek için tarihleri yinelemek için 12:00 öğlen referans saati olarak kullanılır

### Isı Haritası Veri İşleme

**Dosyalar:** `EfficiencyHeatmap.tsx` ve `use-efficiency-data.ts` (satırlar 345-396)

#### Veri Yapısı

```typescript
type DayActivity = {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  count: number;
  level: number; // Hesaplanmış 0-5
  intensity: number;
};
```

#### Seviye Hesaplama (Satırlar 17-25)

```typescript
Seviye eşikleri (totalMinutes):
- Seviye 5: > 200 dakika
- Seviye 4: > 150 dakika
- Seviye 3: > 100 dakika
- Seviye 2: > 50 dakika
- Seviye 1: > 0 dakika
- Seviye 0: 0 dakika
```

#### Hafta Sonu Filtreleme Mantığı (Satırlar 369-393)

Veri bağlamını korurken boş hafta sonlarını gizlemek için akıllı filtreleme:

```typescript
// Cumartesi 0 dk ise ama Pazar > 0 ise Cumartesi'yi gizle
// Pazar 0 dk ise ama Cumartesi > 0 ise Pazar'ı gizle
// Bu, ısı haritasını temiz tutarken hafta sonu çalışma kalıplarını gösterir
```

#### Izgara Düzeni

- 6 sütun × 5 satır = 30 hücre
- Son 30 filtrelenmiş günü gösterir
- Seviye arttıkça yeşil renk yoğunluğu artar (%10, %25, %45, %65, %85 opaklık)

### Yoğunluk Analizi Veri İşleme

**Dosya:** `use-efficiency-data.ts` (satırlar 106-343)

#### Öğrenme Yükü Hesaplama (Odaklanma Trendi)

Birden fazla zaman aralığı hesaplanır:

| Aralık | Gün  | Toplama                                        |
| ------ | ---- | ---------------------------------------------- |
| Gün    | 1    | Tek gün görünümü                               |
| Hafta  | 7    | Filtreleme için 12 günlük buffer ile son 7 gün |
| Ay     | 30   | Son 30 gün                                     |
| Tümü   | 6 ay | Aylık toplama                                  |

#### Veri Birleştirme Süreci

1. Supabase'den (son 6 ay) pomodoro seanslarını getir
2. `getVirtualDateKey()` kullanarak sanal tarih anahtarına göre topla
3. `total_work_time / 60` ile dakika hesapla
4. Hafta sonu filtresi uygula - boş Cumartesi/Pazar'ları gizle
5. Etiketleri biçimlendir - "Bugün" için bugün, diğerleri için "12 Şub"

#### Odak Gücü Toplama

```typescript
focusPowerAggMap[dateKey] = {
  work: total_work_time(saniye),
  breakTime: total_break_time(saniye),
  pause: total_pause_time(saniye),
};
```

Her gün için Odak Gücü skoru hesaplamada kullanılır: `(Work / [Break + Pause]) * 20`

## Veri Akışı

### Verimlilik Trend Grafiği Bölgeleri

**Dosya:** `EfficiencyCharts.tsx` (satırlar 54-77)

1.30'den (Altın Oran) sapmaya göre arka plan referans bölgeleri:

- **Kritik Yüksek** (>2.20): Rose arka plan
- **Uyarı Yüksek** (1.60-2.20): Amber arka plan
- **Optimal** (1.00-1.60): Emerald arka plan
- **Uyarı Düşük** (0.65-1.00): Amber arka plan
- **Kritik Düşük** (<0.65): Rose arka plan

### Günlük Hedef Sistemi

- Varsayılan: 200 dakika (3 saat 20 dakika)
- Kullanıcı başına yapılandırılabilir
- Hedef ilerlemesi = `(totalPomodoroTime / dailyGoalMinutes) * 100`
- SVG halka ilerleme göstergesi ile görselleştirilir

### Seans Zaman Çizelgesi İşleme

**Dosya:** `efficiency-math.ts` (satırlar 32-94)

```typescript
// Desteklenen olay türleri (büyük/küçük harf duyarsız):
- work, çalışma, odak → workMs
- break, mola → breakMs
- pause, duraklatma, duraklama → pauseMs

// Çakışma önleme: Bir sonraki olay mevcuttan önce başlarsa,
// mevcut olay bir sonrakinin başlangıcına kadar kısaltılır
```

### Döngü Sayımı

```typescript
// Mola'dan çalışmaya geçişlerde çalışma döngüleri sayılır
// Duraklatmalar döngü sayısını SIFIRLAMAZ (duraklatmadan devam aynı döngüyü sürdürür)
```

### Bloom Taksonomi Radar'ı

**Dosya:** `use-efficiency-data.ts` (satırlar 466-491)

Veritabanı seviyelerini Türkçe görünüme eşler:

- `knowledge` → `Bilgi` (Kırmızı/Rose)
- `application` → `Uygula` (Amber)
- `analysis` → `Analiz` (Emerald)

### Ustalık Zinciri Hesaplama

**Dosya:** `use-efficiency-data.ts` (satırlar 565-629)

- `concept_map` metadata'sı ile `note_chunks` getirilir
- `chunk_mastery` puanlarını getir
- Kavramları chunk mastery puanlarıyla ilişkilendir
- Toplam zincir, dayanıklılık bonusu ve Atlas görselleştirme için grafik verisi hesapla

## Supabase ile Etkileşim

**Veri Tabloları:**

- `pomodoro_sessions`: Pomodoro seans verileri (work_time, break_time, pause_time)
- `quiz_attempts`: Quiz deneme kayıtları
- `note_chunks`: Not chunk'ları ve concept_map metadata'sı
- `chunk_mastery`: Chunk mastery puanları
- `daily_stats`: Günlük özet istatistikler

**State Yönetimi:**

- use-efficiency-data.ts: Veri getirme ve hesaplama
- EfficiencyPage: Dashboard durumu ve görünüm
- React Query: Önbelleğe alma ve yeniden getirme

## Metrik Özeti

| Metrik        | Formül                             | İyi Aralık |
| ------------- | ---------------------------------- | ---------- |
| Odak Gücü     | `(Work/[Break+Pause])*20`          | >100       |
| Öğrenme Akışı | `Video/Pomodoro`                   | 0.75-1.25x |
| Odak Skoru    | `(Work/[Work+Break])*100`          | >80%       |
| Bilişsel Skor | `(Correct/Attempts*100)-(Fails*5)` | >80        |
| Ustalık       | `Video*0.6 + Questions*0.4`        | >70%       |
