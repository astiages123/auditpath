import type { SubjectKnowledge } from "../types";

export const MEDENI_USUL_HUKUKU: SubjectKnowledge = {
  id: "medeni_usul_hukuku",
  constitution: `Temel Mantık: Yargılama sürecinin teknik akışını, süre yönetimini ve usul ekonomisini test et.
* Soru Kurgusu: "Görev ve Yetki"nin hukuki niteliğini (dava şartı mı, ilk itiraz mı?) ve ileri sürülme anını vaka üzerinden sorgula.
* Çeldirici Stratejisi: Kesin yetki kuralları ile kamu düzenine ilişkin olmayan yetki kurallarının sonuçlarını karıştır. İstinaf/temyiz sürelerinin başlangıcı ve bu süreçlerin icrayı durdurup durdurmadığına odaklan.
* Zorunlu Senaryo: Kanun yolu ve kesinleşme süreci. Kararın kesinleşme anı, olağan ve olağanüstü kanun yollarına başvuru şartları.
* Bilişsel Düzey: Bloom Hatırlama ve Analiz basamağı.`,
  fewShot: `Soru: Davacı (A), Ankara'daki taşınmazına yönelik müdahalenin men'i davasını, sehven davalı (B)'nin ikametgahı olan İstanbul Asliye Hukuk Mahkemesi'nde açmıştır. Davalı (B), süresi içinde yetki itirazında bulunmamış, mahkeme ise dosyayı incelemeye almıştır.
Bu usul hatası ve mahkemenin yapması gereken işlem hakkında aşağıdakilerden hangisi doğrudur?
A) Yetki itirazı süresinde yapılmadığı için İstanbul mahkemesi yetkili hale gelmiştir.
B) Taşınmazın aynına ilişkin davalarda yetki "kesin" olduğundan, mahkeme yetkisizliği davanın her aşamasında re'sen (kendiliğinden) gözetmelidir.
C) Yetki kuralı kamu düzenine ilişkin olmadığından mahkeme davaya bakmaya devam eder.
D) Bu bir dava şartı değil, ilk itirazdır; taraflar ileri sürmedikçe hakim dikkate alamaz.
E) Mahkeme dosyayı yetkisizlik kararı vererek Ankara Nöbetçi İcra Müdürlüğü'ne göndermelidir.

Geri Bildirim:
* Doğru Hüküm: Taşınmazın aynına ilişkin davalarda (HMK m.12) yetki kesindir. Kesin yetki bir "dava şartı"dır (HMK m.114).
* Çeldirici Analizi: A ve C şıkları genel yetki kuralları (ikametgah) ile kesin yetkiyi karıştırır. D şıkkı yetkiyi "ilk itiraz" kategorisine hapseder.
* Ayırt Edici Çizgi: Yetkinin "kesin" olup olmaması, hakimin re'sen gözetme yükümlülüğünü ve itiraz süresini belirleyen temel kriterdir.
* Parşömen Referansı: HMK Madde 12 (Taşınmazın Yetkisi) ve Madde 115 (Dava Şartlarının İncelenmesi).`
};
