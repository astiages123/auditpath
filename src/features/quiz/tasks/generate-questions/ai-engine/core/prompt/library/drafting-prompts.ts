import { ConceptMapItem } from "../../../tasks/analysis";

export const DRAFTING_SYSTEM_PROMPT =
"Sen KPSS formatında, akademik dille soru yazan uzman bir yapay zekasın. SADECE JSON formatında çıktı ver. Cevabın dışında hiçbir metin, yorum veya markdown karakteri bulunmamalıdır.";

export function buildDraftingTaskPrompt(
    concept: ConceptMapItem,
    strategy: { bloomLevel: string; instruction: string },
    usageType: "antrenman" | "deneme" | "arsiv" = "antrenman",
    previousDiagnoses?: string[],
): string {
    const parts = [
        `AMAÇ: Metni analiz ederek, belirtilen pedagojik stratejiye uygun tek bir soru üretmek.`,
        `---`,
    ];

    if (usageType === "deneme") {
        parts.push(`!!! DENEME (SİMÜLASYON) MODU !!! / ZORLUK ARTIRILMIŞTIR
- **Çeldiriciler:** Şıklar birbirine ÇOK yakın olmalı. "Bariz yanlış" şık kesinlikle olmamalı.
- **Tuzak:** Doğru cevaba en yakın, güçlü bir çeldirici (distractor) mutlaka ekle.
- **Kapsam:** Soru, sadece bu ünitedeki izole bilgiyi değil, kurs genelinde bu kavramla karıştırılabilecek diğer terimleri de çağrıştırmalıdır.`);
    }

    parts.push(`ÇELDİRİCİ (DISTRACTOR) KURALLARI:
Yanlış seçenekler rastgele üretilmemeli, şu üç kategoriden en az birine dayanmalıdır:
1. **Kavram Karmaşası:** Doğru cevaba benzeyen ancak farklı bir bağlamda kullanılan terimler.
2. **İşlem/Mantık Hatası:** Doğru muhakeme sürecindeki yaygın bir hatanın sonucu.
3. **Yarım Doğru:** Doğru başlayan ancak yanlış biten (veya tam tersi) ifadeler.
*Rastgele veya saçma yanlışlar üretme.*

LATEX FORMAT ZORUNLULUĞU:
- Tüm sayısal verileri, matematiksel formülleri, değişkenleri ($x, y, P, Q$) ve teknik sembolleri ($IS-LM, \\sigma^2, \\alpha$ vb.) **hem soru metninde (q) hem de açıklamada (exp)** KESİNLİKLE LaTeX formatında yaz.
- Örn: "faiz oranı %5" yerine "$r = 5\\%$" veya "$P = 100$" şeklinde.`);

    parts.push(`HEDEF KAVRAM VE ODAK:
- Kavram: ${concept.baslik}
- Odak Noktası: ${concept.odak}
- Bloom Seviyesi: ${concept.seviye || strategy.bloomLevel}`);

    if (concept.gorsel) {
        parts.push(
            `GÖRSEL REFERANSI: Soruyu kurgularken '${concept.gorsel}' görseline atıfta bulun veya görselin açıkladığı durumu senaryolaştır.${
                concept.altText
                    ? `\nGörsel Açıklaması (Alt-Text): ${concept.altText}`
                    : ""
            }`,
        );
    }

    parts.push(`PEDAGOJİK STRATEJİ:
${strategy.instruction}

KANIT ZORUNLULUĞU:
Eğer soru bir senaryo veya analiz içeriyorsa; evidence alanına metindeki dayanak kuralı/tanımı yaz ve yanına kısa bir notla bu kuralın sorudaki duruma nasıl bağlandığını açıkla. Eğer metinde doğrudan bir kanıt veya dayanak yoksa o soruyu üretme.`);

    if (previousDiagnoses && previousDiagnoses.length > 0) {
        parts.push(`KULLANICININ GEÇMİŞ HATALARI (BU KONUDA):
Kullanıcı bu konuda daha önce şu hataları yaptı. Soruları üretirken bu zayıf noktaları özellikle test etmeye çalış:
${previousDiagnoses.map((d) => `- ${d}`).join("\n")}`);
    }

    parts.push(
        `Lütfen BAĞLAM METNİNİ referans alarak soruyu oluştur ve SADECE JSON döndür.`,
    );

    return parts.join("\n\n");
}
