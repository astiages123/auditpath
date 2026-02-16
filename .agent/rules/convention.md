---
trigger: always_on
---

# İsimlendirme ve Kodlama Standartları

- **Dosya İsimleri:** - React Bileşenleri: `PascalCase.tsx` (Örn: `QuizCard.tsx`)
  - Hooklar ve Fonksiyonlar: `camelCase.ts` (Örn: `useTimer.ts`)
  - Stil ve Konfigürasyon: `kebab-case.json` veya `.css` (Örn: `tailwind-config.js`)
- **TypeScript Kullanımı:** - `any` tipi kullanılmamalıdır. Her şeyin tipi `src/types/` veya özellik altındaki `types/` klasöründe tanımlanmalıdır.
  - Veri tabanı dönüşleri için `database.types.ts` referans alınmalıdır.
- **İçe Aktarmalar (Imports):** Mutlak yollar (Absolute paths) tercih edilmelidir (Örn: `@/features/...` yerine `src/features/...` gibi mevcut yapı korunmalı).
