---
trigger: always_on
---

# Yeni Özellik Ekleme Protokolü

Yeni bir özellik (feature) eklenirken şu sıra izlenmelidir:

1. `src/features/` altında özellik ismiyle (`kebab-case`) klasör aç.
2. Zorunlu alt klasörleri oluştur: `components/`, `types/`.
3. Gerekli veri tiplerini `types/types.ts` altında tanımla.
4. Supabase üzerinde yeni tablo gerekiyorsa `supabase/migrations` içine SQL dosyasını hazırla.
5. Mantıksal işleri `logic/` içine, yardımcıları ve sabitleri `utils/` içine kurgula.
6. React hook'larını `hooks/` içinde oluştur. Context gerekiyorsa `hooks/context/` altına koy.
7. Zustand store gerekiyorsa `store/` altında `useSomethingStore.ts` oluştur.
8. Servis dosyalarını `services/` altında `somethingService.ts` olarak oluştur.
9. Görsel arayüzü `components/` içinde, mevcut UI kütüphanesini (`src/components/ui/`) kullanarak oluştur.
10. `src/pages/` altında yeni bir sayfa oluştur ve `src/utils/routes.ts` üzerinden yönlendirmesini yap.
