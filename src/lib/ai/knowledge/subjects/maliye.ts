import type { SubjectKnowledge } from "../types";

export const MALIYE: SubjectKnowledge = {
  id: "maliye",
  constitution: `Temel Mantık: Teorik iktisat prensipleri ile pozitif vergi hukukunun kesişim kümesini maliye politikası araçları üzerinden test et.
* Soru Kurgusu: Kamu harcama/gelir dengesini maliye politikası odağında sorgula. "Verginin yansıması" gibi dinamik süreçleri, piyasa yapılarıyla (tam rekabet, monopol vb.) ilişkilendirerek kurgula.
* Çeldirici Stratejisi: Vergi hukukundaki zamanaşımı türlerinin (tahakkuk vs. tahsil) karıştırılması veya zıt mali görüşlerin (Pigou vs. Coase) birbirine yaklaştırılarak sunulması.
* Zorunlu Senaryo: Vergi yansıması ve insidans analizi. Arz ve talep esnekliklerine göre vergi yükünün nihai dağılımına dair grafik veya vaka soruları.
* Bilişsel Düzey: Bloom Analiz ve Değerlendirme basamağı.`,
  fewShot: `Soru: Talebin fiyat esnekliğinin tam esnek (ed=∞) ve arzın fiyat esnekliğinin düşük (inelastik) olduğu bir piyasada, birim başına alınan bir spesifik verginin yansıması ve vergi yükü dağılımı hakkında aşağıdakilerden hangisi doğrudur?
A) Verginin tamamı tüketiciye yansıtılır; vergi yükü tüketici üzerindedir.
B) Verginin tamamı üretici üzerinde kalır; fiyat değişmez.
C) Vergi yükü, esnekliği düşük olan tüketici ve üretici arasında eşit paylaşılır.
D) Fiyat, vergi miktarından daha fazla artar (aşırı yansıma).
E) Vergi, talep esnek olduğu için devlet tarafından sübvansiyonla geri ödenir.

Geri Bildirim:
* Doğru Hüküm: Vergi yansıması kuralına göre; vergi yükü, esnekliği "düşük" olan tarafın üzerinde kalır. Talep tam esnekse (ed=∞), tüketici fiyat artışına sonsuz tepki verir, bu yüzden satıcı fiyatı artıramaz ve verginin tamamını üretici karşılar.
* Çeldirici Analizi: A şıkkı genel yanılgıdır; genellikle verginin tüketiciye yansıtıldığı sanılır ancak tam esneklik bu durumu engeller.
* Ayırt Edici Çizgi: "Esneklik ile vergi yükü ters orantılıdır" altın kuralının uç (ekstrem) durumlarda uygulanması.
* Parşömen Referansı: Dalton-Musgrave Kanunu (Vergi İnsidansı ve Esneklik İlişkisi).`
};
