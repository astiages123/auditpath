# AuditPath Teknik Mimari, Algoritma ve Performans Dokümantasyonu

Bu belge, AuditPath projesinin çekirdek algoritmalarını, veri yapılarını, teknik kararlarını ve React 19 ile gelen performans optimizasyonlarını içeren kapsamlı bir referans noktasıdır. Hem geliştiriciler hem de AI asistanları için projenin **"beyni"** niteliğindedir.

---

## 1. SRS & Shelf System (Raf Sistemi)

Projenin öğrenme motoru, **Spaced Repetition System (SRS)** ve **Raf (Shelf)** mantığı üzerine kuruludur. Bu sistem, kullanıcının performansına göre içerikleri dinamik olarak zamanlar.

### 1.1. Core Logic

- **3-Strike Rule**: Bir içerik ("Chunk" veya "Soru") **art arda 3 kez** başarılı bir şekilde yanıtlandığında `active` durumundan `archived` durumuna geçer.
- **Session Gaps**: Başarılı tekrarlar arasındaki bekleme süreleri (gün cinsinden) fibonacci benzeri artan bir dizi ile belirlenir:
  `const SESSION_GAPS = [1, 2, 5, 10, 20];`
- **Review Cycle**: Eğer kullanıcı başarısız olursa (`isCorrect: false`), ilerleme sıfırlanır ve içerik en başa döner.

### 1.2. Puanlama & Multipliers

Puanlama, sadece "Doğru/Yanlış" değil, **cevap süresi** ve **kavramsal derinlik (Bloom)** baz alınarak hesaplanır.

#### Bloom Çarpanları

Soru zorluk seviyesine göre temel puan aşağıdaki katsayılarla çarpılır:

| Bloom Level     | Multiplier |
| --------------- | ---------- |
| **Knowledge**   | `1.0`      |
| **Application** | `1.3`      |
| **Analysis**    | `1.6`      |

#### Time Ratio (Hız Puanı)

Kullanıcının cevaplama hızı, beklenen hedef süreye () göre bir oran () oluşturur. Bu oran `0.5` ile `2.0` arasında sınırlandırılır.

**Formül:**

---

## 2. Mastery & Graph Logic (Uzmanlık Zinciri)

Kavramlar arası ilişkiler (Prerequisites) ve kullanıcının bu ağdaki ilerlemesi **Mastery Chain** algoritması ile yönetilir.

### 2.1. Mastery Chain (Uzmanlık Zinciri) Kuralı

Bir kavramın zincir oluşturmuş sayılması için **iki koşulun aynı anda sağlanması** gerekir:

1. **Kavramın Kendisi (Self)**: `%80` veya üzeri başarı (%mastery).
2. **Ön Koşulları (Prerequisites)**: Bağlı olduğu _tüm_ öncül kavramların `%85` veya üzeri başarıya sahip olması.

**Pseudocode:**

```typescript
function isChainComplete(node):
    if node.mastery < 80: return false

    for prereq in node.prerequisites:
        if prereq.mastery < 85: return false

    return true

```

### 2.2. Resilience Bonus (Korumalı Gün)

Tamamlanan her zincir, kullanıcının "streak" (seri) dayanıklılığına katkı sağlar.

- **Kural**: Her tamamlanan zincir için **+2 gün** ek koruma (Resilience Bonus) kazanılır.
- Bu bonus, kullanıcının bir gün çalışmayı aksatması durumunda serisinin bozulmasını engeller.

---

## 3. AI Generation Pipeline

Soru ve içerik üretimi, `QuizFactory` tarafından yönetilen çok aşamalı (Multi-Stage) bir pipeline üzerinden gerçekleşir.

### 3.1. Pipeline Akışı

1. **DraftingTask**:

- **Girdi**: Kavram haritası, konu bağlamı.
- **İşlem**: LLM, Zod şemasına uygun ham bir soru taslağı (`GeneratedQuestionSchema`) üretir.
- **Kurallar**: 5 seçenekli (A-E), çeldiricili, kanıt (`evidence`) içeren yapı.

2. **ValidationTask**:

- **Girdi**: Üretilen taslak soru + Kaynak içerik.
- **İşlem**: Soru, kaynak metne sadık mı? Halüsinasyon var mı? Çeldiriciler mantıklı mı?
- **Çıktı**: `APPROVED` veya `REJECTED` + Nedenleri.

3. **RevisionTask** (Opsiyonel):

- Eğer `ValidationTask` reddederse, hatalı kısımlar düzeltilmek üzere tekrar LLM'e gönderilir (Maksimum 2 deneme).

### 3.2. Veri Bütünlüğü (Zod)

Tüm AI çıktıları, **Zod** kütüphanesi ile çalışma zamanında ("Runtime") doğrulanır.

- Zorunlu alanların varlığı (Soru kökü, Seçenekler, Doğru Cevap).
- Karakter limitleri (Ör. Soru kökü min 10 karakter).
- Enum kontrolleri (Bloom seviyesi: Knowledge, Application, Analysis).

---

## 4. React 19 Concurrent Features & Performance

AuditPath, yoğun veri işleme ve render süreçlerini yönetmek için React 19'un Concurrent özelliklerini (`useTransition` ve `useDeferredValue`) kullanır.

### 4.1. Uygulama Alanları ve Stratejiler

#### **NotesPage.tsx - Markdown Render**

Ağır CPU işlemi gerektiren Markdown ve Mermaid diyagramı render süreçlerinde `useTransition` kullanılır.

- **Sonuç**: Render sırasında UI thread bloke olmaz, 60 FPS korunur. Kullanıcı ToC panelinde gezinmeye devam edebilir.

#### **QuizEngine.tsx - Soru Geçişleri**

Soru navigasyonu ve mastery hesaplamaları transition içine alınmıştır.

- **Sonuç**: Soru geçişleri akıcı hale gelir, input lag (giriş gecikmesi) elimine edilir.

#### **Analytics & Dashboard**

Büyük veri setleri (10,000+ kayıt) ve çoklu grafik render'ları için `useTransition` + `useDeferredValue` kombinasyonu uygulanır.

- **Sonuç**: "Daha Fazla Yükle" işlemleri sırasında scroll akıcılığı bozulmaz, grafik güncellemeleri arka planda hazırlanır.

### 4.2. Teknik Parametreler

| Bileşen        | Hook               | Pending Opacity | Gerekçe                                        |
| -------------- | ------------------ | --------------- | ---------------------------------------------- |
| **NotesPage**  | `useTransition`    | `0.7`           | Markdown render ağır, net feedback gerekli.    |
| **QuizEngine** | `useTransition`    | `0.85`          | Hızlı geçişler, hafif görsel geri bildirim.    |
| **Analytics**  | `useDeferredValue` | `0.7`           | Büyük veri setlerinde veri tutarlılığı kritik. |
| **Efficiency** | `useTransition`    | `0.85`          | Dashboard genel görünümü için akıcılık.        |

> **Not**: Tüm opacity transition'ları `200ms ease-in-out` ile yapılandırılmıştır. Bu süre, işlemin devam ettiğini kullanıcıya hissettirirken akıcılığı bozmaz.

---

## 5. Infrastructure & Workers

Performans ve tutarlılık için bazı işlemler ana JavaScript thread'inden izole edilmiştir.

### 5.1. Timer Worker (`timerWorker.ts`)

Pomodoro ve sınav sayaçları, **Web Worker** üzerinde çalışır.

- **Neden?**: Ana thread (UI rendering) yoğun işlem altındayken `setInterval` sapmalar yapabilir. Worker, UI "donmalarından" etkilenmeden saniyeyi (`TICK`) şaşmaz bir doğrulukla sayar.
- **Model**: `Driver-Based`. Worker sadece sinyal gönderir, asıl mantık ana thread'de işlenir.

### 5.2. Virtual Date Logic (`getVirtualDateKey`)

Sistem, günü gece yarısı (00:00) yerine **sabah 04:00**'te başlatır.

- **Amaç**: Gece çalışan kullanıcıların serisinin (streak) bozulmasını engellemek.
- **Uygulama**: `CurrentTime - 4 Hours` mantığı ile tarih anahtarları oluşturulur.

---

## 6. Testing Strategy

Kalite güvencesi (QA), `src/__tests__` altında merkezi bir yapıda yönetilir.

### 6.1. Test Piramidi

1. **Unit Tests**: Algoritmaların matematiksel doğruluğu (Ör. `srs.test.ts` - Bloom çarpanları).
2. **Integration Tests**: Repository ve Servis katmanlarının etkileşimi, mocklanmış DB çağrıları.
3. **Data Integrity Checks**: AI tarafından üretilen JSON yapılarının Zod şemasına uyumluluğu.
