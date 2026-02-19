export const AI_MODE: 'TEST' | 'PRODUCTION' = 'PRODUCTION';
export interface AIConfig {
  provider: 'mimo' | 'deepseek' | 'google' | 'cerebras';
  model: string;
  temperature: number;
  systemPromptPrefix?: string;
}

/**
 * Returns the AI configuration based on the current AI_MODE.
 * TEST mode uses MiMo, PRODUCTION mode uses Cerebras (gpt-oss-120b).
 */
export const getAIConfig = (): AIConfig => {
  if (AI_MODE === 'PRODUCTION') {
    return {
      provider: 'cerebras',
      model: 'gpt-oss-120b',
      temperature: 1.0,
    };
  } else {
    return {
      provider: 'deepseek',
      model: 'deepseek-chat',
      temperature: 1.3,
    };
  }
};
