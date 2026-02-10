## 📜 AuditPath: Başarım ve Rütbe Sistemi Teknik Dokümantasyonu

Bu belge, AuditPath platformundaki başarımların hesaplanması, senkronizasyonu ve kutlama (celebration) mekanizmalarını açıklar.

### 1. Veri Yapısı ve Standardizasyon

Sistem, `courses.json` dosyasındaki kategorilerle başarımları eşleştirmek için **slug** tabanlı bir yapı kullanır.

- **Kategoriler:** `EKONOMI`, `HUKUK`, `MUHASEBE_MALIYE`, `GENEL_YETENEK`.
- **Eşleşme:** Başarım tanımlarındaki `category` alanı ile ders verisindeki `slug` alanı birebir eşleşmelidir.

### 2. Başarım Türleri ve Kalıcılık

Başarımlar `isPermanent` bayrağına göre ikiye ayrılır:

| Tür                    | Tanım                                         | Örnek                                                | Silinebilir mi?             |
| ---------------------- | --------------------------------------------- | ---------------------------------------------------- | --------------------------- |
| **Kalıcı (Permanent)** | Belirli bir eylem veya eşik anında kazanılır. | Rütbeler, Çalışma Serileri (7 gün), Günlük Rekorlar. | **Hayır**                   |
| **Dinamik**            | Mevcut ilerleme oranına bağlıdır.             | Kategori %100 Tamamlama, Tüm İlimler %50.            | **Evet** (İlerleme düşerse) |

### 3. Rütbe Sistemi (Titles)

Kullanıcılar "Hiçlikten Yeni Doğan" olarak başlar. Rütbe atlamaları `all_progress` (saat bazlı genel ilerleme) üzerinden hesaplanır:

- **Sürgün (Rank 1):** En az 1 video tamamlandığında kazanılır.
- **Yazıcı (Rank 2):** Genel ilerleme ≥ %25.
- **Sınır Muhafızı (Rank 3):** Genel ilerleme ≥ %50.
- **Yüce Bilgin (Rank 4):** Genel ilerleme ≥ %75.

### 4. Senkronizasyon ve Revoke (Geri Alma) Mantığı

`use-achievements.ts` hook'u, kullanıcı verisi her değiştiğinde çalışır:

1. **Hesaplama:** Mevcut istatistikler, `achievements.ts` içindeki kurallarla karşılaştırılır.
2. **Ekleme (Unlock):** Kazanılan ama DB'de olmayan başarımlar `unlocked_at` tarihiyle eklenir.
3. **Temizlik (Revoke):** DB'de olan ancak artık şartları sağlamayan başarımlar silinir.

- _İstisna:_ `isPermanent: true` olan başarımlar bu temizlikten muaftır.

### 5. Kutlama (Celebration) Akışı

Kutlamalar, kullanıcının başarısını görsel bir şölenle (konfeti, modal) taçlandırır. Çift kutlamayı önlemek için **Yarış Durumu (Race Condition) Koruması** içerir:

1. `useUncelebratedQuery` ile kutlanmamış başarımlar çekilir.
2. İşlem sırasına alınan ID, yerel `processingIds` listesine eklenerek kilitlenir.
3. **Kutlama Modalı** ekranda gösterilir.
4. Kullanıcı "Devam Et" butonuna bastığında:

- DB'de `is_celebrated: true` olarak güncellenir.
- ID kilidi kaldırılır.
- Sıradaki kutlama (varsa) tetiklenir.

---

### Geliştirici Notları

- Yeni bir kategori eklediğinizde mutlaka `courses.json` içinde benzersiz bir `slug` tanımlayın.
- Tarih bazlı başarımların (Gece Nöbetçisi vb.) ilk kazanılma tarihini korumak için `dailyMilestones` yardımcı fonksiyonlarını kullanın.
