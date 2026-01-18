import type { SubjectKnowledge } from "../types";

export const IS_HUKUKU: SubjectKnowledge = {
  id: "is_hukuku",
  constitution: `Temel Mantık: "İşçinin korunması ilkesi" ve "kanuni tazminat mekanizmaları" ekseninde, 4857 sayılı Kanun'un somut olaylara uygulanmasını test et.
* Soru Kurgusu: İş sözleşmesinin feshini (haklı vs. geçerli neden) konu alan vakalar oluştur. Soruyu "X davranışının hukuki sonucu nedir?" perspektifiyle sor.
* Çeldirici Stratejisi: Sürelerin manipülasyonu (İşe iade davası: 1 ay vs. Arabuluculuk süreleri). Kıdem tazminatı için "en az 1 yıl çalışma" şartındaki istisnalar üzerinden yanıltma yap.
* Zorunlu Senaryo: Tazminat ve Alacak Hesaplama. İşçinin süresi, ücreti ve fesih türü verilerek; kıdem, ihbar ve yıllık izin alacaklarının hangisine/ne kadar hak kazanıldığının sorgulandığı senaryolar.
* Bilişsel Düzey: Bloom Uygulama ve Değerlendirme basamağı.`,
  fewShot: `Soru: 4857 sayılı İş Kanunu'na tabi bir iş yerinde 3 yıl 2 ay kıdemi olan İşçi (A), performans düşüklüğü gerekçesiyle iş sözleşmesinin feshedileceğine dair yazılı bir bildirim almıştır. İşveren, bildirim süresine ait ücreti peşin ödeyerek sözleşmeyi derhal feshetmiştir. Ancak (A), performans düşüklüğünün gerçeği yansıtmadığını ve fesihten önce savunmasının alınmadığını iddia etmektedir.
Bu olayda (A)'nın hakları ve feshin hukuki niteliği hakkında aşağıdakilerden hangisi doğrudur?
A) Fesih "haklı nedenle" yapıldığı için işçi hiçbir tazminata hak kazanamaz.
B) Savunma alınmadığı için fesih geçersizdir; işçi 1 ay içinde doğrudan İş Mahkemesinde işe iade davası açabilir.
C) İşçi, kıdem tazminatına hak kazanır ancak ihbar tazminatı alamaz; işe iade davası öncesi arabulucuya başvurmalıdır.
D) Geçerli nedenle fesihte savunma alınmaması feshin usul yönünden geçersizliğine yol açar; işçi arabuluculuk sonrası işe iade davası açarak boşta geçen süre tazminatı talep edebilir.
E) İşçi 6 aylık kıdem şartını sağlamadığı için iş güvencesinden yararlanamaz, sadece kötüniyet tazminatı isteyebilir.

Geri Bildirim:
* Doğru Hüküm: Performans düşüklüğü "geçerli bir neden"dir (İş K. m.18). İşçinin davranışı veya verimi ile ilgili fesihlerde, fesihten önce savunma alınması zorunludur (İş K. m.19). Savunma alınmaması feshin geçersizliğine yol açar.
* Çeldirici Analizi: B şıkkı "doğrudan dava" diyerek yanıltır; dava şartı olan arabuluculuk atlanmıştır. C şıkkı ihbar tazminatı alamaz diyerek yanıltır; peşin ödenmiş olması hakkın doğmadığı anlamına gelmez.
* Ayırt Edici Çizgi: "Haklı neden" (m.25) ile "Geçerli neden" (m.18) arasındaki savunma alma zorunluluğu farkı.
* Parşömen Referansı: 4857 Sayılı İş Kanunu Madde 18, 19 ve 20.`
};
