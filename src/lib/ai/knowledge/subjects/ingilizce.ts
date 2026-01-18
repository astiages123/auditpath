import type { SubjectKnowledge } from "../types";

export const INGILIZCE: SubjectKnowledge = {
  id: "ingilizce",
  constitution: `Temel Mantık: Kelime bilgisinden paragraf bütünlüğüne uzanan bir hiyerarşide, dilin mekanik değil işlevsel kullanımını test et.
* Soru Kurgusu:
  - Kelime/Phrasal Verb: Doğrudan tanım yerine "Collocation" (birlikte kullanım) ve bağlamsal ipucu odaklı cümleler kur.
  - Cümle Tamamlama: Bağlaçlar üzerinden "zıtlık, sebep-sonuç" gibi mantıksal beklentiler oluştur.
  - Diyalog/Paragraf: Güncel akademik/sosyal temalar kullan; resmiyet düzeyini (register) ve durumsal uygunluğu (appropriateness) koru.
* Çeldirici Stratejisi:
  - Gramer: Zaman uyumunu (tense harmony) bozan ama anlamca yakın duran yapılar.
  - Çeviri: Yüklem ve özne tam karşılanmalı; çeldiricilerde zarf/sıfat değişimleri veya etken/edilgen karmaşası yarat.
  - Restatement: Miktar belirteçleri (most vs some) veya modal kesinlik dereceleri (must vs may) üzerinden "anlam kayması" kurgula.
* Zorunlu Senaryo: Cohesion (Bütünlük) Analizi. Geçiş ifadeleri (however, therefore) ve gönderimsel ifadeler (this, such) üzerine kurulu akış soruları.`,
  fewShot: `Soru: Question Type: Restatement / Modal Nuance Analysis
Original Sentence: "It is highly probable that the central bank will implement a tighter monetary policy next month, given the sharp increase in current inflation rates."
Which of the following sentences provides the closest meaning to the original statement?
A) The central bank must adopt a tighter monetary policy next month because inflation rates have risen sharply.
B) There is a slight possibility that the central bank might consider changing its policy if inflation continues to rise.
C) The central bank is expected to tighten its monetary policy next month in response to the rapid rise in inflation.
D) Unless the inflation rates drop, the central bank will definitely not change its current monetary policy.
E) The central bank has already decided to implement a tighter policy to control the inflation rates.

Geri Bildirim:
* Doğru Hüküm: Orijinal cümledeki "highly probable" (yüksek olasılık) ifadesini en iyi "is expected to" (beklenmektedir) karşılar. "In response to" ise "given the..." yapısının neden-sonuç karşılığıdır.
* Çeldirici Analizi: A şıkkı "must" (zorunluluk) kullanarak kesinlik derecesini artırır. B şıkkı "slight possibility" diyerek olasılığı azaltır. E şıkkı "already decided" diyerek gelecek tahmini olan bir durumu geçmişe çeker.
* Ayırt Edici Çizgi: Modal fiillerin ve olasılık zarflarının (highly, likely, must, may) kesinlik düzeyleri arasındaki hiyerarşik farkı yakalamak.
* Parşömen Referansı: Semantic Modality and Degrees of Certainty in Academic English.`
};
