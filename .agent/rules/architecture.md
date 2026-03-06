---
trigger: always_on
---

# Mimari ve Dosya Yapısı Kuralları

## Feature Yapısı

- **Özellik Bazlı Yapı:** Her ana işlev `src/features/` altında kendi klasörüne sahip olmalıdır.
- **Klasör İçeriği:** Bir özelliğin (feature) içinde şu alt klasörler bulunabilir:
  - `components/`: Sadece o özelliğe özel arayüz parçaları. Daha iyi organizasyon için alt klasörler (örn: `layout/`, `content/`, `controls/`) kullanılabilir. (**Zorunlu**)
  - `types/`: TypeScript tanımlamaları. (**Zorunlu**)
  - `hooks/`: Özelliğe özel React hook'ları ve context dosyaları.
  - `logic/`: Özelliğe özel iş mantığı, algoritmalar ve yardımcı fonksiyonlar.
  - `services/`: Veri çekme ve API işlemleri.
  - `store/`: Zustand store dosyaları.
  - `utils/`: Özelliğe özel yardımcı fonksiyonlar ve sabitler.
- **Yasak Alt Klasörler:**
  - `context/` → Ayrı klasör olarak KULLANILMAZ. Context/Provider dosyaları `hooks/` altına konulmalıdır.

## Paylaşılan Katmanlar

- `src/shared/components/`: Birden fazla özellik tarafından kullanılan UI bileşenleri.
- `src/shared/hooks/`: Birden fazla özellik tarafından kullanılan hook'lar.
- `src/shared/services/`: Birden fazla özellik tarafından kullanılan servisler.
- `src/shared/store/`: Uygulama geneli store dosyaları.
- `src/shared/utils/`: Birden fazla özellik tarafından kullanılan yardımcılar.
- `src/lib/`: Sadece 3. parti kütüphane entegrasyonları (Supabase client vb.).
- `src/types/`: Global TypeScript tipleri (`auth.ts`, `common.ts`, `database.types.ts`).
- `src/utils/`: Gerçekten global yardımcılar (`routes.ts`, `constants.ts`, `env.ts`, `logger.ts`).
- `src/components/ui/`: Shadcn UI bileşenleri. Yeni görsel bileşen eklenecekse önce burası kontrol edilmeli.
- `src/components/layout/`: Sayfa düzeni bileşenleri.
- `src/__tests__/`: Tüm test dosyalarının bulunduğu merkezi dizin.

## Katman Sınırları

- **Sayfa Girişleri İnce Olmalı:** `src/pages/` altındaki dosyalar route entry katmanıdır. Varsayılan görevleri feature page content döndürmek, route guard sarmalamak veya en fazla çok hafif sayfa kabuğu oluşturmaktır.
- **Page Logic Ayrımı:** Route parametreleri, `navigate`, query string senkronizasyonu, redirect ve sayfa seviyesindeki orkestrasyon `useXPageLogic` benzeri hook'larda tutulmalıdır.
- **Bileşen Sorumluluğu:** `components/` altındaki dosyalar render ve UI etkileşimini taşır. Veri erişimi, yönlendirme kararı veya domain eşleştirme kuralı component içine gömülmemelidir.
- **Service Sınırı:** `services/` sadece veri erişimi ve harici sistem çağrısı yapar. UI state, toast kararı, router kullanımı veya JSX bilgisi içermez.
- **Logic Sınırı:** `logic/` sadece saf hesaplama, mapper ve türetim içerir. React hook, router veya Supabase client bağımlılığı içermez.
- **Cross-Feature Erişim:** Bir feature başka bir feature'ın component veya local hook detayına bağlanmamalıdır. Gerekli erişim service, saf logic veya type yüzeyi üzerinden yapılmalıdır.
- **Feature Yapısı Doğru Ama Yeterli Değil:** Özellik bazlı klasörleme tek başına yeterli sayılmaz; asıl kural katman sınırlarını feature içinde korumaktır.

## Test Yapısı

Test kuralları için bkz: `testing.md`
