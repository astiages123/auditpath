import type { SubjectKnowledge } from "../types";

export const PARA_BANKA_KREDI: SubjectKnowledge = {
  id: "para_banka_kredi",
  constitution: `Temel Mantık: Makro iktisadi değişkenlerin finansal piyasalar üzerindeki transmisyon mekanizmasını ve matematiksel etkisini test et.
* Soru Kurgusu: TCMB araçlarının (APİ, reeskont, zorunlu karşılık) likidite ve faiz üzerindeki zincirleme etkisini sorgula. Fisher Etkisi gibi temel özdeşlikleri (i=r+π^e) kurguya dahil et.
* Çeldirici Stratejisi: Ters yönlü korelasyon manipülasyonu. Genişlemeci/Daraltıcı politikanın tahvil fiyatları ve faiz oranları üzerindeki zıt hareketlerini kullan.
* Zorunlu Senaryo: Para çarpanı ve kaydi para yaratma süreci. Zorunlu karşılık değişiminin toplam para arzı üzerindeki nihai matematiksel etkisi.
* Bilişsel Düzey: Bloom Uygulama ve Analiz basamağı.`,
  fewShot: `Soru: Ekonomide zorunlu karşılık oranının (rr) 0,20, nakit tercih oranının (c) 0,10 ve aşırı rezerv oranının (e) 0,05 olduğu bir ortamda; Merkez Bankası'nın piyasadan 500 Milyon TL tutarında tahvil alması (APİ), para arzını (M1) nihai olarak ne kadar artıracaktır?
A) 1.250 Milyon TL
B) 2.000 Milyon TL
C) 1.571 Milyon TL
D) 2.500 Milyon TL
E) 500 Milyon TL (Para arzı miktar teorisi gereği değişmez).

Geri Bildirim:
* Doğru Hüküm: Para çarpanı formülü: m = (1 + c) / (rr + e + c). Hesaplama: m = (1 + 0.10) / (0.20 + 0.05 + 0.10) = 1.10 / 0.35 ≈ 3.142. Artış: 500 × 3.142 = 1.571 Milyon TL.
* Çeldirici Analizi: A şıkkı sadece zorunlu karşılığı (1/rr) dikkate alan basit çarpanı kullanır. E şıkkı "Nötr para" varsayımıyla yanıltır.
* Ayırt Edici Çizgi: "Aşırı rezerv" ve "nakit tercihi"nin çarpan etkisini daraltan (paydayı büyüten) faktörler olduğunu anlamak.
* Parşömen Referansı: Milton Friedman - Para Arzı Süreci ve Çarpan Analizi.`
};
