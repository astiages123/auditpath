import type { SubjectKnowledge } from "../types";

export const MATEMATIK: SubjectKnowledge = {
  id: "matematik",
  constitution: `Temel Mantık: Hızdan ziyade; karmaşık veriyi modelleme, sayısal ilişkileri sistematize etme ve tüm olasılıkları değerlendirme becerisini ölç.

A. Klasik Matematik Yaklaşımı:
* Soru Kurgusu: "Denklem çözme" yerine "Denklem kurma" becerisine odaklan. Sorular, sadece şıklardan giderek (deneme-yanılma) çözülemeyecek yapısal bir kurguya sahip olmalıdır. Fonksiyonel ilişkiler ve Sayılar Teorisi (Bölünebilme, asal çarpanlar vb.) değişkenler üzerinden sorgulanmalıdır.
* Çeldirici Stratejisi: Adayın bir kısıtı unutması üzerine kurgula (Örn: "x tam sayı" şartını gözden kaçırmak). İşlem hatasına çok müsait olan "ara basamak sonuçlarını" mutlaka şıklara yerleştir.

B. Sayısal Mantık Yaklaşımı:
* Soru Kurgusu: Birbirini kısıtlayan öncüller kullan. "Kesinlikle doğrudur" veya "Hangisi olamaz?" kökleriyle adayı tüm olasılıkları değerlendirmeye zorla.
* Çeldirici Stratejisi: Eksik veri tuzağı: Sadece belirli senaryolarda doğru olan ama genel kuralı sağlamayan seçenekleri en güçlü çeldirici yap.

C. Olmazsa Olmaz Soru Tipleri:
* Veri Analizi: Tablo/Grafik verilerinin yorumlanarak bir probleme dönüştürülmesi.
* Sıralama ve Eşleştirme: 3-4 farklı değişkenin bir matris veya tablo oluşturularak çözüldüğü kurgular.
* Sayısal Modelleme: Bir iş sürecinin veya ekonomik bir senaryonun matematiksel denkleme döküldüğü problem türleri.
* Bilişsel Düzey: Bloom Analiz ve Değerlendirme basamağı.`,
  fewShot: `A. Klasik Matematik (Problem Çözme ve Modelleme)
Soru: Bir tekstil atölyesinde üretilen her bir gömlek için sabit bir kesim maliyeti ve değişken bir dikim maliyeti bulunmaktadır.
* 40 gömlek üretildiğinde gömlek başına düşen toplam maliyet 120 TL'dir.
* 100 gömlek üretildiğinde gömlek başına düşen toplam maliyet 102 TL'dir.
Buna göre, bu atölyede 200 gömlek üretilmesi durumunda, bir gömleğin dikim maliyeti sabit kalmak şartıyla, gömlek başına düşen toplam maliyet kaç TL olur?
A) 90 B) 93 C) 96 D) 98 E) 99

Geri Bildirim:
* Doğru Hüküm: Sabit maliyete S, değişken (dikim) maliyetine D diyelim. Denklem 1: (S + 40D)/40 = 120 → S + 40D = 4800. Denklem 2: (S + 100D)/100 = 102 → S + 100D = 10200. Fark: 60D = 5400 → D = 90. S = 1200 TL. 200 gömlek: (1200 + 200×90)/200 = 19200/200 = 96 TL.
* Çeldirici Analizi: 90 TL sadece dikim maliyetidir. 99 TL ise doğrusal azalmanın her adımda aynı oranda olacağı yanılgısıdır.
* Ayırt Edici Çizgi: Gömlek sayısı arttıkça "birim başına düşen sabit maliyetin" azaldığını, ancak "dikim maliyetinin" toplam içinde sabit kaldığını modellemek.
* Parşömen Referansı: Doğrusal Denklem Sistemleri ve Maliyet Fonksiyonu Modelleme.

B. Sayısal Mantık (Sembolik İlişkiler)
Soru: Aşağıdaki eşitliklerde "daire (◯)", "üçgen (△)" ve "kare (□)" sembolleri pozitif birer tam sayının yerine kullanılmıştır:
◯+△=□
◯−△=△
Buna göre (△+□)/◯ ifadesinin değeri kaçtır?
A) 1 B) 2 C) 3 D) 4 E) 5

Geri Bildirim:
* Doğru Hüküm: İkinci denklemden ◯=2△. İlk denklemde yerine: 2△+△=□ → 3△=□. İstenen: (3△+2△)/△ = 5△/△ = 5.
* Çeldirici Analizi: 3 cevabı sadece karenin üçgene oranını bulanlardır. 2 cevabı dairenin üçgene oranını temsil eder.
* Ayırt Edici Çizgi: Semboller arası hiyerarşiyi tek değişken cinsinden ifade ederek sadeleştirme.
* Parşömen Referansı: Değişken Değiştirme ve Oran-Orantı Mantığı.`
};
