---
trigger: always_on
---

# Yeni Özellik Ekleme Protokolü

Yeni bir özellik (feature) eklenirken şu sıra izlenmelidir:

1. `src/features/` altında özellik ismiyle (`kebab-case`) klasör aç.
2. Zorunlu alt klasörleri oluştur: `components/`, `types/`.
3. Gerekli veri tiplerini `types/types.ts` altında tanımla.
4. Supabase üzerinde yeni tablo gerekiyorsa `supabase/migrations` içine SQL dosyasını hazırla. (Bkz: `convention.md` - Migration Naming)
5. Mantıksal işleri `logic/` içine, yardımcıları ve sabitleri `utils/` içine kurgula.
6. React hook'larını `hooks/` içinde oluştur. Context gerekiyorsa doğrudan `hooks/` altına koy — ayrı bir `context/` alt klasörü açılmamalıdır. (Bkz: `architecture.md`)
7. State ihtiyacını değerlendir: tek ekran veya tek oturum akışıysa önce local hook tasarla; gerçekten global ihtiyaç varsa `store/` altında `useSomethingStore.ts` oluştur.
8. Servis dosyalarını `services/` altında `somethingService.ts` olarak oluştur.
9. Görsel arayüzü `components/` içinde (mantıksel bölümlere ayırmak için alt klasörler kullanılabilir), mevcut UI kütüphanesini (`src/components/ui/`) kullanarak oluştur.
10. Sayfa gerekiyorsa önce feature içinde `XPageContent` ve gerekiyorsa `useXPageLogic` oluştur; `src/pages/` altındaki route dosyası bu feature page content'i döndüren ince wrapper olmalıdır.
11. Route veya URL alanı taşıyan feature'larda kimlik sözlüğünü baştan kur: DB kimliği için `*Id`, public kimlik için `*Slug`.
