import type { SubjectKnowledge } from "../types";

export const MIKRO_IKTISAT: SubjectKnowledge = {
  id: "mikro_iktisat",
  constitution: `Temel Mantık: Analitik çıkarım ve grafik okuma becerisini "ceteris paribus" varsayımıyla test et.
* Soru Kurgusu: Değişkenler arası etkileşimi sorgula (X değişkeni değiştiğinde Y denge noktası ne olur?). Arz/Talep şoklarının fiyat ve miktar üzerindeki net etkisine odaklan.
* Çeldirici Stratejisi: "Eğri üzerinde hareket" ile "eğrinin kayması" ayrımını temel yanıltıcı yap. Giffen malları veya istisnai esneklik durumlarını rasyonel beklenti karşıtı olarak konumlandır.
* Zorunlu Senaryo: Marjinal analiz (Türev alma) ve denge noktası (MC=MR) hesaplamaları veya grafik yorumu.
* Bilişsel Düzey: Bloom Uygulama ve Analiz basamağı.`,
  fewShot: `Soru: Tam rekabet piyasasında faaliyet gösteren bir firmanın kısa dönem toplam maliyet fonksiyonu STC = Q^3 - 4Q^2 + 10Q + 20 şeklindedir. Piyasa denge fiyatının P = 10 olduğu varsayıldığında, firmanın karını maksimize eden üretim düzeyi (Q) ve bu noktadaki firmanın ekonomik durumu hakkında aşağıdakilerden hangisi söylenebilir?
A) Q=4 birim üretir ve firma aşırı kâr elde eder.
B) Q=1 birim üretir ve firma zarar etmesine rağmen üretime devam eder.
C) Q=4 birim üretir ve firma sadece normal kâr elde eder.
D) Q=2 birim üretir ve firma başabaş noktasındadır.
E) Q=3 birim üretir ve marjinal maliyet fiyatın üzerine çıktığı için firma piyasadan çekilir.

Geri Bildirim:
* Doğru Hüküm: Kar maksimizasyonu için P = MC olmalıdır. MC = dSTC/dQ = 3Q^2 - 8Q + 10. Denklem: 10 = 3Q^2 - 8Q + 10 → 3Q^2 - 8Q = 0 → Q(3Q - 8) = 0 → Q = 8/3 ≈ 2.66
* Çeldirici Analizi: "Üretime devam eder" çeldiricisi, fiyatın Ortalama Değişken Maliyet (AVC) üzerinde olup olmadığını test eder. AVC = (Q^3 - 4Q^2 + 10Q)/Q = Q^2 - 4Q + 10. Sabit maliyetler (TFC = 20) batık maliyet olduğundan, kısa dönemde P > AVC ise üretime devam edilir.
* Ayırt Edici Çizgi: Marjinal analizde sadece türev almak yetmez; bulunan Q değerinin AVC_min noktasının (kapanma noktası) üzerinde olup olmadığı kontrol edilmelidir.
* Parşömen Referansı: Marjinal Analiz Teorisi (Marginalist Revolution) ve Marshallgil Kısa Dönem Firma Dengesi.`
};
