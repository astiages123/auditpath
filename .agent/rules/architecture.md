---
trigger: always_on
---

# Mimari ve Dosya Yapısı Kuralları

## Feature Yapısı

- **Özellik Bazlı Yapı:** Her ana işlev `src/features/` altında kendi klasörüne sahip olmalıdır.
- **Klasör İçeriği:** Bir özelliğin (feature) içinde şu alt klasörler bulunabilir:
  - `components/`: Sadece o özelliğe özel arayüz parçaları. (**Zorunlu**)
  - `types/`: TypeScript tanımlamaları. (**Zorunlu**)
  - `hooks/`: Özelliğe özel React hook'ları ve context dosyaları.
  - `logic/`: Özelliğe özel iş mantığı, algoritmalar ve yardımcı fonksiyonlar.
  - `services/`: Veri çekme ve API işlemleri.
  - `store/`: Zustand store dosyaları.
- **Yasak Alt Klasörler:**
  - `utils/` → Feature içinde KULLANILMAZ. Yardımcı fonksiyonlar `logic/` altına konulmalıdır.
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
