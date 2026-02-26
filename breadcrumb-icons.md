# Breadcrumb İkon Sistemi

Bu tablo, uygulama genelindeki breadcrumb yapısında kullanılan ikonların hangi kriterlere göre seçildiğini göstermektedir.

| İkon           | Etiket / Sayfa Türü | Seçim Mantığı (Kriter)                         | Basamak (Level) |
| :------------- | :------------------ | :--------------------------------------------- | :-------------- |
| `Home`         | Anasayfa            | Sabit Başlangıç                                | Kök             |
| `Brain`        | Sorular (Quiz)      | URL'de `quiz` segmenti varsa                   | Değişken        |
| `LineSquiggle` | Yolculuk (Roadmap)  | URL'de `roadmap` segmenti varsa                | Değişken        |
| `Trophy`       | Başarılar           | URL'de `achievements` segmenti varsa           | Değişken        |
| `ChartScatter` | İstatistikler       | URL'de `statistics` segmenti varsa             | Değişken        |
| `HandCoins`    | Maliyet Analizi     | URL'de `costs` segmenti varsa                  | Değişken        |
| `BookCheck`    | Notlar (Ana Sayfa)  | URL ilk basamağı `notes` ise                   | 1. Seviye       |
| `book-marked`  | Ders Adı            | URL ikinci basamağı ise (Ders Slug)            | 2. Seviye       |
| `BookOpen`     | Konu Adı            | URL üçüncü basamak ve sonrası ise (Konu/Chunk) | 3+ Seviye       |
| `panel-left`   | Varsayılan          | Diğer tüm durumlar                             | -               |

> [!NOTE]
> İkonlar `lucide-react` kütüphanesinden alınmaktadır. Seçim mantığı `src/shared/components/GlobalBreadcrumb.tsx` içerisinde tanımlanmıştır.
