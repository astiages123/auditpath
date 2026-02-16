---
description: Uygulamada meydana gelen teknik hataları, mantıksal bozuklukları veya beklenmedik davranışları analiz ederek kök nedenini bulmak ve projeye en uygun çözümü üretmek için kullanılır.
---

# /hata-ayıkla İş Akışı

Bu iş akışı, bir hata raporlandığında adım adım çözüm üretmek için kullanılır.

### 1. Adım: Etki Alanı Analizi

- Hatanın hangi **Feature** (Özellik) klasöründe olduğunu belirle (`src/features/...`).
- Hata görsel bir arayüzde mi (`components`), bir mantıkta mı (`hooks/logic`), yoksa veri tabanı bağlantısında mı (`services/lib`) tespit et.

### 2. Adım: Veri ve Tip Kontrolü

- İlgili fonksiyonun **TypeScript** tanımlarını (`types/`) kontrol et.
- Veri tipi uyuşmazlığı (örneğin; sayı beklerken metin gelmesi) var mı bak.

### 3. Adım: Servis ve Supabase Denetimi

- Eğer sorun veri çekme/gönderme ile ilgiliyse, `src/lib/supabase.ts` ve ilgili özelliğin `services/` dosyasını incele.
- Son yapılan `supabase/migrations` dosyalarında bu alanı etkileyen bir değişiklik var mı kontrol et.

### 4. Adım: Mimari Uygunluk Testi

- Önerilecek çözüm, projenin `architecture.md` kurallarına uyuyor mu?
- (Örn: Bileşen içine doğrudan API isteği yazılmamalı, servis kullanılmalı.)

### 5. Adım: Çözüm ve Doğrulama

- Çözümü uygula.
- Eğer hata `useEffect` veya `store` (durum yönetimi) kaynaklıysa, yan etkileri (side-effects) kontrol et.
