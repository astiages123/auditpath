---
trigger: always_on
---

# Yeni Özellik Ekleme Protokolü

Yeni bir özellik (feature) eklenirken şu sıra izlenmelidir:

1. `src/features/` altında özellik ismiyle klasör aç.
2. Gerekli veri tiplerini `types/` altında tanımla.
3. Supabase üzerinde yeni tablo gerekiyorsa `supabase/migrations` içine SQL dosyasını hazırla.
4. Mantıksal işleri `hooks/` içinde kurgula.
5. Görsel arayüzü `components/` içinde, mevcut UI kütüphanesini kullanarak oluştur.
6. `src/pages/` altında yeni bir sayfa oluştur ve `src/utils/routes.ts` üzerinden yönlendirmesini yap.
