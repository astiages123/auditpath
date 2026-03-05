---
trigger: always_on
---

# Veri ve State Yönetimi

- **API Erişimi:** Bileşenler (components) doğrudan Supabase'e istek atmamalıdır. İstekler `services/` içindeki servis dosyaları üzerinden yapılmalıdır.
- **Store Varsayılan Değildir:** Zustand store sadece gerçekten paylaşılan, uzun ömürlü veya ekranlar arası senkron tutulması gereken state için kullanılmalıdır.
- **Yerel Akış Önceliği:** Tek sayfa, tek feature veya tek oturum ömründeki state için önce hook + local state tercih edilmelidir.
- **Store Kullanım Kriteri:** Bir state birden fazla bağımsız ağaçta okunmuyorsa, route değişse bile korunması gerekmiyorsa veya harici senkronizasyon gerektirmiyorsa store'a çıkarılmamalıdır.
- **Veri Erişimi ve State Ayrımı:** Veri çekme `services/` ve sorgu hook'larında, ekran davranışı orchestration hook'larında, render kararları component katmanında tutulmalıdır.
- **Kimlik Ayrımı:** Veritabanı kimlikleri ile public slug alanları karıştırılmamalıdır. UUID taşıyan alanlar `*Id`, URL/public alanlar `*Slug` olarak adlandırılmalıdır.
- **Hata Yönetimi:** Tüm API istekleri `try-catch` blokları içinde alınmalı ve kullanıcıya `sonner` (bildirim sistemi) ile bilgi verilmelidir.
