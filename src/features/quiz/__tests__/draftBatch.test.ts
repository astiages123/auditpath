import { beforeEach, describe, expect, it, vi } from 'vitest';
import { draftBatch } from '../logic/quizParser';
import { StructuredGenerator } from '../logic/structuredGenerator';
import { ConceptMapItem } from '../types';

vi.mock('../logic/structuredGenerator', () => ({
  StructuredGenerator: {
    generate: vi.fn(),
  },
}));

vi.mock('@/utils/aiConfig', () => ({
  getTaskConfig: vi.fn().mockReturnValue({
    systemPromptPrefix: 'Mocked System Prefix',
    temperature: 0.7,
  }),
}));

describe('draftBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should draft a batch of questions and return an array of GeneratedQuestion', async () => {
    const mockConcepts = [
      {
        concept: {
          id: '1',
          baslik: 'Kavram 1',
          aciklama: 'Kavram 1 açıklaması',
          seviye: 'Bilgi',
          odak: 'General focus',
          gorsel: null,
          onem: 'high',
          altKavramlar: [],
          iliskiler: [],
        } as ConceptMapItem,
        index: 0,
      },
      {
        concept: {
          id: '2',
          baslik: 'Kavram 2',
          aciklama: 'Kavram 2 açıklaması',
          seviye: 'Analiz',
          odak: 'Deep analysis',
          gorsel: null,
          onem: 'medium',
          altKavramlar: [],
          iliskiler: [],
        } as ConceptMapItem,
        index: 1,
      },
    ];

    const mockResponse = {
      questions: [
        {
          q: 'Kavram 1 ile ilgili soru nedir?',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 0,
          exp: 'Kavram 1 açıklaması',
          evidence: 'Kaynak 1',
          diagnosis: 'Teşhis 1',
          insight: 'İçgörü 1',
        },
        {
          q: 'Kavram 2 ile ilgili soru nedir?',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 1,
          exp: 'Kavram 2 açıklaması',
          evidence: 'Kaynak 2',
          diagnosis: 'Teşhis 2',
          insight: 'İçgörü 2',
        },
      ],
    };

    vi.mocked(StructuredGenerator.generate).mockResolvedValueOnce(mockResponse);

    const result = await draftBatch({
      concepts: mockConcepts,
      courseName: 'Test Course',
      usageType: 'antrenman',
      sharedContextPrompt: 'This is a shared context.',
    });

    expect(result).toBeDefined();
    expect(result?.length).toBe(2);

    expect(result?.[0].q).toBe('Kavram 1 ile ilgili soru nedir?');
    expect(result?.[0].concept).toBe('Kavram 1');
    expect(result?.[0].bloomLevel).toBe('knowledge'); // Falls back to concept seviye

    expect(result?.[1].q).toBe('Kavram 2 ile ilgili soru nedir?');
    expect(result?.[1].concept).toBe('Kavram 2');
    expect(result?.[1].bloomLevel).toBe('analysis'); // Falls back to concept seviye

    expect(StructuredGenerator.generate).toHaveBeenCalledTimes(1);

    const callArgs = vi.mocked(StructuredGenerator.generate).mock.calls[0];
    expect(callArgs[1]?.task).toBe('drafting');

    // Evaluate message parameters
    const messages = callArgs[0] as { role: string; content: string }[];
    expect(messages.some((m) => m.content.includes('Kavram 1'))).toBe(true);
    expect(messages.some((m) => m.content.includes('Kavram 2'))).toBe(true);
  });

  it('should return empty array if no concepts are provided', async () => {
    const result = await draftBatch({
      concepts: [],
      courseName: 'Test Course',
      usageType: 'antrenman',
      sharedContextPrompt: 'Context',
    });

    expect(result).toEqual([]);
    expect(StructuredGenerator.generate).not.toHaveBeenCalled();
  });

  it('should return null if generator returns null', async () => {
    const mockConcepts = [
      {
        concept: {
          id: '1',
          baslik: 'Kavram 1',
          aciklama: 'Kavram 1 açıklaması',
          seviye: 'Bilgi',
          odak: 'Focus',
          gorsel: null,
          onem: 'high',
          altKavramlar: [],
          iliskiler: [],
        } as ConceptMapItem,
        index: 0,
      },
    ];
    vi.mocked(StructuredGenerator.generate).mockResolvedValueOnce(null);

    const result = await draftBatch({
      concepts: mockConcepts,
      courseName: 'Test Course',
      usageType: 'antrenman',
      sharedContextPrompt: 'Context',
    });

    expect(result).toBeNull();
  });
});
