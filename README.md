# AuditPath 🛡️

[![Live Demo](https://img.shields.io/badge/🚀_Demo-audit--path.vercel.app-black?style=for-the-badge)](https://audit-path.vercel.app/)
![Stack](https://img.shields.io/badge/React_19_|_TypeScript_|_Supabase-blue?style=for-the-badge&logo=typescript)

Denetimcilik ve KPSS sınavlarına hazırlık için kişisel öğrenme platformu.  
Quiz, notlar, Pomodoro zamanlayıcısı, başarımlar ve çalışma analizi tek bir yerde.

---

## Özellikler

### 🧠 AI Destekli Quiz

Farklı AI modelleri görev bazlı çalışır:

| Görev                     | Model               |
| ------------------------- | ------------------- |
| Soru analizi              | Google Gemini Flash |
| Kalite doğrulama          | Mimo v2 Flash       |
| Açıklama & takip soruları | DeepSeek Chat       |

Sorular çok aşamalı bir üretim hattından geçer: **Analiz → Taslak → Doğrulama → Revizyon.** Zod ile runtime şema kontrolü yapılır, yanlış ama mantıklı çeldirici şıklar üretilir.

### 🔁 Akıllı Tekrar Sistemi (SRS)

Yanlış cevaplanan sorular unutulmaz. Fibonacci aralıklarıyla tekrar planlanır: `[1, 2, 5, 10, 20]` gün. 3 ardışık doğru cevap sonrası soru arşive geçer.

### 🔗 Mastery Zinciri

Kavramlar arasındaki bağımlılıklar modellenir. Bir kavramda ustalaşmak için hem o kavramın hem de ön koşullarının başarı oranı eşiği aşılmalıdır. Zincir tamamlandığında ekstra "can" bonusu kazanılır.

### ⏱️ Pomodoro Zamanlayıcı

Web Worker tabanlı — sekme arka planda olsa bile sapmasız çalışır. Favicon üzerinde canlı geri sayım gösterimi ve oturum bazlı ders takibi yapar.

### 🌙 Sanal Gün Sistemi

Gün başlangıcı 04:00 olarak ayarlanmıştır. Gece geç saate kadar yapılan çalışmalar doğru güne sayılır.

### 📚 Notlar & Notion Entegrasyonu

Notlar Notion üzerinden yönetilir, Supabase Edge Function aracılığıyla tek tuşla senkronize edilir. Markdown, KaTeX (matematik) ve Mermaid (diyagram) desteğiyle zenginleştirilmiş okuma deneyimi sunar.

### 🏆 Başarım & Rozet Sistemi

Konu bazlı rozet seviyeleri (10 / 25 / 50 / 100 soru), 5 kademeli rank sistemi ve günlük çalışma serisi (streak) takibi içerir.

### 📊 Verimlilik Analitiği

Günlük/haftalık çalışma metrikleri, Bloom Taksonomisi bazlı bilişsel yük analizi, ısı haritası ve odak gücü raporları.

---

## Teknoloji Yığını

| Katman    | Teknoloji                                     |
| --------- | --------------------------------------------- |
| Frontend  | React 19, TypeScript, Vite                    |
| UI        | Radix UI, Tailwind CSS v4, Framer Motion      |
| State     | Zustand, TanStack Query                       |
| Backend   | Supabase (PostgreSQL + Auth + Edge Functions) |
| Grafikler | Recharts, Mermaid                             |
| Test      | Vitest, Testing Library                       |
| AI        | Google Gemini, DeepSeek, Mimo                 |

---

## Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Ortam değişkenlerini ayarla
cp .env.example .env

# Geliştirme sunucusunu başlat
npm run dev
```

**.env** dosyasına Supabase bilgilerini ekle:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

AI anahtarları güvenlik için doğrudan Supabase Edge Function içinde tutulur, frontend'e açık değildir.

---

## Proje Yapısı

```
src/
├── features/       # Her özellik kendi klasöründe
│   ├── quiz/       # AI quiz motoru & SRS
│   ├── efficiency/ # Verimlilik & metrikler
│   ├── achievements/
│   ├── courses/
│   ├── notes/      # Notion entegrasyonlu notlar
│   ├── pomodoro/
│   ├── analytics/
│   └── auth/
├── pages/          # Sayfa bileşenleri
├── shared/         # Paylaşılan hook & bileşenler
└── utils/          # Yardımcı araçlar
supabase/
├── functions/      # Edge Functions (AI proxy, Notion sync)
└── migrations/
```

---

<div align="center">
  <sub>Banka müfettişliği hayaliyle, kod yazarak hazırlanıyorum. 🏦</sub>
</div>
