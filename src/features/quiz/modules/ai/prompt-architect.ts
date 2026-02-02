/**
 * Prompt Architect
 *
 * LLM mesajlarını oluşturmak için merkezi yapı.
 * Prefix Caching optimizasyonu için katı bir yapı uygular:
 * 1. System Prompt (Sabit)
 * 2. Context Message (Sabit - 8k tokenlık metin burada)
 * 3. Task Message (Değişken - Soru üretme talebi)
 */

export interface Message {
    role: "system" | "user" | "assistant";
    content: string;
}

export class PromptArchitect {
    /**
     * Standart mesaj dizisi oluşturur.
     * @param systemPrompt Rol tanımı ve temel kurallar
     * @param contextPrompt Değişmeyen bağlam (Metin, Ders, Konu) -> Prefix Cache burada çalışacak
     * @param taskPrompt Değişken görev (Spesifik soru üretme talebi)
     */
    static assemble(
        systemPrompt: string,
        contextPrompt: string,
        taskPrompt: string,
    ): Message[] {
        return [
            { role: "system", content: systemPrompt },
            { role: "user", content: contextPrompt },
            { role: "user", content: taskPrompt },
        ];
    }

    static buildContext(
        content: string,
        courseName?: string,
        sectionTitle?: string,
        guidelines?: {
            instruction?: string;
            few_shot_example?: unknown;
            bad_few_shot_example?: unknown;
        } | null,
        previousDiagnoses?: string[],
    ): string {
        const parts = [];

        if (courseName) parts.push(`## DERS: ${courseName}`);
        if (sectionTitle) parts.push(`## KONU: ${sectionTitle}`);

        // Ders Özel Yönergeleri
        if (guidelines) {
            parts.push("## DERS REHBERİ VE KURALLAR:");
            if (guidelines.instruction) {
                // User requested '### TEKNİK KURALLAR'
                parts.push(`### TEKNİK KURALLAR\n${guidelines.instruction}`);
            }

            if (guidelines.few_shot_example) {
                parts.push(
                    `\n### İYİ ÖRNEK (Bunu model al):\n${
                        JSON.stringify(guidelines.few_shot_example, null, 2)
                    }`,
                );
            }

            if (guidelines.bad_few_shot_example) {
                parts.push(
                    `\n### KÖTÜ ÖRNEK (Bundan kaçın):\n${
                        JSON.stringify(guidelines.bad_few_shot_example, null, 2)
                    }`,
                );
            }
        }

        // Genel Kalite ve Format Kuralları (Static for Caching)
        parts.push(`## GENEL KALİTE KURALLARI:
1. **Akademik Dil:** Soru kökü ve şıklar resmi, akademik ve sınav formatına (KPSS) uygun olmalıdır.
2. **Kapsam:** Metnin dışına çıkma, ancak metindeki bilgiyi farklı bir bağlamda veya örnekle sorgulayabilirsin.
3. **Çeldiriciler:** Çeldiricilerin en az ikisi, metindeki diğer kavramlarla doğrudan ilişkili ama sorulan odak noktasıyla çelişen ifadeler olmalıdır. "Hepsi", "Hiçbiri" YASAKTIR.
4. **Şık Yapısı:** Her zaman tam 5 adet (A,B,C,D,E) seçenek olmalıdır.
5. **Şık Dengesi:** Seçeneklerin tümü benzer uzunlukta ve yapıda olmalıdır.
7. **Görsel Referansı:** Eğer bir görseli referans alarak soru soruyorsan, soru metni içinde MUTLAKA "[GÖRSEL: X]" etiketini geçir. Bu etiket, kullanıcıya hangi görsele bakması gerektiğini gösterir.
`);

        parts.push(
            `## ÇIKTI FORMATI:
Sadece ve sadece aşağıdaki JSON şemasına uygun çıktı ver. Markdown veya yorum ekleme.
{
  "q": "Soru metni... (Gerekirse [GÖRSEL: X] içerir)",
  "o": ["A", "B", "C", "D", "E"],
  "a": 0, // 0-4 arası index
  "exp": "Açıklama...",
  "img": 0 // Görsel referansı varsa indexi (0, 1, 2...), yoksa null
}
## SİSTEM MESAJI:
Eğer soruyu kurgularken metindeki bir görseli [GÖRSEL: X] referans alıyorsan, o görselin numarasını (0, 1, 2 gibi) 'img' alanına yaz. Eğer sorunun bir görselle doğrudan ilgisi yoksa 'img' değerini null bırak.`,
        );

        parts.push("## BAĞLAM METNİ:");
        parts.push(content);

        if (previousDiagnoses && previousDiagnoses.length > 0) {
            parts.push("## KULLANICININ GEÇMİŞ HATALARI (BU KONUDA):");
            parts.push(
                "Kullanıcı bu konuda daha önce şu hataları yaptı. Soruları üretirken bu zayıf noktaları özellikle test etmeye çalış:",
            );
            parts.push(previousDiagnoses.map((d) => `- ${d}`).join("\n"));
        }

        return parts.join("\n\n");
    }
}
