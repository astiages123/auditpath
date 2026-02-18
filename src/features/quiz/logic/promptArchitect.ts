import { Message } from "@/features/quiz/types";
import { COMMON_OUTPUT_FORMATS, GENERAL_QUALITY_RULES } from "./prompts";

export class PromptArchitect {
    static assemble(
        systemPrompt: string,
        contextPrompt: string,
        taskPrompt: string,
    ): Message[] {
        const fixedContext = this.normalizeText(contextPrompt);
        const dynamicTask = this.normalizeText(taskPrompt);

        return [
            { role: "system", content: this.normalizeText(systemPrompt) },
            {
                role: "user",
                content: `${fixedContext}\n\n--- GÖREV ---\n${dynamicTask}`,
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

        if (guidelines) {
            parts.push("## DERS REHBERİ VE KURALLAR:");
            if (guidelines.instruction && guidelines.instruction.trim()) {
                parts.push(
                    `### TEKNİK KURALLAR\n${guidelines.instruction.trim()}`,
                );
            }
            if (guidelines.few_shot_example) {
                const exampleStr = JSON.stringify(
                    guidelines.few_shot_example,
                    null,
                    2,
                );
                parts.push(`\n### İYİ ÖRNEK (Bunu model al):\n${exampleStr}`);
            }
            if (guidelines.bad_few_shot_example) {
                const badExampleStr = JSON.stringify(
                    guidelines.bad_few_shot_example,
                    null,
                    2,
                );
                parts.push(
                    `\n### KÖTÜ ÖRNEK (Bundan kaçın):\n${badExampleStr}`,
                );
            }
        }

        parts.push(GENERAL_QUALITY_RULES);
        parts.push(COMMON_OUTPUT_FORMATS);
        parts.push("## BAĞLAM METNİ:");
        parts.push(this.normalizeText(content));

        return parts
            .map((p) => p.trim())
            .filter((p) => p.length > 0)
            .join("\n\n");
    }

    static cleanReferenceImages(content: string): string {
        return content.replace(/!\[[^\]]*\]\([^)]+\)/g, "[GÖRSEL]");
    }

    private static normalizeText(text: string): string {
        return text.replace(/\r\n/g, "\n").trim();
    }
}
