import type { SubjectKnowledge } from "../types";

export const ISTATISTIK: SubjectKnowledge = {
  id: "istatistik",
  constitution: `Temel Mantık: Ham hesaplamadan ziyade, veri setini manipüle etme ve sonuçları bilimsel çerçevede yorumlama yeteneğini test et.
* Soru Kurgusu: Özellik odaklı kökler kullan. "Varyans nedir?" yerine, "Veri setindeki tüm değerlere sabit bir sayı eklendiğinde/çarpıldığında σ (standart sapma) ve μ (aritmetik ortalama) nasıl değişir?" gibi parametre ilişkilerini sorgula.
* Çeldirici Stratejisi: Serbestlik derecesi (n−1) hataları, uç değerlerin (outliers) merkezi eğilim ölçülerini nasıl saptırdığı ve Tip I - Tip II hata kavramlarının yer değiştirmesi.
* Zorunlu Senaryo: Hipotez testleri ve olasılık dağılımları. Normal dağılım eğrisi altındaki alan yorumları veya regresyon katsayılarının anlamlılık testi (p-değeri analizi).
* Bilişsel Düzey: Bloom Uygulama ve Analiz basamağı.`,
  fewShot: `Soru: Bir veri setindeki tüm gözlem değerleri k gibi pozitif bir sabit sayı ile çarpıldığında, veri setinin aritmetik ortalaması (μ), varyansı (σ²) ve değişim katsayısı (DK) nasıl değişir?
A) μ k katına çıkar, σ² değişmez, DK k katına çıkar.
B) μ k birim artar, σ² k² katına çıkar, DK değişmez.
C) μ k katına çıkar, σ² k² katına çıkar, DK değişmez.
D) μ k katına çıkar, σ² k katına çıkar, DK 1/k oranında azalır.
E) Veri setine sabit bir sayı eklendiği varsayılmadığı için sadece varyans etkilenir.

Geri Bildirim:
* Doğru Hüküm: Ortalamaya k ile çarpım doğrudan yansır: μ_yeni = k · μ. Varyans, farkların karesi olduğu için: σ²_yeni = k² · σ². Değişim katsayısı: DK = σ/μ → DK_yeni = (k·σ)/(k·μ) = DK, yani değişmez.
* Çeldirici Analizi: B şıkkı, toplama ile çarpmayı karıştırır. A şıkkı, varyansın mutlak birimden bağımsız olduğunu iddia ederek yanıltır.
* Ayırt Edici Çizgi: Standart sapmanın k kat artarken, varyansın k² kat artması arasındaki karesel ilişki.
* Parşömen Referansı: Merkezi Eğilim ve Dağılım Ölçülerinin Özellikleri (Momentler Teorisi).`
};
