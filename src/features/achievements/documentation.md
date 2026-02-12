# Achievements Feature Dokümantasyonu

## Genel Bakış

Achievements Feature, kullanıcının öğrenme yolculuğundaki ilerlemesini ödüllendiren, rozet (Seal) ve rütbe (Rank) sistemi ile gamification sağlayan bir modüldür. Bu feature, kullanıcı motivasyonunu artırmak ve ilerlemeyi görselleştirmek için tasarlanmıştır.

**Sağladığı Değerler:**

- Gamification: Rozet ve rütbe sistemi ile motivasyon
- İlerleme takibi: Kategori bazlı ve genel ilerleme ödülleri
- Sosyal kanıt: Kazanılan başarımların sergilenmesi
- Kişiselleştirme: Dinamik rütbe görselleri ve unvanlar

## Mimari Yapı

```
src/features/achievements/
├── index.ts                                    # Public export'lar
├── lib/
│   ├── achievements.ts                         # Temel başarım tanımları ve mantığı
│   ├── rank-icons.ts                           # Rütbe ikon eşlemeleri
│   └── celebration-assets.ts                   # Kutlama modalı varlıkları
├── hooks/
│   └── use-achievements.ts                     # Senkronizasyon için React Query hook'ları
└── components/
    ├── ui/
    │   └── SealCard.tsx                        # Başarım rozeti kart bileşeni
    ├── sections/
    │   └── AchievementsRoom.tsx                # Ana başarımlar sayfası
    └── modals/
        └── SealDetailModal.tsx                 # Başarım detay modalı

İlgili Dosyalar:
src/shared/lib/core/services/achievement.service.ts    # DB servisi
src/shared/lib/core/utils/rank-utils.ts                # Rütbe hesaplama
src/config/constants.ts                                # RANKS sabiti
src/shared/types/core.ts                               # Rütbe tipi tanımı
```

### Ana Bileşenlerin Sorumlulukları

**AchievementsRoom (components/sections/AchievementsRoom.tsx)**

- Ana başarımlar sayfasını render eder
- Lonca (Guild) bazlı gruplama yapar
- Kazanılan ve kilitli başarımları gösterir
- Rozet kartlarını grid düzeninde sunar

**SealCard (components/ui/SealCard.tsx)**

- Tek bir başarım rozeti kartını render eder
- Görsel, başlık, açıklama ve ilerleme çubuğunu gösterir
- Kilitleme/kilit açma durumunu görselleştirir
- Tıklama detay modalını açar

**use-achievements.ts (hooks/use-achievements.ts)**

- Başarım senkronizasyon mantığını içerir
- `useSyncAchievementsMutation` ana senkronizasyon hook'u
- Supabase ile başarım verilerini senkronize eder
- Kazanılan başarımları ve kutlamaları yönetir

**achievement.service.ts (shared/lib/core/services/achievement.service.ts)**

- Veritabanı ile etkileşim katmanı
- `getUnlockedAchievements()`: Kullanıcının kazandığı başarımları getirir
- `unlockAchievement()`: Yeni başarım kazandırır
- `revokeAchievement()`: Koşulları karşılamayan başarımları geri alır

## Teknik Detaylar (Core Logic)

### Başarım (Seal/Rozet) Kazanma Kriterleri

Sistem **8 Lonca (Guild)** içerir, toplam 32 başarım (TITLES hariç):

#### Lonca Tipleri:

| Lonca           | Adı                                  | Açıklama                        | Renk               |
| --------------- | ------------------------------------ | ------------------------------- | ------------------ |
| HUKUK           | Kadim Yasalar ve Yazıtlar Meclisi    | Hukuk ve Adalet Doktrinleri     | Deep Indigo        |
| EKONOMI         | Altın Akış ve Simya Konseyi          | Ekonomi ve Kaynak Yönetimi      | Rich Amber         |
| MUHASEBE_MALIYE | Hazine ve Kusursuz Mizân Muhafızları | Muhasebe ve Maliye Bilimi       | Emerald Balance    |
| GENEL_YETENEK   | Yedi Diyar ve Diplomasi Okulu        | Mantık, Lisan ve Genel Bilgelik | Regal Amethyst     |
| HYBRID          | Kadim Birleşimler ve İlimler         | Çapraz disiplinlerde ustalık    | Buz Mavisi/Gümüş   |
| SPECIAL         | Yüce Disiplin ve Adanmışlık          | Zihinsel dayanıklılık mühürleri | Eternal Flame      |
| MASTERY         | Kadim İmtihanlar ve Hakikat Meclisi  | Quiz Ustalık Nişanları          | Parlak Büyücü Moru |
| TITLES          | Unvanlar                             | Rütbe başarımları               | Yeşil tonu         |

#### Gereksinim Tipleri:

```typescript
type RequirementType =
  | { type: 'category_progress'; category: string; percentage: number } // Kategoride % ilerleme
  | { type: 'multi_category_progress'; categories: { category; percentage }[] } // Birden fazla kategori
  | { type: 'all_progress'; percentage: number } // Genel ilerleme
  | { type: 'streak'; days: number } // Ardışık günler
  | { type: 'daily_progress'; count: number } // Günlük video sayısı
  | { type: 'total_active_days'; days: number } // Toplam aktif gün
  | { type: 'minimum_videos'; count: number }; // Minimum tamamlanan video
```

#### Örnek Başarımlar (Lonca Bazlı):

**HUKUK (Hukuk):**

- Yasa Tozu: %10 HUKUK ilerlemesi
- Demir Mühürdar: %25 HUKUK ilerlemesi
- Rün Mürekkebi: %50 HUKUK ilerlemesi
- Adalet Asası: %100 HUKUK ilerlemesi

**HYBRID (Çapraz Disiplin):**

- Ticaret Valisi: %25 HUKUK + %25 EKONOMI
- İmparatorluk Nazırı: %50 EKONOMI + %50 MUHASEBE_MALIYE
- Bilge Diplomat: %50 HUKUK + %50 GENEL_YETENEK
- Strateji Mimarı: %25 MUHASEBE_MALIYE + %25 GENEL_YETENEK
- Büyük Konsey Üyesi: %50 genel ilerleme

**SPECIAL (Etkinlik Tabanlı, Kalıcı):**

- Gece Nöbetçisi: Bir günde 5 video
- Zihinsel Maraton: Bir günde 10 video
- Sönmeyen Meşale: 7 günlük seri
- Kutsal Adanmışlık: 30 günlük seri
- Zamanın Yolcusu: 60 toplam aktif gün
- Uyanmış Ruh: %50 genel ilerleme
- Yüce Üstad: %100 genel ilerleme

**isPermanent Bayrağı:** Bazı başarımlar (özel etkinlik tabanlı ve rütbe başarımları) `isPermanent: true` değerine sahiptir, yani koşullar artık karşılanmasa bile geri alınamaz.

### achievement.service.ts İşleyişi

**Konum:** `/Users/vedatdiyar/Desktop/AuditPath/src/shared/lib/core/services/achievement.service.ts`

#### Temel Fonksiyonlar:

**1. `getUnlockedAchievements(userId)`**

- `user_achievements` tablosundan tüm kazanılan başarımları getirir
- `achievement_id` ve `unlockedAt` ile eşleştirilmiş dizi döndürür
- AbortError'u sessizce işler

**2. `unlockAchievement(userId, achievementId, achievedAt?)`**

- Başarımın zaten var olup olmadığını kontrol eder (yinelenmeleri önler)
- Sağlanırsa özel `achievedAt` tarihi kullanır, aksi halde mevcut zaman
- `is_celebrated: false` ile `user_achievements` tablosuna ekler
- Upsert `onConflict: 'user_id,achievement_id'` kullanır

#### Veritabanı Şeması:

```sql
user_achievements:
  - user_id (uuid)
  - achievement_id (string)
  - unlocked_at (timestamp)
  - is_celebrated (boolean)
```

### Rütbe (Rank) Sistemi

**Konum:** `/Users/vedatdiyar/Desktop/AuditPath/src/config/constants.ts`

#### 4 Rütbe (Unvan):

| Sıra | ID  | Adı            | Min % | Renk            | Slogan                           |
| ---- | --- | -------------- | ----- | --------------- | -------------------------------- |
| 1    | 1   | Sürgün         | %0    | text-slate-500  | Bilginin krallığından uzakta...  |
| 2    | 2   | Yazıcı         | %25   | text-amber-700  | Kadim metinleri kopyalayarak...  |
| 3    | 3   | Sınır Muhafızı | %50   | text-blue-400   | Bilgi krallığının sınırlarını... |
| 4    | 4   | Yüce Bilgin    | %75   | text-purple-500 | Görünmeyeni görüyor...           |

#### Rütbe Yardımcı Programları (`rank-utils.ts`):

**`getRankForPercentage(percentage)`**

- `percentage >= rank.minPercentage` olan en yüksek rütbeyi döndürür
- Eşleşme yoksa ilk rütbeye (Sürgün) düşer

**`getNextRank(currentRankId)`**

- Sıradaki bir sonraki rütbeyi döndürür veya maksimumda null

### Dinamik Rütbe Görsel Seçimi (rank-icons)

**Konum:** `/Users/vedatdiyar/Desktop/AuditPath/src/features/achievements/lib/rank-icons.ts`

#### Rütbe Lucide İkon Eşlemesi:

```typescript
export const rankIcons: Record<string, LucideIcon> = {
  Sürgün: Briefcase,
  Yazıcı: Star,
  'Sınır Muhafızı': Shield,
  'Yüce Bilgin': Crown,
};
```

#### Kullanım:

- `getRankIcon(rankName)` - Rütbe için Lucide ikon bileşenini döndürür
- Rütbe adı null/undefined/bulunamazsa `Briefcase`'e düşer
- Ayrıca `RANKS` ve `Rank` tipini `@/shared/lib/core/utils/rank-utils`'ten yeniden export eder

#### Rütbe Görsel Varlıkları:

```
/ranks/rank1.webp  - Sürgün
/ranks/rank2.webp  - Yazıcı
/ranks/rank3.webp  - Sınır Muhafızı
/ranks/rank4.webp  - Yüce Bilgin
```

## Veri Akışı

### Başarım Senkronizasyon Hook'u (`use-achievements.ts`)

Ana senkronizasyon mantığı `useSyncAchievementsMutation` üzerinden çalışır:

1. **Veri Toplama:**
   - `getTotalActiveDays(userId)` - Toplam aktif günler
   - `getDailyVideoMilestones(userId)` - 5+ ve 10+ video günlerinin ilk tarihleri
   - `getStreakMilestones(userId)` - İlk 7 günlük seri tarihi

2. **Hak Kazanılan ID'leri Hesaplama:**
   - `calculateAchievements(stats, activityLog)` ile algoritmik başarımlar
   - Mevcut rütbe sırasına göre rütbe başarımları
   - Kurs tamamlamaları (`COURSE_COMPLETION:courseId`)
   - Kategori tamamlamaları (`CATEGORY_COMPLETION:category`)

3. **Güncellemeleri Yürütme:**
   - Uygun tarihsel tarihlerle yeni başarımları ekle
   - Kalıcı olmayan başarımları geri al (eğer artık uygun değilse)
   - Kutlamayı tetiklemek için uncelebrated sorgusunu geçersiz kıl

### Kutlama Sistemi (`celebration-assets.ts`)

**`getCelebrationAsset(id)`** kutlama modalı yapılandırması döndürür:

| ID Kalıbı               | Varyant     | İkon          | Açıklama               |
| ----------------------- | ----------- | ------------- | ---------------------- |
| `RANK_UP:X`             | rank        | getRankIcon() | Rütbe atlama kutlaması |
| `COURSE_COMPLETION:X`   | course      | Kursa özel    | Kurs tamamlama         |
| `CATEGORY_COMPLETION:X` | achievement | Trophy        | Kategori tamamlama     |
| Standart ID             | achievement | Medal         | Rozet kazanımı         |

### Geri Alma Mantığı

Sadece şu durumlarda başarımlar geri alınabilir:

- Şu anda uygun DEĞİL
- `isPermanent !== true`
- `RANK_UP:` ile başlamıyor (korunmuş)
- `streak` içermiyor (etkinlik tabanlı koruma)

### Rozet/Seal Görselleri

Dosya adlandırma kuralları değişir:

- **Tire formatı:** `hukuk-10.webp`, `ekonomi-25.webp`
- **Alt çizgi formatı:** `muhasebe_50.webp` (hybrid/özel rozetler)

Konum: `/public/badges/`

### Başarım Hesaplama

**Saat bazlı ilerleme hesaplaması** kullanılır (video sayısı değil):

```typescript
(cat.completedHours / cat.totalHours) * 100 >= req.percentage;
```

Bu, UI ilerleme görüntülemeleriyle tutarlılık sağlar.

## Supabase ile Etkileşim

**Veri Tabloları:**

- `user_achievements`: Kullanıcı başarım kayıtları
- `user_stats`: Kullanıcı istatistikleri (aktif günler, seriler)
- `video_progress`: Video tamamlama kayıtları
- `course_progress`: Kurs ilerleme kayıtları

**State Yönetimi:**

- use-achievements.ts: Senkronizasyon ve hesaplama
- AchievementsRoom: Görünüm durumu ve filtreleme
- React Query: Önbellek ve yeniden getirme

## Akış Özeti

1. **Kullanıcı sayfayı açar** → `useSyncAchievementsMutation` tetiklenir
2. **Veriler toplanır** → Aktif günler, video kilometre taşları, seriler
3. **Uygunluk hesaplanır** → Mevcut istatistiklere göre başarımlar belirlenir
4. **Başarımlar güncellenir** → Yeni kazanımlar eklenir, uygun olmayanlar geri alınır
5. **Kutlamalar gösterilir** → `is_celebrated: false` olan başarımlar için modal açılır
6. **Rozetler sergilenir** → AchievementsRoom'ta tüm başarımlar görüntülenir
