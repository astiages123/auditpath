Görev: @CourseList.tsx bileşenindeki aksiyon butonları arasına QuizEngine tetikleyicisi ekle ve ilgili modal/panel akışını oluştur.

1. UI Değişikliği (@CourseList.tsx):

{/* Middle Section: Action Buttons */} kısmını bul.

Mevcut "Not" butonu ile "İstatistik" butonu arasına, Lucide-React kütüphanesinden Brain ikonuna sahip yeni bir buton ekle.

Bu butonun tasarımı diğer butonlarla tutarlı (Tailwind CSS) olmalı. Tıklandığında QuizModal bileşenini tetiklemeli.

2. Konu Seçim Modalı (QuizModal):

Butona tıklandığında açılan bir Modal tasarla.

Veri Çekme: Supabase üzerinden, seçilen dersin (H1) note_chunks tablosundaki benzersiz section_title (H3) değerlerini getir ve bir liste (Konu Listesi) olarak göster.

3. Konu Detay Paneli:

Kullanıcı listeden bir konuya tıkladığında, modal içinde bir "Konu Detay Paneli" açılmalı.

Bu panelde şunlar yer almalı:

Mevcut Soru Sayısı: Veritabanındaki questions tablosunda bu konuya ait kaç soru olduğu sorgulanıp gösterilmeli.

"Soru Üret" Butonu: Daha önce kurguladığımız Xiaomi MiMo V2 Flash motorunu tetikleyecek ana buton.

4. Mantıksal Akış ve State Yönetimi:

selectedCourse ve selectedTopic durumlarını (state) yönet.

Soru üretme işlemi sırasında şık bir loading (yükleniyor) animasyonu göster.

Üretilen soru başarıyla geldiğinde, kullanıcıyı otomatik olarak Quiz ekranına yönlendir veya soruyu modal içinde göster.

Teknik Not: Tüm veritabanı işlemlerini Supabase istemcisiyle asenkron olarak yap ve TypeScript tip tanımlamalarına (Interfaces) sadık kal.