---
trigger: always_on
---

# Clean-Code Kuralları

## Hata Yönetimi

- `try/catch` blokları service ve logic katmanında kullanılmaz. Hatalar olduğu gibi fırlatılır.
- Yakalamak hook veya component'in sorumluluğundadır. Hook'ta `try/catch` + `sonner` bildirimi yapılır.
- `console.error`, `console.log`, `console.warn` üretim kodunda bulunmaz.
- `catch` bloğu içinde `return false` veya default değer dönen pattern kullanılmaz.
- Dolaylı flag pattern'ı kullanılmaz:
  - YANLIŞ: `let successFlag = false; ... if (!successFlag) throw`
  - DOĞRU: `const result = await someCall(); if (!result.success) throw`

## Değişken İsimlendirme

- 1 ve 2 harfli değişken isimleri kullanılmaz. Tek istisna: `i`, `j`, `k` loop index'leri.
- Kısaltmalar kullanılmaz, tam isim yazılır:
  - `s` → `session`
  - `d` → `date`
  - `agg` → `aggregate`
  - `brk` → `breakSeconds`
  - `eff` → `efficiencyScore`
  - `vp` → `videoProgress`
  - `res` → `result` veya `response`
  - `val` → bağlama göre tam isim
  - `cb` → `callback`
  - `data` tek başına kullanılmaz → `sessionsData`, `quizData` gibi içeriği açıklayan isim
- Boolean değişkenler `is`, `has`, `should` prefix'i taşır:
  - YANLIŞ: `loading`, `open`, `error`
  - DOĞRU: `isLoading`, `isOpen`, `hasError`

## Comment ve Dokümantasyon

- `// ===`, `// ---`, `// ***` ile başlayan dekoratif section banner comment'ler kullanılmaz.
- Bölümler arasında boş satır bırakılır, banner gerekmez.
- `/** ... */` JSDoc comment'leri public ve export edilen fonksiyonlarda korunur.
- `// TODO`, `// FIXME` aksiyon comment'leri korunur.
- Kodun içini açıklayan tek satır `//` comment'ler korunur.

## Tip Tanımları

- Aynı inline tip birden fazla yerde kullanılıyorsa dosyanın üstünde `type` olarak tanımlanır.
- Dosya içi yardımcı type'lar export edilmez.
- `any` tipi kesinlikle yasaktır. Bilinmeyen tipler için `unknown` kullanılır ve Zod ile doğrulanır.

## Fonksiyon Sorumluluğu

- Bir fonksiyon tek bir şey yapar.
- Yardımcı (private) fonksiyonlar export edilmez, dosya içi kalır.
- İç içe `if` bloklarında erken `return` (early return) tercih edilir.

## Component Kuralları

- Event handler'lar `handle` prefix'i taşır: `handleSubmit`, `handleChange`.
- JSX içinde 2 satırı geçen inline `() => {}` fonksiyonlar component body'sine taşınır ve isimlendirilir.
- Gereksiz `<div>` wrapper'lar `<>` Fragment ile değiştirilir.
- Tek child olan `<>` Fragment'lar kaldırılır.
- Üçlü operatör içindeki JSX bloğu 3 satırı geçiyorsa ayrı bir değişkene alınır.

## Store Kuralları

- Zustand store interface'lerinde inline section comment kullanılmaz.
- Kullanılmayan parametreler (`_get` gibi) kaldırılır.
