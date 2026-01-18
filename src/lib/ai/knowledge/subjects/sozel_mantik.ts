import type { SubjectKnowledge } from "../types";

export const SOZEL_MANTIK: SubjectKnowledge = {
  id: "sozel_mantik",
  constitution: `Temel Mantık: Tablo doldurma becerisini değil, verideki olasılık kombinasyonlarını ve sayısal dağılım kısıtlarını yönetme becerisini test et.
* Soru Kurgusu (Algoritmik): Hikayeden önce bir "Sayısal Dağılım Denklemi" kur (Örn: 10 kişi, 5 bölüm; 1+2+3+2+2=10). Kısıtları, adayı belirli grupları "paket" (bölünemez) olarak düşünmeye zorlayacak şekilde yerleştir.
* Çeldirici Stratejisi: "Olasılık" vs. "Kesinlik": Sadece bir olasılıkta doğru olan durumu "Kesinlikle Doğrudur" sorusunda şıkka koy. İki farklı tabloda da doğrulanmayan durumları "Kesinlikle Yanlış" olarak kurgula.
* Zorunlu Senaryo: Koşullu Sabitleme (Domino Etkisi). "X, Y'ye giderse..." gibi belirsiz değişkenlerden birini sabitleyen ve bu sayede tüm tablonun çözülmesini sağlayan türetilmiş sorular.
* Bilişsel Düzey: Bloom Analiz ve Sentez basamağı.`,
  fewShot: `Soru: Bir bankanın Teftiş, Risk ve Kredi bölümlerine atanacak A, B, C, D, E, F ve G isimli yedi uzman yardımcısı ile ilgili şunlar bilinmektedir:
* Her bölüme en az iki, en fazla üç kişi atanmıştır.
* A ve B aynı bölüme atanmıştır.
* C, sadece G ile aynı bölümdedir.
* D ve E farklı bölümlere atanmıştır.
* F, Teftiş bölümüne atanmıştır.
Bu bilgilere göre, "Kredi" bölümüne aşağıdakilerden hangisi "kesinlikle" atanmıştır?
A) A B) C C) D D) E E) G

Geri Bildirim:
* Doğru Hüküm:
1. Toplam 7 kişi. Dağılım 2+2+3 şeklinde olmalıdır.
2. C ve G "sadece" ikisi aynı bölümdedir (ikili paket). Bu bölüm 2 kişilik olanlardan biridir.
3. A ve B aynı bölümdedir. F, Teftiştedir.
4. Eğer A ve B, F'nin yanına (Teftiş) giderse; Teftiş 3 kişi olur. Geriye 4 kişi kalır (C, G, D, E).
5. C ve G bir gruba (2 kişi), D ve E ise farklı gruplara gitmelidir.
6. Sonuç: C ve G bir bölümde, A-B-F bir bölümde, D ve E ayrı yerlerdedir.
* Çeldirici Analizi: B ve E şıkları olasılık dahilindedir ama "kesin" değildir.
* Ayırt Edici Çizgi: "Sadece iki kişi" kısıtının, o grubu diğer değişkenlere kapatan bir "duvar" görevi görmesi.
* Parşömen Referansı: Kombinatorik Dağılım ve Gruplandırma Mantığı.`
};
