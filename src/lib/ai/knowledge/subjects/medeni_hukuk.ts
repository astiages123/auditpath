import type { SubjectKnowledge } from "../types";

export const MEDENI_HUKUK: SubjectKnowledge = {
  id: "medeni_hukuk",
  constitution: `Temel Mantık: Kişiler, Aile, Eşya ve Miras hukuku disiplinlerinde kavramsal netliği ve hak/fiil ehliyeti sınırlarını test et.
* Soru Kurgusu: Soyut madde metni yerine; özellikle kısıtlılık, vesayet ve ehliyet türlerini içeren olay örgüleri kur. Fiil ehliyetinin sınırlarını vaka üzerinden sorgula.
* Çeldirici Stratejisi: Sakat işlemlerin hukuki sonuçları arasındaki farklar: "Yokluk", "Mutlak Butlan" ve "Nisbi Butlan". Miras hukukunda yasal mirasçı payları ile saklı pay oranları arasındaki teknik farklar.
* Zorunlu Senaryo: Miras paylaşım tablosu. Derece (zümre) sistemi üzerinden, sağ kalan eşin farklı zümrelerle birlikte mirasçı olduğu karmaşık pay ve saklı pay (mahfuz hisse) hesaplamaları.
* Bilişsel Düzey: Bloom Uygulama basamağı.`,
  fewShot: `Soru: Miras bırakan (M), geride eşi (E), annesi (A) ve babası (B) hayatta iken vefat etmiştir. (M), ölmeden önce yaptığı ölüme bağlı tasarruf ile mirasının tamamını bir vakfa bağışlamıştır. (M)'nin tereke değeri net 1.200.000 TL'dir.
Bu olayda eş (E) ve babanın (B) "Saklı Pay" (Mahfuz Hisse) miktarları aşağıdakilerden hangisinde doğru olarak verilmiştir?
A) (E): 600.000 TL, (B): 100.000 TL
B) (E): 300.000 TL, (B): 75.000 TL
C) (E): 450.000 TL, (B): 50.000 TL
D) (E): 300.000 TL, (B): 50.000 TL
E) (E): 600.000 TL, (B): Saklı payı yoktur.

Geri Bildirim:
* Doğru Hüküm: Sağ kalan eş, 2. zümre (ana-baba) ile mirasçı olduğunda yasal payı 1/2'dir. Eşin bu durumdaki saklı payı yasal payının tamamıdır (1/2). Ana ve babanın saklı payı ise yasal paylarının (1/4) yarısıdır (1/8).
* Çeldirici Analizi: A şıkkı eşin saklı payını 1. zümreye göre hesaplar. E şıkkı babanın saklı payını güncel mevzuat öncesi (eski hukuk) mantığıyla yok sayar.
* Ayırt Edici Çizgi: Yasal miras payı ile saklı pay oranı arasındaki çarpansal ilişkiyi kurmak.
* Parşömen Referansı: TMK Madde 496 (Zümre Sistemi) ve Madde 506 (Saklı Pay Oranları).`
};
