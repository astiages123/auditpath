# Pomodoro Modülü Teknik Dokümantasyonu

## 1. Genel Bakış

Pomodoro modülü; kullanıcıların odaklanma sürelerini yöneten, çalışma ve mola döngülerini takip eden ve bu verileri analiz için veritabanına (Supabase) senkronize eden sistemdir.

## 2. Mimari Yapı (Merkezi Kontrol Stratejisi)

Sistem, "Single Responsibility" (Tek Sorumluluk) ilkesine dayanarak üç ana parçaya ayrılmıştır:

### A. Beyin: `TimerController.tsx`

Tüm yan etkilerin (side effects) yönetildiği merkezi bileşendir. UI'da görünmez ancak arka planda şu görevleri yürütür:

- **Web Worker Yönetimi:** Tarayıcı sekmeleri arka plana atılsa bile zamanlayıcının hassas şekilde çalışmasını sağlar.
- **Bildirim Sistemi:** Süre dolduğunda masaüstü bildirimi ve sesli uyarı gönderir.
- **Veri Senkronizasyonu:** Oturum verilerini 30 saniyede bir (heartbeat) ve sayfa kapatılırken (Beacon API) veritabanına yazar.
- **Oturum Restorasyonu:** Sayfa yenilendiğinde yarım kalan oturumu otomatik olarak geri yükler.

### B. Kumanda: `usePomodoro.ts`

Bileşenlerin (UI) zamanlayıcı ile etkileşime girmesini sağlayan hafif bir "interface" (arayüz) hook'udur.

- Karmaşık mantık içermez; sadece Store'daki aksiyonları (`start`, `pause`, `reset`) tetikler.
- Tarayıcı ses bariyerini aşmak için kullanıcı etkileşimi anında `unlockAudio()` işlemini yürütür.

### C. Hafıza: `use-timer-store.ts` (Zustand)

Uygulamanın durumunu (state) tutar. Zaman, aktiflik durumu, seçili kurs ve zaman çizelgesi (timeline) burada yönetilir. `persist` middleware'i sayesinde veriler yerel depolamada saklanır.

---

## 3. Kritik Çözümler ve Mekanizmalar

### Bildirim ve Ses Kontrolü

Mükerrer bildirimleri ve kesik ses sorunlarını önlemek için `lastNotifiedRef` kontrolü eklenmiştir.

- **Benzersiz Anahtar:** `${sessionId || startTime}-${mode}` formatında her oturum ve mod için benzersiz bir anahtar oluşturulur.
- **Koruma:** Eğer bu anahtar için bildirim zaten verilmişse, sistem ikinci kez tetiklenmez.

### Sekme Odak Senkronizasyonu (`visibilitychange`)

Kullanıcı başka bir sekmedeyken süre biterse, ana sekmeye döndüğü an `checkCompletion` fonksiyonu çalışarak kaçırılan bildirimlerin ve seslerin tetiklenmesini sağlar.

### Veri Güvenliği (Safety Save)

Sayfa beklenmedik şekilde kapatıldığında (sekme kapatma, crash vb.), `beforeunload` olayı yakalanarak en güncel timeline verileri **Fetch API + keepalive** kullanılarak veritabanına gönderilir.

---

## 4. Geliştirici Notları

- **Yeni Bir Ses Ekleme:** `audio-utils.ts` üzerinden yeni bir ses dosyası tanımlanıp `TimerController` içindeki `playNotificationSound` çağrısına parametre olarak eklenebilir.
- **Zaman Hassasiyeti:** Zamanlayıcı `Date.now()` farkı üzerinden hesaplandığı için drift (zaman kayması) yaşanmaz. Web Worker sadece "tick" sinyali gönderir, hesaplama Store içindeki `endTime` üzerinden yapılır.
