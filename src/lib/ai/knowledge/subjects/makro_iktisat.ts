import type { SubjectKnowledge } from "../types";

export const MAKRO_IKTISAT: SubjectKnowledge = {
  id: "makro_iktisat",
  constitution: `Temel Mantık: Toplam arz-talep dengesini ve politika etkinliklerini IS-LM ve AS-AD modelleriyle matematiksel/grafiksel olarak ölç.
* Soru Kurgusu: Ekonomik şokların (petrol fiyatı, teknoloji vb.) modeller üzerindeki dinamik etkisini sorgula. "Dışlama Etkisi (Crowding-out)" gibi kavramları mekanizma odaklı sor.
* Çeldirici Stratejisi: Kısa vs. Uzun Dönem ayrımı. Genişlemeci politikanın kısa dönemde hasıla, uzun dönemde fiyat artışı (Klasik dikotomi) yaratması tuzağını kullan. Çarpan hesaplamalarında sızıntıları (vergi, ithalat) ihmal eden hatalı sonuçları şıklara koy.
* Zorunlu Senaryo: Politika Etkinliği Analizi. Likidite tuzağı (LM yatay) gibi uç durumlarda maliye/para politikasının etkinliğini test eden modeller.
* Bilişsel Düzey: Bloom Analiz ve Sentez basamağı.`,
  fewShot: `Soru: Bir ekonomide para talebinin faiz esnekliğinin sonsuz (e_mi=∞) olduğu "Likidite Tuzağı" durumu geçerlidir.
Bu varsayım altında, hükümetin otonom kamu harcamalarını (G) artırması durumunda toplam hasıla (Y) ve faiz oranları (i) üzerindeki etki nasıl gerçekleşir?
A) LM eğrisi yatay olduğu için kamu harcamaları "tam dışlama" (crowding-out) yaratır; hasıla değişmez.
B) Para arzı artışı faizleri düşüremeyeceği için maliye politikası tamamen etkisizdir.
C) IS eğrisi sağa kayar, faizler değişmez ve hasıla çarpan etkisiyle maksimum düzeyde artar.
D) Yatırımın faiz esnekliği sıfır olduğu için sadece para politikası etkilidir.
E) Fiyatlar genel düzeyi düşerken reel para arzı artar ve ekonomi kendiliğinden tam istihdama döner.

Geri Bildirim:
* Doğru Hüküm: Likidite tuzağında LM eğrisi yataydır. Kamu harcaması artışı IS'i sağa kaydırır. Faizler yükselmediği için yatırımlar dışlanmaz ve maliye politikası en yüksek etkinlikte çalışır.
* Çeldirici Analizi: A şıkkı dışlamayı "Klasik durum" (LM dikey) ile karıştırır. B şıkkı para politikasının etkisizliğini maliye politikasına mal eder.
* Ayırt Edici Çizgi: LM eğrisinin eğimi ile maliye politikasının "dışlama etkisi" arasındaki ters yönlü ilişki.
* Parşömen Referansı: Keynesyen İktisat - Likidite Tercihi Teorisi.`
};
