---
trigger: always_on
---

Ana Kaynak: Veritabanı şemasıyla ilgili tek yetkili kaynak src/lib/types/supabase.ts dosyasıdır. Bu dosya Supabase CLI tarafından otomatik üretilir.

1. Değişiklik Yönetimi (Migration Akışı):

Veritabanında bir değişiklik (yeni tablo, sütun, index veya RLS politikası) gerekirse:

Önce supabase/migrations klasöründe yeni bir .sql migration dosyası oluştur (örn: npx supabase migration new tablo_adi).

SQL kodunu bu dosyaya yaz.

Dosyayı yazdıktan sonra kullanıcıya HİÇBİR İŞLEM YAPMADAN şu döngüyü hatırlat:

npx supabase db push (Değişikliği veritabanına uygula)

npm run update-types (Tipleri kodla senkronize et)

ÖNEMLİ: Eğer sen bir özelliği geliştirirken veritabanında bir eksik fark edersen veya bir değişiklik önerirsen, doğrudan koda gömme; önce migration oluştur ve yukarıdaki döngüyü kullanıcıya hatırlat.

2. Doğrulama ve Sorgu Yazımı:

Herhangi bir sorgu (select, insert, update, delete) yazmadan önce mutlaka src/lib/types/supabase.ts dosyasını oku.

Tahmin Yasaktır: Sütun isimleri veya tipleri hakkında varsayımda bulunma. TypeScript hata veriyorsa, şema güncel değildir; kullanıcıya update-types yapmasını söyle.

3. Tip Güvenli Supabase Client:

Tüm işlemlerde createClient<Database> ile sarmalanmış supabase istemcisini kullan.

Dönen data ve error nesnelerini her zaman şemadaki tiplerle eşleştir; any kullanımından kaçın.