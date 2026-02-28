---
trigger: always_on
---

# Veri ve State Yönetimi

- **API Erişimi:** Bileşenler (components) doğrudan Supabase'e istek atmamalıdır. İstekler `services/` içindeki servis dosyaları üzerinden yapılmalıdır.
- **Global State:** Uygulama genelindeki durumlar `src/shared/store/` veya ilgili özelliğin `store/` klasöründeki Zustand store'ları ile yönetilmelidir.
- **Hata Yönetimi:** Tüm API istekleri `try-catch` blokları içinde alınmalı ve kullanıcıya `sonner` (bildirim sistemi) ile bilgi verilmelidir.
