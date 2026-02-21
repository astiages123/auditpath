export type AITask =
  | 'analysis'
  | 'drafting'
  | 'validation'
  | 'revision'
  | 'diagnosis'
  | 'followup';

export interface AIConfig {
  provider: 'mimo' | 'deepseek' | 'google' | 'cerebras';
  model: string;
  temperature: number;
  systemPromptPrefix?: string;
}

/**
 * Returns the AI configuration based on the specific task.
 */
export const getTaskConfig = (task: AITask): AIConfig => {
  switch (task) {
    case 'analysis':
      return {
        provider: 'google',
        model: 'gemini-3-flash-preview',
        temperature: 0.7,
      };
    case 'validation':
      return {
        provider: 'mimo',
        model: 'mimo-v2-flash',
        temperature: 0.1,
      };
    case 'drafting':
      return {
        provider: 'deepseek',
        model: 'deepseek-chat',
        temperature: 0.7,
      };
    case 'revision':
      return {
        provider: 'deepseek',
        model: 'deepseek-chat',
        temperature: 0.5,
      };
    case 'diagnosis':
      return {
        provider: 'deepseek',
        model: 'deepseek-chat',
        temperature: 0.3,
      };
    case 'followup':
      return {
        provider: 'deepseek',
        model: 'deepseek-chat',
        temperature: 0.6,
      };
    default:
      return {
        provider: 'deepseek',
        model: 'deepseek-chat',
        temperature: 0.7,
      };
  }
};
