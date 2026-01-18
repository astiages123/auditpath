import type { SubjectKnowledge } from "../types";

export const TICARET_HUKUKU: SubjectKnowledge = {
  id: "ticaret_hukuku",
  constitution: `Temel Mantık: Ticari işletme, şirketler ve kıymetli evrak disiplinlerinde "teknik farklar" ve "şekil şartları" üzerinden uygulama becerisini test et.
* Soru Kurgusu: Soyut hüküm sorma; somut bir Genel Kurul kararı veya kambiyo senedi (çek/bono) üzerindeki eksiklik üzerinden vaka kurgula. Karar yeter sayıları ihlallerinin sonuçlarını sorgula.
* Çeldirici Stratejisi: Şahıs ve Sermaye şirketleri ayrımı. Limited ve Anonim şirketlerdeki asgari sermaye, ortak sorumluluğu ve pay devri (noter onayı vb.) farklarını birbiriyle karıştır.
* Zorunlu Senaryo: Kambiyo Senedi Analizi. Ciro zinciri kopukluğu, protesto süreleri veya aval sorumluluğu gibi teknik kıymetli evrak vakaları.
* Bilişsel Düzey: Bloom Uygulama ve Analiz basamağı.`,
  fewShot: `Soru: (A), lehine düzenlenmiş 100.000 TL değerindeki bir bonoyu arka yüzünü imzalayarak (B)'ye teslim etmiştir. (B) ise bononun arka yüzüne hiçbir ibare yazmadan bonoyu (C)'ye devretmiştir. (C), vadesi geldiğinde düzenleyen (D)'ye başvurmuş, ancak (D) bononun arkasındaki imza silsilesinde (C)'nin isminin geçmediğini belirterek ödeme yapmaktan kaçınmıştır.
Bu kambiyo senedi vakasındaki "Ciro Zinciri" ve hak sahipliği hakkında aşağıdakilerinden hangisi doğrudur?
A) Ciro zinciri (B)'nin isminin yazılmaması nedeniyle kopmuştur; (C) meşru hamil sayılmaz.
B) (A)'nın yaptığı işlem "Tam Ciro", (B)'nin yaptığı işlem "Beyaz Ciro"dur; zincir kopmamıştır.
C) (A) beyaz ciro yapmıştır; beyaz ciro ile devralan (B), senedi ismini yazmadan teslimle (C)'ye devredebilir ve (C) meşru hamil olur.
D) Bono, ciro edilemez kaydı içermese bile emre yazılı olduğu için sadece tam ciro ile devredilebilir.
E) (C), senedin zilyedi olduğu için cirantaların imza geçerliliğini ispat etmekle yükümlüdür.

Geri Bildirim:
* Doğru Hüküm: Beyaz ciro (sadece imza atılması), senedi hamiline yazılı senede yaklaştırır. Beyaz ciro ile senedi alan kişi, senedi ismini yazmadan sadece teslimle başkasına devredebilir (TTK m.683). Bu durum ciro zincirini koparmaz.
* Çeldirici Analizi: A şıkkı, her devrin ismen görünmesi gerektiği yanılgısını kullanır. E şıkkı, hamilin "imza sıhhatini" ispat yükü olmadığını görmezden gelir.
* Ayırt Edici Çizgi: Beyaz ciro sonrası yapılan "teslimle devrin" zincirdeki görünmez ama hukuki bağı.
* Parşömen Referansı: Türk Ticaret Kanunu (TTK) Madde 683 ve 686.`
};
