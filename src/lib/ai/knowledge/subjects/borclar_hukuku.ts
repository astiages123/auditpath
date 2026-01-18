import type { SubjectKnowledge } from "../types";

export const BORCLAR_HUKUKU: SubjectKnowledge = {
  id: "borclar_hukuku",
  constitution: `Temel Mantık: İrade beyanı, sorumluluk rejimleri ve dürüstlük kuralı (TMK m.2) çerçevesinde borç ilişkisinin doğumunu ve sona ermesini test et.
* Soru Kurgusu: İrade sakatlıkları (hata, hile, korkutma) veya borçlu temerrüdü üzerine vaka bazlı kökler kur. Doğrudan tanım yerine süreç odaklı (Örn: Tevdi hakkı kullanım şartları) soruları tercih et.
* Çeldirici Stratejisi: "Def'i" ve "İtiraz" ayrımı. Zamanaşımı (def'i) ile hak düşürücü sürenin (itiraz) yer değiştirmesi. Sebepsiz zenginleşme ile haksız fiil tazminat kapsamlarının karıştırılması.
* Zorunlu Senaryo: Yetkisiz Temsil. Bir kişinin yetkisini aşarak yaptığı işlemin akıbetini (askıda geçersizlik) ve tarafların bu süreçteki haklarını sorgulayan vakalar.
* Bilişsel Düzey: Bloom Uygulama ve Analiz basamağı.`,
  fewShot: `Soru: (A), mülkiyeti (B)'ye ait olan bir antika vazoyu, (B)'den herhangi bir temsil yetkisi almamasına rağmen, (B)'nin temsilcisiymiş gibi (C)'ye 50.000 TL bedelle satmış ve teslim etmiştir. (B) durumu öğrendiğinde sessiz kalmış, (C) ise vazonun (B) tarafından onaylanmasını beklemektedir.
Bu "Yetkisiz Temsil" vakasında sözleşmenin akıbeti ve tarafların hakları hakkında aşağıdakilerden hangisi doğrudur?
A) Sözleşme yapıldığı andan itibaren kesin hükümsüzdür.
B) Sözleşme "askıda geçersiz"dir; (B) onay (icazet) vermediği sürece (C) sözleşmeyle bağlı değildir ve her an sözleşmeden dönebilir.
C) (B) onay verirse sözleşme baştan itibaren geçerli hale gelir; (B) onay vermezse (A), (C)'nin bu yüzden uğradığı menfi zararı gidermekle yükümlüdür.
D) (C) iyiniyetli ise mülkiyeti taşınır rehni hükümleri uyarınca kendiliğinden kazanır.
E) (B)'nin sessiz kalması "zımni icazet" sayılır ve sözleşme 10 yılın sonunda kesinleşir.

Geri Bildirim:
* Doğru Hüküm: Yetkisiz temsilcinin yaptığı işlem askıda geçersizdir (TBK m.46). Temsil olunan (B) onay vermezse işlem geçersiz kalır ve temsilci (A), karşı tarafın (C) zararını tazmin eder.
* Çeldirici Analizi: B şıkkı (C)'nin "her an" dönebileceğini söyler; oysa (C), (B)'ye onay için makul bir süre tanımak zorundadır. E şıkkı sessiz kalmayı icazet sayarak yanıltır; icazet açık veya örtülü olabilir ama sessizlik kural olarak ret sayılır.
* Ayırt Edici Çizgi: Askıda geçersizlik sürecinde "onay" kurumunun geçmişe etkili (retroaktif) gücü.
* Parşömen Referansı: Türk Borçlar Kanunu Madde 46 ve 47.`
};
