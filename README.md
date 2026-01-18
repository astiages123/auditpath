# AuditPath

AuditPath, kullanıcıların öğrenme süreçlerini takip etmelerini, çalışma alışkanlıklarını oyunlaştırma öğeleriyle geliştirmelerini ve verimli bir çalışma disiplini kazanmalarını sağlayan modern bir web uygulamasıdır. Kullanıcılar ders ilerlemelerini izleyebilir, Pomodoro tekniği ile çalışabilir ve detaylı istatistiklerle performanslarını analiz edebilir.

## Özellikler

### 🟢 Aktif Özellikler
*   **Ders ve Video Takibi:** Kurs müfredatını görüntüleme, tamamlanan videoları işaretleme ve ilerleme yüzdesini anlık görme.
*   **Markdown Not Sistemi:** Derslerle senkronize çalışan, Markdown formatında not görüntüleme altyapısı.
*   **Pomodoro Zamanlayıcı:** Çalışma, mola ve duraklatma sürelerini kaydeden entegre zamanlayıcı.
*   **Oyunlaştırma (Gamification):**
    *   **Rütbe Sistemi:** İlerlemeye bağlı olarak değişen kullanıcı rütbeleri.
    *   **Seri (Streak) Takibi:** Günlük giriş ve çalışma serileri.
    *   **Başarımlar:** Belirli hedeflere ulaşıldığında kazanılan rozetler ve ödüller.
*   **Detaylı İstatistikler:**
    *   Günlük/Haftalık çalışma süreleri.
    *   Verimlilik grafikleri (Video izleme vs Pomodoro süresi).
    *   Kategori bazlı dağılım.
*   **Kullanıcı Yönetimi:** Supabase tabanlı güvenli kimlik doğrulama (Auth) ve profil yönetimi.

### 🟡 Planlanan Özellikler (Roadmap)
*   **Quiz Sistemi (Yapay Zeka Destekli):** Groq, OpenAI veya Gemini altyapısı kullanılarak, kullanıcının notlarından ve ders içeriklerinden otomatik test soruları üreten bir modül geliştirilmesi planlanmaktadır. İlgili SDK bağımlılıkları projeye eklenmiş ancak henüz entegrasyon yapılmamıştır.

## Teknik Mimari

Proje, modern frontend standartlarına uygun olarak **React 19** ve **TypeScript** ile geliştirilmiştir. Performans ve kullanıcı deneyimi ön planda tutulmuştur.

### Teknoloji Yığını
*   **Core:** React 19, TypeScript, Vite
*   **Styling:** Tailwind CSS 4.0, Radix UI (Primitives), Lucide React (Icons)
*   **State Management:** Zustand, TanStack Query (React Query)
*   **Database & Auth:** Supabase
*   **Animations:** Framer Motion, customized confetti effects
*   **AI Integration (Hazırlık):** Groq SDK, OpenAI SDK, Google GenAI SDK

### Dizin Yapısı
```
src/
├── api/            # API servisleri (Şu an boş, AI entegrasyonu için ayrıldı)
├── components/     # UI bileşenleri
│   ├── ui/         # Radix tabanlı atomik bileşenler
│   ├── layout/     # Ana yerleşim düzenleri
│   ├── features/   # Özellik bazlı bileşenler (pomodoro, notes, stats vb.)
├── hooks/          # Özel React hook'ları
├── lib/            # Yardımcı fonksiyonlar ve Supabase istemcisi
├── pages/          # Sayfa görünümleri (Route hedefleri)
├── store/          # Zustand global state yönetim modülleri
├── schemas/        # Zod doğrulama şemaları
scripts/            # Node.js tabanlı yardımcı araçlar (örn: not senkronizasyonu)
public/notes/       # Markdown formatındaki ders notları
```

## Kurulum

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyin.

### Gereksinimler
*   Node.js (v18+)
*   npm veya yarn

### Adımlar

1.  **Repo'yu klonlayın:**
    ```bash
    git clone https://github.com/username/auditpath.git
    cd auditpath
    ```

2.  **Bağımlılıkları yükleyin:**
    ```bash
    npm install
    ```

3.  **Çevresel Değişkenleri Ayarlayın:**
    Kök dizinde `.env` dosyası oluşturun ve aşağıdaki değerleri tanımlayın:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_key
    DATABASE_URL=your_postgres_connection_string # Not senkronizasyonu için gerekli
    ```

4.  **Uygulamayı Başlatın:**
    ```bash
    npm run dev
    ```

## Çalıştırma Komutları

*   `npm run dev`: Geliştirme sunucusunu başlatır.
*   `npm run build`: Production için derleme alır.
*   `npm run preview`: Derlenen projeyi önizler.
*   `npm run lint`: Kod standartlarını kontrol eder.
*   `npm run sync-notes`: `public/notes` klasöründeki Markdown dosyalarını veritabanı ile senkronize eder.

## Temizlik & Bakım Notları

*   **AI Bağımlılıkları:** `package.json` dosyasında bulunan `@google/genai`, `groq-sdk`, `openai` paketleri şu an aktif olarak kullanılmamaktadır. **Quiz Sistemi** geliştirilene kadar "dead dependency" durumundadırlar, ancak gelecek planları için tutulmaktadır.
*   **TypeScript:** `tsconfig.json` ayarları React 19 ve Vite standartlarına göre optimize edilmiştir.
*   **Eslint:** ESLint 9 yapılandırması mevcuttur.

## Geliştirme Notları

*   **Not Senkronizasyonu:** Ders içerikleri veritabanında değil, dosya sisteminde (`public/notes`) tutulur ve `npm run sync-notes` komutu ile parçalanarak (chunking) veritabanına aktarılır. Bu script `scripts/sync-notes.js` dosyasında bulunur.
*   **Veritabanı İstemcisi:** `src/lib/client-db.ts` dosyası, uygulama genelindeki veritabanı işlemlerini (Progress, Stats, Auth vb.) yöneten ana katmandır. SQL sorguları yerine bu fonksiyonların kullanılması önerilir.
