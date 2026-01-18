import type { SubjectKnowledge } from "../types";

export const FINANS_MATEMATIGI: SubjectKnowledge = {
  id: "finans_matematigi",
  constitution: `Temel Mantık: Paranın Zaman Değerini (TVM) ve hesaplama hassasiyetini, gerçekçi yatırım/borçlanma senaryoları üzerinden test et.
* Soru Kurgusu: Efektif/Nominal faiz geçişlerini veya anüite (taksitli ödeme) problemlerini içeren vakalar kur. Faiz oranı (i), dönem (n) ve nakit akışlarını net bir zaman çizelgesiyle ver.
* Çeldirici Stratejisi: Bileşiklendirme Sıklığı Hataları: Yıllık faiz verip dönemlik (n ve i revizyonu gereken) hesaplama yaptırırken hata yapan adayı hedefle. Peşin ödemeli (Annuity Due) ile dönem sonu (Ordinary Annuity) formül farklarını (1+i çarpanı) kullan.
* Zorunlu Senaryo: PV ve FV Dönüşümleri. Karmaşık bir nakit akış tablosu vererek projenin bugünkü değerini PV = Σ[Ct/(1+r)^t] hesaplat.
* Bilişsel Düzey: Bloom Uygulama basamağı.`,
  fewShot: `Soru: Bir yatırımcı, 5 yıl boyunca her 3 ayda bir (dönem sonlarında) 20.000 TL'yi yıllık %16 nominal faiz oranıyla, üçer aylık bileşik faiz yürüten bir fon hesabına yatıracaktır.
5. yılın sonundaki birikmiş tutarın (Gelecek Değer) hesaplanması için gerekli olan efektif dönem faiz oranı (i) ve toplam dönem sayısı (n) aşağıdakilerden hangisinde doğru verilmiştir?
A) i=0.16; n=5
B) i=0.04; n=5
C) i=0.04; n=20
D) i=0.0133; n=60
E) i=0.16; n=20

Geri Bildirim:
* Doğru Hüküm: Yıllık nominal faiz (%16) üçer aylık periyotlara bölünmelidir: 16/4=4 → 0.04. Toplam yıl sayısı ile yıldaki periyot sayısı çarpılmalıdır: 5×4=20 dönem.
* Çeldirici Analizi: D şıkkı, faizi aylık gibi hesaplayan adayları hedefler. B şıkkı, periyot sayısını yıl olarak bırakan hatalı mantıktır.
* Ayırt Edici Çizgi: "Faiz oranı" ile "Ödeme periyodu"nun zaman birimi bazında mutlak uyum zorunluluğu.
* Parşömen Referansı: Anüite Gelecek Değer Formülü: FV = A × [(1+i)^n - 1] / i`
};
