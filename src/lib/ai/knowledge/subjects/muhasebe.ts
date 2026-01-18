import type { SubjectKnowledge } from "../types";

export const MUHASEBE: SubjectKnowledge = {
  id: "muhasebe",
  constitution: `Temel Mantık: Prosedürel bilginin mali tablolar (Bilanço/Gelir Tablosu) üzerindeki bütüncül etkisini ölç.
* Soru Kurgusu: Tekil yevmiye kaydı sormak yerine, bir transaksiyonun (işlemin) Bilanço toplamı ve Öz Kaynaklar üzerindeki net etkisini sorgula.
* Çeldirici Stratejisi: Dönemsellik ilkesi ihlalleri, giderlerin aktifleştirilmesi hataları ve "ters kayıt" mantığı. Banka muhasebesinde Mevduat'ın banka için "Pasif/Borç" olduğu gerçeği üzerinden yanıltma kurgula.
* Zorunlu Senaryo: Dönem sonu işlemleri (Amortisman, Karşılık, Yeniden Değerleme) ve bu işlemlerin mali tablolar üzerindeki kombine etkisi.
* Bilişsel Düzey: Bloom Uygulama ve Değerlendirme basamağı.`,
  fewShot: `Soru: İşletme, 1 Aralık 2025 tarihinde 3 aylık kira bedeli olan 90.000 TL'yi peşin ödemiş ve tamamını "770 Genel Yönetim Giderleri" hesabına borç kaydetmiştir. 31 Aralık 2025 dönem sonu itibarıyla yapılması gereken envanter kaydı ve bu kaydın mali tablolar üzerindeki etkisi hangisidir?
A) 60.000 TL tutarında "Gelecek Aylara Ait Giderler" hesabı borçlandırılır; bu işlem dönem net karını artırırken varlık toplamını değiştirmez.
B) 30.000 TL tutarında "Gider Tahakkukları" hesabı alacaklandırılır; bu işlem öz kaynakları azaltır.
C) 60.000 TL tutarında "Gelecek Aylara Ait Giderler" hesabı borçlandırılır; bu işlem dönemin giderlerini azaltarak dönem net karını ve aktif toplamını artırır.
D) 90.000 TL tutarında "Peşin Ödenen Giderler" hesabı alacaklandırılır; aktif toplamı azalır.
E) Banka muhasebesi standartlarına göre bu tutar doğrudan "Faiz Dışı Giderler" olarak kalmalıdır.

Geri Bildirim:
* Doğru Hüküm: "Dönemsellik İlkesi" gereği, 2026 yılına sarkan 60.000 TL'lik (2 aylık) kısım giderden çıkarılıp aktif bir hesap olan "180 Gelecek Aylara Ait Giderler" hesabına aktarılmalıdır.
* Çeldirici Analizi: A şıkkı varlık toplamını değiştirmez diyerek yanıltır; giderin iptali net karı, o da öz kaynakları (pasifi) ve varlığı (aktifi) artırır.
* Ayırt Edici Çizgi: Ödeme anında yapılan hatalı kaydın (tamamının gider yazılması), dönem sonunda "aktifleşme" yoluyla düzeltilmesi.
* Parşömen Referansı: MSUGT (Muhasebe Sistemi Uygulama Genel Tebliği) Kavramsal Çerçeve - Dönemsellik İlkesi.`
};
