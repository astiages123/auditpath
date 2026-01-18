import type { SubjectKnowledge } from "../types";

export const CEZA_HUKUKU: SubjectKnowledge = {
  id: "ceza_hukuku",
  constitution: `Temel Mantık: Normun soyut tanımını değil, somut olaya uygulanabilirliğini (subsumtion) test et.
* Soru Kurgusu: Doğrudan tanım sorma. "Fail-Fiil-Netice" illiyet bağını içeren vaka analizi (case-study) oluştur. Soru kökünü "ceza sorumluluğunu etkileyen haller" üzerine odakla.
* Çeldirici Stratejisi: TCK'daki sınırdaş kurumların farklarını kullan (Örn: Hata vs. Kastın Aşılması; Meşru Müdafaa vs. Zorunluluk Hali).
* Zorunlu Senaryo: İştirak (azmettirme/yardım) ve teşebbüs aşamalarının iç içe geçtiği çoklu fail senaryoları.
* Bilişsel Düzey: Bloom Analiz ve Değerlendirme basamağı.`,
  fewShot: `Soru: Fail (A), husumetlisi (B)'yi öldürmesi için (C)'yi azmettirmiştir. (C), (B)'yi pusuya düşürmek amacıyla (B)'nin her akşam geçtiği ıssız yolda beklemeye başlamış; ancak o akşam (B)'ye tıpatıp benzeyen ikiz kardeşi (D)'nin geldiğini görerek, (D)'yi (B) zannederek ateş etmiştir. Mermi (D)'nin omzunu sıyırmış, o sırada olay yerinden geçmekte olan (E) ise seken mermiyle hayatını kaybetmiştir.
Bu olaydaki ceza sorumluluğuna ilişkin aşağıdakilerden hangisi doğrudur?
A) (C), (D)'ye karşı "Kasten Öldürmeye Teşebbüs", (E)'ye karşı ise "Olası Kastla Öldürme" suçundan sorumlu olur.
B) (C), (D) üzerindeki hatası nedeniyle (D)'ye karşı sorumlu tutulamaz; sadece (E)'nin ölümü nedeniyle "Taksirle Öldürme"den sorumludur.
C) (C), (D)'ye karşı "Kasten Öldürmeye Teşebbüs", (E)'ye karşı ise "Taksirle Öldürme" suçundan sorumlu olur; (A) ise sadece (B)'yi öldürmeye azmettirmeden sorumludur.
D) (C), (D) ve (E) üzerindeki süreçte "Şahısta Hata" ve "Hedefte Sapma" birleştiği için toplamda tek bir "Kasten Öldürme" suçundan cezalandırılır.
E) (C), (D)'ye karşı "Kasten Öldürmeye Teşebbüs" suçundan sorumludur; (E)'nin ölümü ise "Hedefte Sapma" kuralları uyarınca "Taksirle Öldürme" olarak nitelendirilir ve fikri içtima hükümleri uygulanır.

Geri Bildirim:
* Doğru Hüküm: Şahısta hata (TCK m.30/1) durumunda fail, yöneldiği kişinin kimliği konusundaki hatasından faydalanamaz; ancak hedefte sapma (sapma neticesinde başka birinin zarar görmesi) durumunda "Fikri İçtima" (TCK m.44) hükümleri gereği en ağır cezayı gerektiren suçtan sorumlu tutulur.
* Çeldirici Analizi: A şıkkı "Olası Kast" diyerek yanıltır; hedefte sapmada kural olarak taksir vardır. C şıkkı (A)'nın sorumluluğunu sınırlayarak yanıltır; azmettiren neticeden (teşebbüs aşamasında kalsa dahi) sorumludur.
* Ayırt Edici Çizgi: Şahısta hata kasten öldürme iradesini sakatlamazken, hedefte sapma "istenmeyen bir neticenin" (E'nin ölümü) eklenmesine neden olur.
* Parşömen Referansı: TCK Madde 30 (Hata), Madde 38 (Azmettirme) ve Madde 44 (Fikri İçtima).`
};
