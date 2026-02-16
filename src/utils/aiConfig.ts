export const AI_MODE: "TEST" | "PRODUCTION" = "PRODUCTION";
export interface AIConfig {
    provider: "mimo" | "deepseek" | "google" | "cerebras";
    model: string;
    temperature: number;
    systemPromptPrefix?: string;
}

/**
 * Returns the AI configuration based on the current AI_MODE.
 * TEST mode uses MiMo, PRODUCTION mode uses DeepSeek.
 */
export const getAIConfig = (): AIConfig => {
    if (AI_MODE === "PRODUCTION") {
        const today = new Date().toLocaleDateString("tr-TR", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        return {
            provider: "cerebras",
            model: "gpt-oss-120b",
            temperature: 1.0,
        };
    } else {
        return {
            provider: "deepseek",
            model: "deepseek-chat",
            temperature: 1.3,
        };
    }
};
