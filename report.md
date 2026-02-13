# AuditPath Test Stratejisi ve Uygulama Planı (V3 - CLI Odaklı)

Bu döküman, projenin test kapsamını **%14'ten %70+'ye** çıkarmak ve kalan **8 hatayı** onarmak için hazırlanan profesyonel terminal (CLI) tabanlı yol haritasıdır.

## 1. Mevcut Durum (12 Şubat 2026 - Baseline)

| Metrik                 | Değer   |
| ---------------------- | ------- |
| **Toplam Test Sayısı** | 579     |
| **Başarılı Testler**   | 569     |
| **Başarısız Testler**  | 8       |
| **Başarı Oranı**       | **%98** |

---

## 2. Mevcut Hatalar ve Onarım Protokolü (Faz 0 - Final)

Kalan 8 hata, projenin mimari düzenlemeleri (Logger, Storage, Fetch) ile test beklentileri arasındaki küçük uyumsuzluklardan kaynaklanmaktadır.

- **Kategori 1 (Logger):** `[AuditPath] ❌` ve `[AuditPath] ⚠️` prefixleri test beklentilerine eklenecek.
- **Kategori 2 (Storage):** `storage.service.ts` içine eksik olan `keys()` metodu entegre edilecek.
- **Kategori 3 (Fetch/Signal):** `getNote` testlerinde `expect.anything()` ile ek argüman kontrolü esnetilecek.
- **Kategori 4 (Act):** Auth state güncellemeleri `act()` ile sarmalanacak.

---

## 3. Test Hedefleri ve Metrikler

- **Unit Test Kapsamı:** %90+ (Utils ve Logic)
- **Hook Test Kapsamı:** %80+ (State ve Side Effects)
- **Integration Test:** Kritik akışların (Quiz, Pomodoro) %100'ü.
- **Güvenlik:** XSS Sanitization ve Data Validation testlerinin tam kapsanması.

---

## 4. Teknoloji Yığını (CLI Öncelikli)

- **Test Runner:** `Vitest` (CLI Mode).
- **Coverage Engine:** `v8` (Terminal tabloları ve HTML raporları için).
- **Mocking:** `vi.fn()` ve `MSW` (Mock Service Worker).

---

## 5. Uygulama Fazları

### Faz 1: Altyapı ve Yardımcı Fonksiyonlar (Logic %100)

`src/shared/lib/core/utils.ts` ve hesaplama motorlarının (`efficiency-math.ts`) tam kapsanması.

### Faz 2: Hook ve State Management

`use-pomodoro.ts` ve `useQuizManager.ts` gibi bileşen beyinlerinin izole testleri.

### Faz 3: Servis ve Veri Katmanı

`StorageService` ve `OfflineQueue` servislerinin veri tutarlılığı testleri.

### Faz 4: Entegrasyon ve Raporlama

`QuizEngine` ve `EfficiencyPage` akışlarının terminal üzerinden doğrulanması.

---

## 6. Kritik Test Senaryoları (Checklist)

- [ ] **Güvenlik:** LocalStorage'dan okunan veriler sanitize ediliyor mu?
- [ ] **Stabilite:** Büyük JSON verilerinde `toCamelCase` hata veriyor mu?
- [ ] **Logic:** Pomodoro bittiğinde alarm sinyali üretiliyor mu?
- [ ] **Edge Case:** `parseInt` işlemlerinde `NaN` sonuçları yönetiliyor mu?

---

## 7. Test Çalıştırma ve Doğrulama Protokolü (Terminal)

Uygulamanın doğruluğunu kontrol etmek için UI arayüzüne gerek kalmadan şu komutlar kullanılır:

### A. Komut Seti

| Komut                       | Amaç                                                         |
| --------------------------- | ------------------------------------------------------------ |
| `npx vitest run`            | Tüm testleri bir kez çalıştırır ve özeti basar.              |
| `npx vitest run --coverage` | Testleri çalıştırır ve terminale **Coverage Tablosu** basar. |
| `rm -rf coverage .vitest`   | Önbelleği temizleyerek "Temiz Rapor" oluşturulmasını sağlar. |

### B. Doğrulama Akışı (Workflow)

1. **Çalıştır:** `npx vitest run --coverage` komutunu gir.
2. **Kontrol Et:** Terminaldeki tabloda **"Statements"** ve **"Functions"** sütunlarını incele.
3. **Analiz Et:** Eğer %70 altı bir değer varsa, `coverage/index.html` dosyasını tarayıcıda açarak "kırmızı" (test edilmemiş) satırları avla.
4. **Onayla:** Tüm testler yeşil (579/579) ve coverage hedeflenen seviyedeyse kodu commit et.

### C. Temizlik Standardı

Her test dosyasında `afterEach(() => { vi.clearAllMocks(); });` kullanılarak testlerin birbirini kirletmesi engellenir.
