# AuditPath 🚀

**AuditPath**, hukuk öğrencileri ve profesyoneller için geliştirilmiş, **AI destekli** yeni nesil bir öğrenme ve sınav hazırlık asistanıdır. Kullanıcıların ders notlarını yükleyerek kişiselleştirilmiş quizler oluşturmasını, aralıklı tekrar sistemi (SRS) ile bilgileri kalıcı hale getirmesini ve detaylı analizlerle gelişimlerini takip etmesini sağlar.

## 🌟 Temel Özellikler

### 🧠 Akıllı Not İşleme
*   Ders notlarınızı (Markdown formatında) sisteme yükleyin.
*   Sistem, içeriği analiz eder ve öğrenmeye uygun küçük parçalara (chunks) ayırır.
*   Her parça için içerik yoğunluğu ve zorluk derecesi otomatik hesaplanır.

### 🤖 AI Soru Üretimi (Bloom Taxonomy)
*   **Google GenAI (Gemini) / OpenAI** entegrasyonu.
*   Ezberden uzak, pedagojik standartlara uygun sorular:
    *   **Bilgi (Knowledge):** Temel tanım ve kavram soruları.
    *   **Uygulama (Application):** Örnek olay ve ilişkilendirme soruları.
    *   **Analiz (Analysis):** Neden-sonuç ve çıkarım soruları.

### 📊 Sınav Simülatörü & Raf Sistemi (Shelf System)
*   Gerçek sınav deneyimini simüle eden zaman ayarlı testler.
*   **Dinamik Raf Sistemi:** Sorular, verdiğiniz cevabın doğruluğuna ve hızına göre "Aktif", "Takip Bekliyor" veya "Arşiv" raflarına ayrılır.
*   Yanlış cevaplanan sorular için **AI destekli takip soruları** üretilir.

### 🍅 Pomodoro & Odaklanma
*   Ders çalışma sürelerinizi entegre Pomodoro sayacı ile yönetin.
*   Mola ve çalışma süreleri otomatik olarak kaydedilir ve raporlanır.

### 📈 İlerleme Takibi (Analytics)
*   Ders bazında ilerleme grafikleri.
*   "Ustalık Puanı" (Mastery Score) ile yetkinlik seviyenizi görün.
*   Haftalık çalışma hedefleri ve başarımlar.

## 🛠️ Teknoloji Yığını

### Frontend
*   **React 19**
*   **Vite** (Hızlı geliştirme ve build)
*   **TypeScript** (Tip güvenliği)
*   **Tailwind CSS v4** (Modern stil yönetimi)
*   **Radix UI** (Erişilebilir UI bileşenleri)
*   **Framer Motion** (Animasyonlar)
*   **Zustand** (Client-side state yönetimi)
*   **TanStack Query** (Server-side state & caching)

### Backend & Veritabanı
*   **Supabase** (BaaS)
    *   **PostgreSQL:** İlişkisel veri tabanı.
    *   **Auth:** Kullanıcı kimlik doğrulama.
    *   **Realtime:** Canlı veri akışı.

### AI & Servisler
*   **Google GenAI SDK**
*   **OpenAI SDK**
*   **Groq SDK**

## 🗄️ Veritabanı Yapısı (Özet)

Temel tablolar ve işlevleri:

*   `courses`: Dersler ve meta verileri.
*   `note_chunks`: İşlenmiş ders notu parçaları.
*   `questions`: AI tarafından üretilen sorular ve detayları.
*   `user_quiz_progress`: Kullanıcıların soru bazlı cevap ve süre kayıtları.
*   `chunk_mastery`: Her not parçası için kullanıcının ustalık puanı.
*   `pomodoro_sessions`: Çalışma oturumu kayıtları.

## 🚀 Kurulum

Projeyi yerel ortamınızda çalıştırmak için:

1.  **Depoyu klonlayın:**
    ```bash
    git clone https://github.com/username/auditpath.git
    cd auditpath
    ```

2.  **Bağımlılıkları yükleyin:**
    ```bash
    npm install
    ```

3.  **Çevresel Değişkenleri Ayarlayın:**
    `.env.example` dosyasını `.env` olarak kopyalayın ve gerekli API anahtarlarını girin:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_key
    VITE_GOOGLE_API_KEY=your_gemini_api_key
    # ... diğer anahtarlar
    ```

4.  **Uygulamayı başlatın:**
    ```bash
    npm run dev
    ```

## 📝 Kullanım Akışı

1.  **Ders Seçimi:** Ana sayfadan çalışmak istediğiniz dersi seçin.
2.  **Soru Üretimi:** İlgili konunun yanındaki "Soru Üret" butonuna basın. AI, içeriği analiz edip soruları hazırlar.
3.  **Test Çöz:** Hazırlanan sorularla testi başlatın. Süreyi ve şıkları dikkatli kullanın.
4.  **Analiz:** Test bitiminde sonuç ekranını inceleyin. Hatalı sorular tekrar havuzuna düşecektir.
5.  **Tekrar:** Belirli aralıklarla sisteme girerek "Takip Bekleyen" soruları eritin.

## 🤝 Katkıda Bulunma

1.  Forklayın.
2.  Yeni bir branch oluşturun (`git checkout -b feature/yeniozellik`).
3.  Değişikliklerinizi commit yapın (`git commit -m 'feat: Yeni özellik eklendi'`).
4.  Branch'inizi pushlayın (`git push origin feature/yeniozellik`).
5.  Pull Request açın.
