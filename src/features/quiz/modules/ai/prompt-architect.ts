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

/**
 * Normalize line endings from \r\n to \n for consistent caching
 */
function normalizeLineEndings(text: string): string {
    return text.replace(/\r\n/g, "\n");
}

export class PromptArchitect {
    /**
     * Standart mesaj dizisi oluşturur (3 ayrı blok - Prefix Caching için optimize).
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
            { role: "system", content: normalizeLineEndings(systemPrompt) },
            { role: "user", content: normalizeLineEndings(contextPrompt) },
            {
                role: "user",
                content: `--- GÖREV ---\n${normalizeLineEndings(taskPrompt)}`,
            },
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
                // DB'den gelen veri zaten string ise direkt kullan, değilse stringify et
                const exampleStr =
                    typeof guidelines.few_shot_example === "string"
                        ? guidelines.few_shot_example
                        : JSON.stringify(guidelines.few_shot_example, null, 2);
                parts.push(`\n### İYİ ÖRNEK (Bunu model al):\n${exampleStr}`);
            }

            if (guidelines.bad_few_shot_example) {
                // DB'den gelen veri zaten string ise direkt kullan, değilse stringify et
                const badExampleStr =
                    typeof guidelines.bad_few_shot_example === "string"
                        ? guidelines.bad_few_shot_example
                        : JSON.stringify(
                            guidelines.bad_few_shot_example,
                            null,
                            2,
                        );
                parts.push(
                    `\n### KÖTÜ ÖRNEK (Bundan kaçın):\n${badExampleStr}`,
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
6. **JSON GÜVENLİĞİ:** Tüm LaTeX komutlarında ters eğik çizgi (\\) karakterini JSON içinde KESİNLİKLE çiftle (örn: \\\\alpha, \\\\frac{1}{2}). Tekil ters eğik çizgi JSON parse hatalarına yol açar ve kabul edilemez.
7. **Görsel Referansı:** Eğer bir görseli referans alarak soru soruyorsan, soru metni içinde MUTLAKA "[GÖRSEL: X]" etiketini geçir. Bu etiket, kullanıcıya hangi görsele bakması gerektiğini gösterir.
`);

        parts.push(
            `## ÇIKTI FORMATI:
Sadece ve sadece aşağıdaki JSON şemasına uygun çıktı ver. Markdown veya yorum ekleme.
LaTeX ifadeleri için çift ters eğik çizgi kullanmayı unutma (\\\\).
{
  "q": "Soru metni... (Gerekirse [GÖRSEL: X] içerir, LaTeX içerirse \\\\ komutlarını çiftle)",
  "o": ["A", "B", "C", "D", "E"],
  "a": 0, // 0-4 arası index
  "exp": "Açıklama... (LaTeX içerirse \\\\ komutlarını çiftle)",
  "evidence": "Cevabı doğrulayan metin alıntısı...",
  "img": 0 // Görsel referansı varsa indexi (0, 1, 2...), yoksa null
}
## SİSTEM MESAJI:
Eğer soruyu kurgularken metindeki bir görseli [GÖRSEL: X] referans alıyorsan, o görselin numarasını (0, 1, 2 gibi) 'img' alanına yaz. Eğer sorunun bir görselle doğrudan ilgisi yoksa 'img' değerini null bırak.`,
        );

        parts.push("## BAĞLAM METNİ:");
        parts.push(content);

        return parts.join("\n\n");
    }
}
