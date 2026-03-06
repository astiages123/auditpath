---
trigger: always_on
---

# İsimlendirme ve Kodlama Standartları

## Klasör İsimlendirme

- Tüm klasörler `kebab-case` kullanır (Örn: `quiz-view`, `use-quiz`).

## Dosya İsimlendirme

- **React Bileşeni (`.tsx`):** `PascalCase.tsx` (Örn: `QuizCard.tsx`, `TimerDisplay.tsx`)
- **Sayfa (`.tsx`):** `PascalCase.tsx` (Örn: `Quiz.tsx`, `Home.tsx`)
- **Hook:** `useCamelCase.ts` (Örn: `useQuiz.ts`, `usePomodoro.ts`)
- **Store:** `useCamelCaseStore.ts` (Örn: `useQuotaStore.ts`, `useTimerStore.ts`)
- **Servis:** `camelCaseService.ts` (Örn: `quizSubmissionService.ts`, `pomodoroService.ts`)
- **Repository:** `camelCaseRepository.ts` (Örn: `quizSessionRepository.ts`)
- **Logic / Algoritma:** `camelCase.ts` (Örn: `scoring.ts`, `debugLogger.ts`)
- **Engine:** `camelCaseEngine.ts` (Örn: `sessionEngine.ts`, `queueEngine.ts`)
- **Factory:** `camelCaseFactory.ts` (Örn: `quizFactory.ts`)
- **Task (Pipeline aşaması):** `camelCaseTask.ts` (Örn: `analysisTask.ts`)
- **Tip dosyası:** `types.ts` veya `schemas.ts`
- **Index (barrel):** `index.ts` sadece gerçekten tüketilen klasörlerde tutulmalı. Boş veya tek amaçlı klasör için zorunlu değildir.
- **Migration (SQL):** `YYYYMMDDHHMMSS_<ne_yaptigini_anlatan_isim>.sql` (Örn: `20260225120000_add_notifications_table.sql`)
- **Stil ve Konfigürasyon:** `kebab-case` (Örn: `tailwind-config.js`, `index.css`)

> **Kural:** Yalnızca React bileşen dosyaları (`.tsx`) ve sayfa dosyaları PascalCase olur. Geri kalan tüm `.ts` dosyaları camelCase olmalıdır.

## TypeScript Kullanımı

- **`any` tipi KESİNLİKLE yasaktır.** Kullanılmamalıdır. Eğer kullanılacak verinin tipi henüz belli değilse `unknown` kullanılmalı ve çalışma zamanı doğrulama (runtime validation, örn: Zod) yapılmalıdır. Her şeyin tipi `src/types/` veya özellik altındaki `types/` klasöründe tanımlanmalıdır.
- Veri tabanı dönüşleri için `database.types.ts` referans alınmalıdır.
- **Kimlik Sözlüğü:** Aksi ispat edilmedikçe `courseId`/`categoryId`/`chunkId` gibi `*Id` alanları DB kimliği (çoğunlukla UUID) taşır. Public URL alanları `courseSlug`, `categorySlug`, `topicSlug` olarak adlandırılmalıdır.
- **Alias Yasağı:** Aynı akışta aynı varlık için `courseId`, `dbCourseId`, `courseSlug` gibi belirsiz isimler birlikte kullanılmamalıdır. Gerekirse açık sözlük kurulmalı: `courseId` = DB UUID, `courseSlug` = URL slug.
- **Dosya Boyutu:**
  - **Servis ve Logic dosyaları (`.ts`):** Fonksiyonlar birbirinden bağımsız olduğu sürece **1000 satıra kadar** kabul edilebilir. Bölümler arasında boş satır bırakılır; `// === SECTION ===` banner comment'leri kullanılmaz. Bu dosyalarda AI yalnızca ilgili fonksiyonu okur, tüm dosyayı kavramak gerekmez. Bölmek ortak import/tip tekrarına yol açacağı için tercih edilmez.
  - **Component dosyaları (`.tsx`):** İçinde **birbirinden bağımsız** component'lar varsa (ortak state veya helper paylaşmıyorlarsa) her component kendi dosyasına ayrılmalıdır. Ortak state veya helper paylaşan component'lar aynı dosyada kalabilir.
  - **Veri dosyaları:** Sabit veri listeleri (`definitions.ts`, `config.ts` gibi) satır sınırına tabi değildir.

## İçe Aktarmalar (Imports)

- Mutlak yollar (Absolute paths) tercih edilmelidir (mevcut yapı korunmalı).
