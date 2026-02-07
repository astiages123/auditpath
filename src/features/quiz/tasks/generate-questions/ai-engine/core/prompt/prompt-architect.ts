import { z } from "zod";
import { COMMON_OUTPUT_FORMATS, GENERAL_QUALITY_RULES } from "./library";

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
 * Normalize line endings from \r\n to \n and trim whitespace for consistent caching
 */
function normalizeText(text: string): string {
    return text.replace(/\r\n/g, "\n").trim();
}

/**
 * Replace markdown image references with [GÖRSEL] tag consistently
 */
function replaceImages(text: string): string {
    return text.replace(/!\[[^\]]*\]\([^)]+\)/g, "[GÖRSEL]");
}

/**
 * Deterministic JSON stringify (simple version)
 * Indentation: 2 spaces
 */
function stableStringify(obj: unknown): string {
    if (typeof obj === "string") return obj;
    return JSON.stringify(obj, null, 2);
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
            { role: "system", content: normalizeText(systemPrompt) },
            { role: "user", content: normalizeText(contextPrompt) },
            {
                role: "user",
                content: `--- GÖREV ---\n${normalizeText(taskPrompt)}`,
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
        const parts: string[] = [];

        if (courseName && courseName.trim()) {
            parts.push(`## DERS: ${courseName.trim()}`);
        }
        if (sectionTitle && sectionTitle.trim()) {
            parts.push(`## KONU: ${sectionTitle.trim()}`);
        }

        // Ders Özel Yönergeleri
        if (guidelines) {
            parts.push("## DERS REHBERİ VE KURALLAR:");
            if (guidelines.instruction && guidelines.instruction.trim()) {
                // User requested '### TEKNİK KURALLAR'
                parts.push(
                    `### TEKNİK KURALLAR\n${guidelines.instruction.trim()}`,
                );
            }

            if (guidelines.few_shot_example) {
                const exampleStr = stableStringify(guidelines.few_shot_example);
                parts.push(`\n### İYİ ÖRNEK (Bunu model al):\n${exampleStr}`);
            }

            if (guidelines.bad_few_shot_example) {
                const badExampleStr = stableStringify(
                    guidelines.bad_few_shot_example,
                );
                parts.push(
                    `\n### KÖTÜ ÖRNEK (Bundan kaçın):\n${badExampleStr}`,
                );
            }
        }

        // Genel Kalite ve Format Kuralları (Static for Caching)
        parts.push(GENERAL_QUALITY_RULES);

        parts.push(COMMON_OUTPUT_FORMATS);

        parts.push("## BAĞLAM METNİ:");
        parts.push(normalizeText(content));

        // Join with strictly 2 newlines to ensure clean separation
        return parts.map((p) => p.trim()).filter((p) => p.length > 0).join(
            "\n\n",
        );
    }

    /**
     * Standardized content cleaning for deterministic caching
     */
    static cleanReferenceImages(content: string): string {
        return replaceImages(content);
    }
}
