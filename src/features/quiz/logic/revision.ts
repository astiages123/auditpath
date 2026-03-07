import { z } from 'zod';
import { getTaskConfig } from '@/utils/aiConfig';
import {
  BatchRevisionResponseSchema,
  type GeneratedQuestion,
  GeneratedQuestionSchema,
  type ValidationResult,
} from '../types';
import { GLOBAL_AI_SYSTEM_PROMPT, PromptArchitect } from './prompts';
import { generate } from './structuredGenerator';

interface RevisionEntry {
  question: GeneratedQuestion;
  validation: ValidationResult;
}

/**
 * Hatalı soruyu revize eder (tekil — geriye dönük uyumluluk).
 * Dahili olarak reviseQuestions batch çağrısına yönlendirir.
 */
export async function reviseQuestion(
  originalQuestion: GeneratedQuestion,
  validationResult: ValidationResult,
  sharedContextPrompt: string
): Promise<GeneratedQuestion | null> {
  const results = await reviseQuestions(
    [{ question: originalQuestion, validation: validationResult }],
    sharedContextPrompt
  );
  return results[0] ?? null;
}

/**
 * Reddedilen soruları toplu olarak revize eder (batch revision).
 * Her soruyu index ile eşleştirir ve dönen sonuçları aynı sırayla döndürür.
 */
export async function reviseQuestions(
  entries: RevisionEntry[],
  sharedContextPrompt: string
): Promise<(GeneratedQuestion | null)[]> {
  if (entries.length === 0) return [];

  if (entries.length === 1) {
    const entry = entries[0];
    const result = await reviseSingle(
      entry.question,
      entry.validation,
      sharedContextPrompt
    );
    return [result];
  }

  const questionList = entries
    .map(
      (entry, index) =>
        `### Soru ${index}:\n${JSON.stringify(
          {
            q: entry.question.q,
            o: entry.question.o,
            a: entry.question.a,
            exp: entry.question.exp,
            evidence: entry.question.evidence || '',
            diagnosis: entry.question.diagnosis || '',
            insight: entry.question.insight || '',
          },
          null,
          2
        )}\nKRİTİK HATALAR: ${entry.validation.critical_faults.join(
          ', '
        )}\nÖNERİ: ${entry.validation.improvement_suggestion}`
    )
    .join('\n\n');

  const revisionTask = `Aşağıdaki ${entries.length} soru REDDEDİLMİŞTİR. Her birini revize et ve düzeltilmiş hallerini döndür.

${questionList}

### ZORUNLU JSON FORMATI
Yanıtını geçerli bir JSON objesi olarak döndür. Markdown etiketi kullanma.
{
  "questions": [
    {
      "index": <orijinal soru indeksi (0'dan başlar)>,
      "q": "<revize soru metni>",
      "o": ["<A>", "<B>", "<C>", "<D>", "<E>"],
      "a": <0-4>,
      "exp": "<açıklama>",
      "evidence": "<metinden dayanak>",
      "diagnosis": "<öğrencinin hatasına dair kısa teşhis>",
      "insight": "<mentor notu>"
    }
  ]
}`;

  const aiConfig = getTaskConfig('revision');
  const messages = PromptArchitect.assemble(
    aiConfig.systemPromptPrefix
      ? aiConfig.systemPromptPrefix + '\n' + GLOBAL_AI_SYSTEM_PROMPT
      : GLOBAL_AI_SYSTEM_PROMPT,
    sharedContextPrompt,
    revisionTask
  );

  const result = await generate<z.infer<typeof BatchRevisionResponseSchema>>(
    messages,
    {
      schema: BatchRevisionResponseSchema,
      task: 'revision',
    }
  );

  if (!result) return entries.map(() => null);

  const resultMap = new Map<number, z.infer<typeof GeneratedQuestionSchema>>();
  for (const revised of result.questions) {
    const { index, ...questionData } = revised;
    resultMap.set(index, questionData);
  }

  return entries.map((entry, index) => {
    const revised = resultMap.get(index);
    if (!revised) return null;

    return {
      ...revised,
      bloomLevel: entry.question.bloomLevel,
      img: entry.question.img,
      concept: entry.question.concept,
      insight: revised.insight ?? undefined,
    } satisfies GeneratedQuestion;
  });
}

/**
 * Tek bir soruyu revize eder (dahili kullanım).
 */
async function reviseSingle(
  originalQuestion: GeneratedQuestion,
  validationResult: ValidationResult,
  sharedContextPrompt: string
): Promise<GeneratedQuestion | null> {
  const revisionTask = `Aşağıdaki soru REDDEDİLMİŞTİR. Lütfen revize et.\n\n## REDDEDİLEN SORU:\n${JSON.stringify(
    {
      q: originalQuestion.q,
      o: originalQuestion.o,
      a: originalQuestion.a,
      exp: originalQuestion.exp,
      evidence: originalQuestion.evidence || '',
      diagnosis: originalQuestion.diagnosis || '',
      insight: originalQuestion.insight || '',
    },
    null,
    2
  )}\n\n## KRİTİK HATALAR:\n${validationResult.critical_faults.join(
    '\n'
  )}\n\n## ÖNERİ:\n${validationResult.improvement_suggestion}

### ZORUNLU JSON FORMATI
Yanıtını geçerli bir JSON objesi olarak döndür. Markdown etiketi kullanma.
{
  "q": "<revize soru metni>",
  "o": ["<A>", "<B>", "<C>", "<D>", "<E>"],
  "a": <0-4>,
  "exp": "<açıklama>",
  "evidence": "<metinden dayanak>",
  "diagnosis": "<öğrencinin hatasına dair kısa teşhis>",
  "insight": "<mentor notu>"
}`;

  const aiConfig = getTaskConfig('revision');
  const messages = PromptArchitect.assemble(
    aiConfig.systemPromptPrefix
      ? aiConfig.systemPromptPrefix + '\n' + GLOBAL_AI_SYSTEM_PROMPT
      : GLOBAL_AI_SYSTEM_PROMPT,
    sharedContextPrompt,
    revisionTask
  );

  const result = await generate<z.infer<typeof GeneratedQuestionSchema>>(
    messages,
    {
      schema: GeneratedQuestionSchema,
      task: 'revision',
    }
  );

  if (!result) return null;

  return {
    ...result,
    bloomLevel: originalQuestion.bloomLevel,
    img: originalQuestion.img,
    concept: originalQuestion.concept,
    insight: result.insight ?? undefined,
  } satisfies GeneratedQuestion;
}
