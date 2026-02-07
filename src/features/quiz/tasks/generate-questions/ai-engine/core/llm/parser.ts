/**
 * Parse JSON from LLM response (simple extraction)
 */
export function parseJsonResponse(
    text: string | null | undefined,
    type: "object" | "array",
): unknown {
    if (!text || typeof text !== "string") return null;

    try {
        let cleanText = text.trim();

        // 0. <think>...</think> bloklarını temizle (Qwen modelleri bunu ekliyor)
        cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

        // 1. Markdown bloklarını temizle (```json ... ``` veya sadece ``` ... ```)
        // Sadece ilk eşleşen bloğu al
        const markdownMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (markdownMatch) {
            cleanText = markdownMatch[1].trim();
        }

        // 2. Ham JSON desenini bul (Dışta kalan metinleri temizlemek için)
        const pattern = type === "array" ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
        const match = cleanText.match(pattern);

        if (match) {
            cleanText = match[0];
        } else {
            // Eşleşme yoksa, muhtemelen temizlenemedi veya format bozuk.
            // Yine de devam edip şansımızı deneyebiliriz veya null dönebiliriz.
            // Orijinal koda sadık kalarak, match yoksa null dönüyoruz.
            return null;
        }

        // 3. LaTeX Backslash Düzeltme (PRE-PROCESS)
        // Regex: Geçerli JSON escape'lerini (örn: \n, \", \\) koru, diğer tüm \ karakterlerini çiftle (\\).
        // NOT: \b (backspace) ve \f (form feed) geçerli escape olsa da, LaTeX çıktıları (\beta, \frac) ile
        // karışmaması için onları da "geçersiz" kabul edip çiftliyoruz.
        // Böylece "\beta" -> "\\beta" olarak parse ediliyor (backspace yerine string olarak).

        // Geçerli escape'ler: \" \\ \/ \n \r \t \uXXXX
        const regex = /(\\["\\/nrt]|\\u[0-9a-fA-F]{4})|(\\)/g;

        cleanText = cleanText.replace(regex, (match, valid, invalid) => {
            if (valid) return valid; // Geçerli escape, dokunma
            if (invalid) return "\\\\"; // Geçersiz backslash (veya \b, \f), çiftle
            return match;
        });

        // 4. Forgiving JSON Parser for Truncated Responses
        try {
            return JSON.parse(cleanText);
        } catch (e) {
            // If standard parse fails, try to recover truncated JSON
            // This is a common issue with LLMs when they hit max_tokens
            const closers = ["}", "]", '"}', '"]', "}", "]", "]}", "}}"];

            for (const closer of closers) {
                try {
                    return JSON.parse(cleanText + closer);
                } catch {
                    continue;
                }
            }

            // Try more complex recovery for arrays if needed
            if (type === "array" && cleanText.trim().startsWith("[")) {
                try {
                    // Try to close array with ]} if it looks like an object inside array
                    return JSON.parse(cleanText + "}]");
                } catch {}
                try {
                    // Try to close array with simple ]
                    return JSON.parse(cleanText + "]");
                } catch {}
            }

            // If all recovery attempts fail, return null
            console.warn("JSON Parse Error (Unrecoverable):", e);
            return null;
        }
    } catch (e) {
        console.error("JSON Parse Error (Critical):", e);
        return null;
    }
}
