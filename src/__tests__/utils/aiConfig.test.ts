import { describe, expect, it } from 'vitest';

import { getTaskConfig } from '@/utils/aiConfig';

describe('aiConfig', () => {
  it('uses the selected Google Lite model for analysis tasks', () => {
    expect(getTaskConfig('analysis')).toMatchObject({
      provider: 'google',
      model: 'gemini-3.1-flash-lite-preview',
    });
  });

  it('uses Cerebras gpt-oss-120b for validation tasks', () => {
    expect(getTaskConfig('validation')).toMatchObject({
      provider: 'cerebras',
      model: 'gpt-oss-120b',
    });
  });
});
