import type { SubjectKnowledge } from "../types";

export const BANKACILIK_HUKUKU: SubjectKnowledge = {
  id: "bankacilik_hukuku",
  constitution: `Temel Mantık: 5411 Sayılı Kanun çerçevesinde düzenleyici ve denetleyici mekanizmaların işleyişini test et.
* Soru Kurgusu: Bankaların kuruluş/faaliyet izinleri, BDDK ile idari ilişkiler, sır saklama yükümlülüğü ve özkaynak hesaplama kriterlerini hedefle.
* Çeldirici Stratejisi: Bankacılık suçlarında failin sıfatı (yönetici vs. personel). "Zimmet" suçunun bankacılık hukukuna özgü nitelikli halleri ile genel ceza hukukundaki farklarını kullan.
* Zorunlu Senaryo: Faaliyet izninin iptali ve TMSF (Fon) süreçleri. Temlik şartları ve idari karar mekanizmaları.
* Bilişsel Düzey: Bloom Analiz basamağı.`,
  fewShot: `Soru: Bir mevduat bankasının genel müdürü olan (G), banka kaynaklarını kendine yakın paravan şirketlere teminatsız kredi olarak aktarmış ve bu tutarların takibi imkansız hale gelmiştir. BDDK yapılan inceleme sonucu durumu tespit etmiştir.
Bu eylemin 5411 Sayılı Bankacılık Kanunu kapsamındaki hukuki niteliği ve sonucu aşağıdakilerden hangisidir?
A) Eylem genel ceza hukukundaki "Güveni Kötüye Kullanma" suçudur, banka iç yönergesi uygulanır.
B) "Zimmet" suçunun nitelikli hali oluşmuştur; (G) hakkında adli cezaların yanı sıra bankacılık yapma yasağı uygulanır.
C) Fiil "İrtikap" suçuna girer ve TMSF bankanın yönetimini devralmadan işlem yapılamaz.
D) Sadece idari para cezası gerektiren bir "usulsüz kredi" işlemidir.
E) Banka sırrını açıklama suçu ile birleşen bir "dolandırıcılık" vakasıdır.

Geri Bildirim:
* Doğru Hüküm: Banka kaynaklarının, bankanın zararına olacak şekilde şahsi veya başkası lehine mal edinilmesi Bankacılık Kanunu m.160 uyarınca "Zimmet" suçunu oluşturur.
* Çeldirici Analizi: A şıkkı özel kanun-genel kanun ilişkisini ihmal eder. D şıkkı eylemin cezai boyutunu hafife alarak sadece idari boyuta odaklanır.
* Ayırt Edici Çizgi: Bankacılıkta zimmet, klasik zimmetten farklı olarak "banka kaynağının" sömürülmesini ve BDDK/TMSF mekanizmalarını devreye sokar.
* Parşömen Referansı: 5411 Sayılı Kanun, Madde 160 (Zimmet).`
};
