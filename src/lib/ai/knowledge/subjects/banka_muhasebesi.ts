import type { SubjectKnowledge } from "../types";

export const BANKA_MUHASEBESI: SubjectKnowledge = {
  id: "banka_muhasebesi",
  constitution: `Temel Mantık: Tekdüzen Hesap Planı (THP) 7 haneli kod yapısı ve bankanın bir "hizmet işletmesi" olduğu gerçeği üzerinden teknik kayıt yeteneğini test et.
* Soru Kurgusu: Mevduatın banka için Pasif (Borç), kredilerin ise Aktif (Varlık) olduğu ters mantığı işle. Kredi kullandırım, faiz tahakkuku veya döviz işlemleri odaklı kurgular kur.
* Çeldirici Stratejisi: Nazım Hesaplar ile Bilanço İçi Hesapların karıştırılması. Teminat mektubu gibi bilanço dışı (off-balance) riskleri aktif/pasif hesaplara kaydederek yanıltma yap.
* Zorunlu Senaryo: Reeskont ve Takipteki Alacaklar (NPL). Donuk alacaklar için karşılık ayrılması ve bu sürecin banka karlılığı/özkaynakları üzerindeki etkisi.
* Bilişsel Düzey: Bloom Uygulama basamağı.`,
  fewShot: `Soru: (X) Bankası, daha önce "120 Klasik Krediler" hesabında takip ettiği bir müşterisinin 100.000 TL tutarındaki kredisini, vadesinde ödenmemesi ve yasal sürenin dolması üzerine "Donuk Alacaklar" statüsüne almıştır. Banka, ihtiyatlılık gereği bu alacak için %20 oranında "Özel Karşılık" ayırmaya karar vermiştir.
Bu işlemin bankanın mali tabloları üzerindeki net etkisi aşağıdakilerden hangisidir?
A) Aktif toplamı 20.000 TL azalır, Öz Kaynaklar 20.000 TL azalır.
B) Aktif toplamı değişmez, sadece aktif içi hesap yer değişimi (aktif transferi) gerçekleşir.
C) Pasif toplamı 20.000 TL artar, kar 20.000 TL artar.
D) Nazım hesaplarda 100.000 TL'lik azalış meydana gelir.
E) Aktif toplamı 100.000 TL azalır, Karşılık Giderleri hesabı alacaklandırılır.

Geri Bildirim:
* Doğru Hüküm: Karşılık ayırma işlemi bir giderdir (Karşılık Giderleri (+)). Aktifte ise alacak tutarı brüt kalsa da, "Eksi" karakterli hesap olan "Karşılıklar (-)" artar. Dolayısıyla Net Aktif ve Dönem Karı (Öz Kaynak) 20.000 TL azalır.
* Çeldirici Analizi: B şıkkı sadece sınıflandırma değişimine odaklanıp karşılık etkisini görmezden gelir. E şıkkı gider hesabının çalışma yönünü (borç/alacak) karıştırır.
* Ayırt Edici Çizgi: Bankacılıkta karşılık ayırmanın "aktif düzenleyici hesap" üzerinden net varlık değerini düşürdüğünü anlamak.
* Parşömen Referansı: THP (Tekdüzen Hesap Planı) ve BDDK Karşılıklar Yönetmeliği.`
};
