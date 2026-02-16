---
trigger: always_on
---

# Mimari ve Dosya Yapısı Kuralları

- **Özellik Bazlı Yapı:** Her ana işlev `src/features/` altında kendi klasörüne sahip olmalıdır.
- **Klasör İçeriği:** Bir özelliğin (feature) içinde şu alt klasörler bulunmalıdır:
  - `components/`: Sadece o özelliğe özel arayüz parçaları.
  - `hooks/`: Özelliğe özel mantıksal işlevler (useQuiz, useAuth vb.).
  - `services/`: Veri çekme ve API işlemleri.
  - `types/`: TypeScript tanımlamaları.
- **Paylaşılan Bileşenler:** Birden fazla özellik tarafından kullanılan parçalar `src/components/layout/` veya `src/shared/` altına konulmalıdır.
- **UI Kütüphanesi:** Yeni bir görsel bileşen eklenecekse öncelikle `src/components/ui/` (Shadcn) kontrol edilmeli, yoksa oraya eklenmelidir.
