import { z } from "zod";
import { parseJsonResponse } from "./parser";
import { type AIResponse, type LLMProvider, type Message } from "./types";
import { UnifiedLLMClient } from "./client";

interface StructuredOptions<T> {
    schema: z.ZodSchema<T>;
    provider: LLMProvider;
    temperature?: number;
    maxRetries?: number;
    retryPromptTemplate?: string;
    model?: string;
    onLog?: (msg: string, details?: any) => void;
}

const DEFAULT_RETRY_PROMPT = `BİR ÖNCEKİ CEVABIN JSON ŞEMASINA UYMUYORDU.
Lütfen geçerli bir JSON döndür.
Sadece JSON verisi gerekli.`;

export class StructuredGenerator {
    static async generate<T>(
        messages: Message[],
        options: StructuredOptions<T>,
    ): Promise<T | null> {
        const {
            schema,
            provider,
            maxRetries = 2,
            retryPromptTemplate = DEFAULT_RETRY_PROMPT,
            onLog,
        } = options;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const isRetry = attempt > 0;
            const currentMessages = [...messages];

            if (isRetry) {
                currentMessages.push({
                    role: "user",
                    content: retryPromptTemplate,
                });
                onLog?.(`Retry denemesi #${attempt}...`);
            }

            try {
                const response: AIResponse = await UnifiedLLMClient.generate(
                    currentMessages,
                    {
                        provider,
                        model: options.model,
                        temperature: options.temperature ?? 0.1,
                        onLog,
                    },
                );

                const parsed = parseJsonResponse(
                    response.content,
                    "object",
                );

                if (!parsed) {
                    throw new Error("JSON Parsing failed completely");
                }

                const validation = schema.safeParse(parsed);

                if (validation.success) {
                    return validation.data;
                } else {
                    const errorMsg = validation.error.issues
                        .map((i) => `${i.path.join(".")}: ${i.message}`)
                        .join(", ");
                    onLog?.(`Validasyon hatası (Deneme ${attempt + 1})`, {
                        error: errorMsg,
                    });
                }
            } catch (error) {
                onLog?.(`Generation hatası (Deneme ${attempt + 1})`, {
                    error: String(error),
                });
            }
        }

        return null;
    }
}
