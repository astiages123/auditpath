# AuditPath Technical Architecture & Algorithm Documentation

Bu belge, AuditPath projesinin çekirdek algoritmalarını, veri yapılarını ve teknik kararlarını içeren kapsamlı bir referans noktasıdır. Hem geliştiriciler hem de AI asistanları için projenin **"beyni"** niteliğindedir.

---

## 1. SRS & Shelf System (Raf Sistemi)

Projenin öğrenme motoru, **Spaced Repetition System (SRS)** ve **Raf (Shelf)** mantığı üzerine kuruludur. Bu sistem, kullanıcının performansına göre içerikleri dinamik olarak zamanlar.

### 1.1. Core Logic

- **3-Strike Rule**: Bir içerik ("Chunk" veya "Soru") **art arda 3 kez** başarılı bir şekilde yanıtlandığında `active` durumundan `archived` durumuna geçer.
- **Session Gaps**: Başarılı tekrarlar arasındaki bekleme süreleri (gün cinsinden) fibonacci benzeri artan bir dizi ile belirlenir:
  ```typescript
  const SESSION_GAPS = [1, 2, 5, 10, 20];
  ```
- **Review Cycle**: Eğer kullanıcı başarısız olursa (`isCorrect: false`), ilerleme sıfırlanır ve içerik en başa döner.

### 1.2. Puanlama & Multipliers

Puanlama, sadece "Doğru/Yanlış" değil, **cevap süresi** ve **kavramsal derinlik (Bloom)** baz alınarak hesaplanır.

#### Bloom Çarpanları
Soru zorluk seviyesine göre temel puan aşağıdaki katsayılarla çarpılır:
| Bloom Level | Multiplier |
| :--- | :--- |
| **Knowledge** | `1.0` |
| **Application** | `1.3` |
| **Analysis** | `1.6` |

#### Time Ratio (Hız Puanı)
Kullanıcının cevaplama hızı, beklenen hedef süreye (`TargetTime`) göre bir oran (`Ratio`) oluşturur. Bu oran `0.5` ile `2.0` arasında sınırlandırılır.

**Formül:**
```typescript
TimeRatio = Clamp(TargetTime / ActualTime, 0.5, 2.0)
FinalScore = BaseScore * BloomMultiplier * TimeRatio
```
*(Burada `Clamp(val, min, max)` fonksiyonu değeri belirtilen aralıkta tutar.)*

---

## 2. Mastery & Graph Logic (Uzmanlık Zinciri)

Kavramlar arası ilişkiler (Prerequisites) ve kullanıcının bu ağdaki ilerlemesi **Mastery Chain** algoritması ile yönetilir.

### 2.1. Mastery Chain (Uzmanlık Zinciri) Kuralı

Bir kavramın zincir oluşturmuş sayılması için **iki koşulun aynı anda sağlanması** gerekir:
1.  **Kavramın Kendisi (Self)**: `%80` veya üzeri başarı (%mastery).
2.  **Ön Koşulları (Prerequisites)**: Bağlı olduğu *tüm* öncül kavramların `%85` veya üzeri başarıya sahip olması.

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

1.  **DraftingTask**:
    - **Girdi**: Kavram haritası, konu bağlamı.
    - **İşlem**: LLM (ör. GPT-4o-mini), Zod şemasına uygun ham bir soru taslağı (`GeneratedQuestionSchema`) üretir.
    - **Kurallar**: 5 seçenekli (A-E), çeldiricili, kanıt (`evidence`) içeren yapı.

2.  **ValidationTask**:
    - **Girdi**: Üretilen taslak soru + Kaynak içerik.
    - **İşlem**: Soru, kaynak metne sadık mı? Halüsinasyon var mı? Çeldiriciler mantıklı mı?
    - **Çıktı**: `APPROVED` veya `REJECTED` + Nedenleri.

3.  **RevisionTask** (Opsiyonel):
    - Eğer `ValidationTask` reddederse, hatalı kısımlar düzeltilmek üzere tekrar LLM'e gönderilir (Maksimum 2 deneme).

### 3.2. Veri Bütünlüğü (Zod)

Tüm AI çıktıları, **Zod** kütüphanesi ile çalışma zamanında ("Runtime") doğrulanır.
- Zorunlu alanların varlığı (Soru kökü, Seçenekler, Doğru Cevap).
- Karakter limitleri (Ör. Soru kökü min 10 karakter).
- Enum kontrolleri (Bloom seviyesi: Knowledge, Application, Analysis).

---

## 4. Infrastructure & Workers

Performans ve tutarlılık için bazı işlemler ana JavaScript thread'inden izole edilmiştir.

### 4.1. Timer Worker (`timerWorker.ts`)

Pomodoro ve sınav sayaçları, **Web Worker** üzerinde çalışır.
- **Neden?**: Ana thread (UI rendering) yoğun işlem altındayken `setInterval` sapmalar yapabilir. Worker, UI "donmalarından" etkilenmeden saniyeyi (`TICK`) şaşmaz bir doğrulukla sayar.
- **Model**: `Driver-Based`. Worker sadece "TICK" sinyali gönderir, asıl mantık (süre azaltma, durum kontrolü) ana thread'de işlenir.

### 4.2. Virtual Date Logic (`getVirtualDateKey`)

Sistem, günü gece yarısı (00:00) yerine **sabah 04:00**'te başlatır.
- **Amaç**: Gece geç saatlere (01:00 - 03:59) kadar çalışan "gece kuşu" kullanıcıların çalışmaları, hala "bir önceki gün" sayılır. Böylece gece çalışırken seri (streak) bozulmaz.
- **Uygulama**: Tarih veritabanına kaydedilirken veya istatistik çekilirken `CurrentTime - 4 Hours` mantığı uygulanır.

---

## 5. Testing Strategy

Kalite güvencesi (QA), `src/__tests__` altında merkezi bir yapıda yönetilir.

### 5.1. Test Piramidi

1.  **Unit Tests (Birim Testleri)**:
    - Algoritmaların matematiksel doğruluğu (Ör. `srs.test.ts` - Bloom çarpanlarının doğru hesaplanması).
    - İzole edilmiş fonksiyon testleri.

2.  **Integration Tests (Entegrasyon Testleri)**:
    - Repository ve Servis katmanlarının etkileşimi.
    - Mocklanan veritabanı çağrıları ile iş akışlarının testi.

3.  **Data Integrity Checks**:
    - AI tarafından üretilen JSON yapılarının şema uyumluluğu.
    - Kavram haritalarının (`ConceptMap`) tutarlılığı.

Bu doküman, AuditPath projesinin teknik omurgasını oluşturur ve kod tabanındaki değişikliklerin bu prensiplere sadık kalması esastır.
