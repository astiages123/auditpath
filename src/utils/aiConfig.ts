export const AI_TASKS = [
  'analysis',
  'drafting',
  'validation',
  'revision',
  'diagnosis',
  'followup',
] as const;

export type AITask = (typeof AI_TASKS)[number];

export interface AIConfig {
  provider: 'mimo' | 'deepseek' | 'google' | 'cerebras';
  model: string;
  temperature: number;
  systemPromptPrefix?: string;
}

const TASK_CONFIGS: Record<AITask, AIConfig> = {
  analysis: {
    provider: 'google',
    model: 'gemini-3-flash-preview',
    temperature: 0.7,
  },
  validation: {
    provider: 'mimo',
    model: 'mimo-v2-flash',
    temperature: 0.1,
  },
  drafting: {
    provider: 'deepseek',
    model: 'deepseek-chat',
    temperature: 0.7,
  },
  revision: {
    provider: 'deepseek',
    model: 'deepseek-chat',
    temperature: 0.5,
  },
  diagnosis: {
    provider: 'deepseek',
    model: 'deepseek-chat',
    temperature: 0.3,
  },
  followup: {
    provider: 'deepseek',
    model: 'deepseek-chat',
    temperature: 0.6,
  },
};

/**
 * Returns the AI configuration based on the specific task.
 */
export const getTaskConfig = (task: AITask): AIConfig => {
  return TASK_CONFIGS[task] || TASK_CONFIGS.drafting;
};
