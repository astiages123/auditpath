# AuditPath 🛡️

![Durum](https://img.shields.io/badge/Durum-Aktif_Geliştirme-success?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-Vite_7_%7C_React_19_%7C_TypeScript-blue?style=for-the-badge&logo=typescript)
![Veritabanı](https://img.shields.io/badge/DB-Supabase-green?style=for-the-badge)
![Test](https://img.shields.io/badge/Kapsam-Yüksek-green?style=for-the-badge)

AuditPath, gelişmiş algoritmalar ve AI destekli içerik üretimi ile öğrenme tutumunu optimize eden **bilişsel bir motor**dur.

---

## ⚡ Öne Çıkan Özellikler

### 🧠 Akıllı Tekrar Sistemi (SRS)

Bildiklerini unutmamak için çalışır. AuditPath, performansına göre içerik yaşam döngüsünü yönetir:

| Kural                    | Açıklama                                        |
| :----------------------- | :---------------------------------------------- |
| **3 Vuruş Kuralı**       | 3 ardışık başarılı hatırlama → Arşiv            |
| **Fibonacci Aralıkları** | `[1, 2, 5, 10, 20]` günlük genişleyen aralıklar |
| **Sıfırlama**            | Herhangi bir hata → başlangıca geri dönüş       |

### 🔗 Mastery Zinciri

Kavramlar arasındaki bağımlılıkları modeller. Bir kavram **Mastery Zinciri** parçası sayılırsa:

1. Kendi başarı oranı **>%80**
2. Tüm ön koşul kavramlar **>%85**

Zincir tamamlandığında **+2 gün Resilience Bonus** kazanılır — seriyi koruyan bir "can".

### 🤖 AI İçerik Fabrikası

Çok aşamalı üretim hattı ile kaliteli sorular:

```
Analiz → Taslak → Doğrulama → Revizyon
```

- **Zod** ile runtime schema kontrolü
- Hallüsinasyon kontrolü
- Akıllı şık üretimi (yanlış ama mantıklı seçenekler)

### ⏱️ Web Worker Timer

Ana thread'i meşgul etmeden çalışan Pomodoro ve sınav timer'ları. Ağır UI yükü altında bile **sıfır sapmalı** zaman tutma.

### 🌙 Sanal Tarih Sistemi

- **Gün başlangıcı**: 04:00
- 03:59'da yapılan çalışma dün sayılır
- Gece geç saatlere kadar çalışanlar için koruma

### 🔄 Notion Senkronizasyonu

Öğrenme içerikleri Notion üzerinden yönetilir ve özel entegrasyon aracı (`scripts/notion-sync`) sayesinde tek tuşla Supabase veritabanına aktarılır. Bu sayede veri girişi büyük ölçüde hızlanır ve yapılandırılır.

### 📝 Gelişmiş Not Motoru (Notes)

Soruların veya referansların açıklama sayfaları için zenginleştirilmiş okuma deneyimi sunar:

- **Markdown & HTML** desteği
- **KaTeX** üzerinden matematik denklemlerini görselleştirme
- **Mermaid** formülü ile mimari ve akış şemalarını okuyabildiğiniz kod blokları desteği

### 🏆 Oyunlaştırma (Achievements)

Sürekli gelişimi teşvik etmek için tasarlanmış bağımsız bir **Başarı ve Rozet Sistemi**. Kullanıcı, sistem tarafından izlenen başarı metriklerini aşarak rozetlerin kilidini kırar.

### 📊 Analitik ve Performans (Analytics)

Zaman kullanımını ve tekrar eden başarıyı takip eden kapsamlı paneller:

- **`Recharts` Desteği**: Pomodoro odak oturumları, test başarı oranları vb. için zengin grafikler.
- Her kavrama ait **Mastery Skorları** üzerinden hazırlık seviyesinin canlı raporlanması.

### 📶 Çevrimdışı Çalışma (Offline-First)

İnternet bağlantısı olmadan da kesintisiz çalışma sağlayan özel bir katman mimarisi:

- **IndexedDB (`clientDb`)**: Veriler lokalde birikir ve sayfanın en hızlı şekilde cevap vermesini sağlar
- **`offlineQueueService`**: Yapılan her çevrimdışı işlemin (sorunun çözülmesi, pomodoro saati vs.) arkaya atılıp, bağlantı geldiğinde güvenle senkronize edilmesini sağlar.

---

## 🛠️ Teknoloji Yığını

| Katman                  | Teknoloji                             |
| :---------------------- | :------------------------------------ |
| **Frontend**            | React 19, TypeScript, Vite 7          |
| **UI**                  | Radix UI, Tailwind CSS, Framer Motion |
| **State**               | Zustand, TanStack Query               |
| **Backend**             | Supabase (PostgreSQL)                 |
| **Veri Görselleştirme** | Recharts, Mermaid                     |
| **Test**                | ESLint, TypeScript                    |

---

## 📁 Proje Yapısı

```
src/
├── api/              # Harici API servisleri (döviz kurları)
├── components/       # Paylaşılan UI bileşenleri
├── features/        # Özellik modülleri
│   ├── auth/        # Kimlik doğrulama
│   ├── courses/    # Kurs yönetimi
│   ├── pomodoro/   # Pomodoro timer & oturumlar
│   ├── quiz/       # Quiz motoru & AI üretimi
│   └── ...
├── hooks/          # Özel React hook'ları
├── lib/            # Supabase, storage, offline
├── pages/          # Sayfa bileşenleri
├── shared/         # Paylaşılan modal, kart bileşenleri
├── store/          # Zustand state yönetimi
├── styles/         # Global stiller
├── types/          # TypeScript tip tanımları
├── utils/          # Yardımcı fonksiyonlar (SRS, mastery, tarih)
└── workers/        # Web Worker'lar (timer)
```

---

## 📝 Geliştirme Notları

- **Offline Çalışma**: IndexedDB destekli clientDb + offlineQueueService
- **Veritabanı**: Supabase migrations `supabase/migrations/`
- **Tip Üretimi**: `npm run update-types` → Supabase'ten TypeScript tipleri
- **Linting**: `npm run lint` ve `npm run type-check`

---

## 📄 Lisans

MIT License - 2024 AuditPath
