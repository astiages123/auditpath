---
trigger: always_on
---

# Veri ve State Yönetimi

- **API Erişimi:** Bileşenler (components) doğrudan Supabase'e istek atmamalıdır. İstekler `services/` içindeki servis dosyaları üzerinden yapılmalıdır.
- **Global State:** Uygulama genelindeki durumlar `src/store/` altındaki Zustand (veya mevcut store yapısı) ile yönetilmelidir.
- **Hata Yönetimi:** Tüm API istekleri `try-catch` blokları içinde alınmalı ve kullanıcıya `sonner` (bildirim sistemi) ile bilgi verilmelidir.
- **Çevrimdışı Destek:** `src/lib/offlineQueueService.ts` yapısına uygun olarak, önemli işlemler kuyruğa alınabilir olmalıdır.
