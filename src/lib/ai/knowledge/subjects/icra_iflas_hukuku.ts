import type { SubjectKnowledge } from "../types";

export const ICRA_IFLAS_HUKUKU: SubjectKnowledge = {
  id: "icra_iflas_hukuku",
  constitution: `Temel Mantık: Şekli hukukun katı kurallarını, kronolojik süreç takibini ve hak düşürücü süreleri test et.
* Soru Kurgusu: Takip yollarının başlangıcından sonuna kadar olan süreci sorgula. Bir "usuli hata" (Örn: Yanlış merciye başvuru) verip sonucunu (Şikayet mi, İtiraz mı?) sor.
* Çeldirici Stratejisi: Süre ve Merci manipülasyonu. 3, 7 ve 15 günlük süreleri birbiriyle değiştir. İcra Mahkemesi ile Genel Mahkemelerin (Asliye Hukuk vb.) görev alanlarını karıştır.
* Zorunlu Senaryo: Sıra cetveli ve paraların paylaştırılması. Rüçhanlı (öncelikli) alacaklar ve haciz sırasına göre karmaşık ödeme hesaplamaları.
* Bilişsel Düzey: Bloom Uygulama ve Analiz basamağı.`,
  fewShot: `Soru: Genel haciz yoluyla takipte, borçluya gönderilen ödeme emrine karşı borçlu, borcun miktarının hatalı olduğunu ileri sürerek 5 gün içinde icra dairesine itirazda bulunmuştur. Ancak alacaklı, bu itirazın haksız olduğunu iddia ederek takibe devam etmek istemektedir.
Bu aşamada alacaklının elinde bir "adi senet" (İİK m.68 kapsamına girmeyen) bulunduğu varsayıldığında, takibin devamını sağlamak için başvurması gereken hukuki yol ve süresi hangisidir?
A) 6 ay içinde İcra Mahkemesi'nden "İtirazın Kaldırılması" talep edilmelidir.
B) 1 yıl içinde Genel Mahkemelerde "İtirazın İptali" davası açılmalıdır.
C) 7 gün içinde İcra Mahkemesi'nden "Takibin Devamı" kararı alınmalıdır.
D) 15 gün içinde borçluya karşı "Menfi Tespit Davası" açılmalıdır.
E) İtiraz 5. günde yapıldığı için süresiz şikayet yoluna gidilmelidir.

Geri Bildirim:
* Doğru Hüküm: Eğer alacaklının elindeki belge İİK m.68-68a anlamında "kesin" bir belge değilse, İcra Mahkemesi'nden dar yetkili "kaldırma" isteyemez. Genel mahkemede 1 yıl içinde "İtirazın İptali" davası açmalıdır.
* Çeldirici Analizi: A şıkkı "itirazın kaldırılması" için gereken belge şartını (m.68) sorgular. E şıkkı "şikayet" ile "itiraz" arasındaki farkı karıştırır.
* Ayırt Edici Çizgi: Alacaklının elindeki belgenin niteliğinin (adi vs. resmi), görevli mahkemeyi ve başvuru yolunu belirlemesi.
* Parşömen Referansı: İİK Madde 66 (İtirazın Hükmü) ve Madde 67 (İtirazın İptali).`
};
