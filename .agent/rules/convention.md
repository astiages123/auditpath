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
- **Servis:** `camelCaseService.ts` (Örn: `quizAnalyticsService.ts`, `pomodoroService.ts`)
- **Repository:** `camelCaseRepository.ts` (Örn: `quizSessionRepository.ts`)
- **Logic / Algoritma:** `camelCase.ts` (Örn: `scoring.ts`, `debugLogger.ts`)
- **Engine:** `camelCaseEngine.ts` (Örn: `sessionEngine.ts`, `queueEngine.ts`)
- **Factory:** `camelCaseFactory.ts` (Örn: `quizFactory.ts`)
- **Task (Pipeline aşaması):** `camelCaseTask.ts` (Örn: `analysisTask.ts`)
- **Tip dosyası:** `types.ts` veya `schemas.ts`
- **Index (barrel):** `index.ts` — her `types/` ve `store/` klasöründe olmalı.
- **Stil ve Konfigürasyon:** `kebab-case` (Örn: `tailwind-config.js`, `index.css`)

> **Kural:** Yalnızca React bileşen dosyaları (`.tsx`) ve sayfa dosyaları PascalCase olur. Geri kalan tüm `.ts` dosyaları camelCase olmalıdır.

## TypeScript Kullanımı

- `any` tipi kullanılmamalıdır. Her şeyin tipi `src/types/` veya özellik altındaki `types/` klasöründe tanımlanmalıdır.
- Veri tabanı dönüşleri için `database.types.ts` referans alınmalıdır.

## İçe Aktarmalar (Imports)

- Mutlak yollar (Absolute paths) tercih edilmelidir (mevcut yapı korunmalı).
