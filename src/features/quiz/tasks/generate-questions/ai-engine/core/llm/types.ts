export interface Message {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface AIResponse {
    content: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        cached_tokens: number;
    };
}

export type LogCallback = (
    message: string,
    details?: Record<string, unknown>,
) => void;

export type LLMProvider = "cerebras" | "mimo" | "google";
