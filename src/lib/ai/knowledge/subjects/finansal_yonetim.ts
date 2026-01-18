import type { SubjectKnowledge } from "../types";

export const FINANSAL_YONETIM: SubjectKnowledge = {
  id: "finansal_yonetim",
  constitution: `Temel Mantık: İşletme yatırım ve finansman kararlarının rasyonalitesini, finansal tablo verileri üzerinden analiz et.
* Soru Kurgusu: Oran analizi (Ratio Analysis) odaklı git. Sadece oran sormak yerine, likidite sıkışıklığı gibi bir sorunun sermaye maliyeti (WACC) veya rasyolar üzerindeki kombine etkisini sorgula.
* Çeldirici Stratejisi: Rasyolar Arası Ters Korelasyon. Finansal kaldıraç etkisi (Borçlanmanın ROE'yi artırması ama iflas riskini tetiklemesi) gibi çift taraflı dinamikleri seçeneklerde manipüle et.
* Zorunlu Senaryo: Sermaye Bütçelemesi. İki proje teklifi arasında; risk, iskonto oranı ve nakit akış verilerine göre NPV, IRR veya Payback kriterleriyle karar verdiren senaryolar.
* Bilişsel Düzey: Bloom Analiz ve Değerlendirme basamağı.`,
  fewShot: `Soru: Bir firmanın toplam varlıkları 1.000.000 TL, borç/öz kaynak oranı ise 1'dir. Firmanın borçlanma maliyeti %10, vergi oranı %20'dir. Firmanın Faiz ve Vergi Öncesi Karı (FVÖK) 200.000 TL olarak gerçekleşmiştir.
Bu veriler ışığında, firmanın Öz Kaynak Karlılığı (ROE) ve finansal kaldıracın etkisi hakkında hangisi söylenebilir?
A) ROE %15'tir; borçlanma öz kaynak karlılığını pozitif yönde etkilemiştir.
B) ROE %12'dir; firmanın borçlanma maliyeti varlık karlılığından düşük olduğu için kaldıraç olumludur.
C) ROE %24'tür; firma aşırı riskli bir finansman yapısına sahiptir.
D) ROE %10'dur; borçlanma maliyeti kara eşit olduğu için kaldıraç etkisi nötrdür.
E) ROE %20'dir; firma sadece öz kaynakla çalışsaydı karlılık daha yüksek olurdu.

Geri Bildirim:
* Doğru Hüküm: Öz Kaynak = 500.000 TL, Borç = 500.000 TL. Faiz Gideri = 500.000×0.10 = 50.000 TL. Vergi Öncesi Kar = 200.000−50.000 = 150.000 TL. Net Kar = 150.000×(1−0.20) = 120.000 TL. ROE = 120.000/500.000 = %24.
* Çeldirici Analizi: B şıkkı, vergi etkisini veya faizi yanlış hesaplayanları hedefler. E şıkkı, kaldıraç etkisinin mantığını ters kurgular.
* Ayırt Edici Çizgi: Net karın sadece "Öz Kaynak" tutarına oranlanması gerektiği gerçeği.
* Parşömen Referansı: Du-Pont Analizi ve Finansal Kaldıraç Derecesi (DFL).`
};
