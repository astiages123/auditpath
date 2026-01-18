import type { SubjectKnowledge } from "../types";

export const ULUSLARARASI_TICARET: SubjectKnowledge = {
  id: "uluslararasi_ticaret",
  constitution: `Temel Mantık: Teorik dış ticaret modelleri (Ricardo, H-O) ile modern korumacılık araçlarının (tarife, kota) refah üzerindeki etkilerini test et.
* Soru Kurgusu: Fırsat maliyetleri üzerinden üretim kararlarını sorgula. Gümrük tarifelerinin veya kotaların yerli üretici/tüketici üzerindeki net etkilerini (Dara Kaybı/Deadweight Loss) kurgula.
* Çeldirici Stratejisi: Mutlak Üstünlük vs. Karşılaştırmalı Üstünlük. Adayı, her iki malda da verimli olan bir ülkenin ticaret yapmaması gerektiği (mutlak üstünlük) yanılgısına düşür.
* Zorunlu Senaryo: Ticaret hadleri (N=(Px/Pm)×100) hesaplaması. Fiyat endeksleri üzerinden dış ticaret hadlerinin ülke lehine mi yoksa aleyhine mi geliştiğini yorumlat.
* Bilişsel Düzey: Bloom Analiz ve Değerlendirme basamağı.`,
  fewShot: `Soru: A ülkesi 1 birim emekle 10 birim Şarap veya 5 birim Kumaş üretebilmektedir. B ülkesi ise 1 birim emekle 2 birim Şarap veya 4 birim Kumaş üretebilmektedir.
Ricardo'nun Karşılaştırmalı Üstünlükler Teorisi'ne göre, dış ticaretin her iki ülke için de karlı olabilmesi için "1 birim Kumaş" karşılığında belirlenecek olan "Şarap" fiyatı (ticaret haddi) hangi aralıkta olmalıdır?
A) 0,5<Kumaş<2
B) 1<Kumaş<4
C) 0,5<Kumaş<0,8
D) 2<Kumaş<5
E) Her iki malda da A ülkesi üstün olduğu için ticaret gerçekleşmez.

Geri Bildirim:
* Doğru Hüküm: Fırsat maliyetleri hesaplanmalıdır. A ülkesinde 1 Kumaş = 2 Şarap. B ülkesinde 1 Kumaş = 0,5 Şarap. Ticaret haddi, bu iki iç fiyat oranı arasında olmalıdır (0,5<K<2).
* Çeldirici Analizi: E şıkkı "Mutlak Üstünlük" tuzağıdır. D şıkkı sayıların ters oranlanması sonucu oluşan yanlış hesaplamadır.
* Ayırt Edici Çizgi: Ticaretin "verimlilik farkı"ndan değil, "fırsat maliyeti farkı"ndan doğduğunu kavramak.
* Parşömen Referansı: David Ricardo - On the Principles of Political Economy and Taxation.`
};
