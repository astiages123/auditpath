import { callMiMo, parseJsonResponse, type LogCallback } from '../clients/mimo';
import type { ConceptMapItem } from '../mapping';
import { buildPrompt, determineNodeStrategy } from './prompt';

export interface GeneratedQuestion {
  q: string;
  o: string[];
  a: number;
  exp: string;
  img?: string | null;
  bloomLevel: 'knowledge' | 'application' | 'analysis';
}

export interface WrongAnswerContext {
  chunkId: string;
  originalQuestion: {
    id: string;
    q: string;
    o: string[];
    a: number;
    exp: string;
    img?: string | null;
  };
  incorrectOptionIndex: number;
  correctOptionIndex: number;
  courseId: string;
  userId: string;
}

/**
 * Generate questions for a batch of concepts
 */
export async function generateQuestionBatch(
  content: string,
  courseName: string,
  sectionTitle: string,
  wordCount: number,
  concepts: ConceptMapItem[],
  conceptIndex: number,
  subjectGuidelines: { instruction?: string; few_shot_example?: unknown } | null,
  onLog?: LogCallback
): Promise<GeneratedQuestion[]> {
  const validQuestions: GeneratedQuestion[] = [];

  for (let i = 0; i < concepts.length; i++) {
    const concept = concepts[i];
    const strategy = determineNodeStrategy(conceptIndex + i, wordCount, concept);
    
    onLog?.('Soru üretimi başlatılıyor', { 
      concept: concept.baslik,
      seviye: concept.seviye,
      bloomLevel: strategy.bloomLevel
    });

    const prompt = buildPrompt(content, courseName, sectionTitle, concept, strategy, subjectGuidelines);
    
    // Temperature: progressively more creative if needed
    const temperature = 0.7;
    
    const response = await callMiMo(
      'Sen KPSS uzmanı bir yapay zekasın. SADECE JSON formatında soru üret.',
      prompt,
      temperature,
      onLog
    );

    const questionData = parseJsonResponse(response, 'object') as { q: string; o: string[]; a: number; exp: string } | null;
    
    if (questionData && questionData.q && Array.isArray(questionData.o) && typeof questionData.a === 'number') {
      validQuestions.push({
        q: questionData.q,
        o: questionData.o,
        a: questionData.a,
        exp: questionData.exp || '',
        bloomLevel: strategy.bloomLevel,
        img: concept.gorsel || null
      });
      
      onLog?.('Soru üretildi', { 
        preview: questionData.q.substring(0, 60) + '...',
        bloomLevel: strategy.bloomLevel 
      });
    } else {
      onLog?.('Soru parse edilemedi', { responseLength: response.length });
    }
  }

  onLog?.('Batch tamamlandı', { 
    total: concepts.length,
    valid: validQuestions.length
  });

  return validQuestions;
}

/**
 * Generate a follow-up question for a wrong answer
 */
export async function generateFollowUpQuestion(
  context: WrongAnswerContext,
  courseName: string,
  sectionTitle: string,
  guidelines: { instruction?: string; few_shot_example?: unknown } | null,
  onLog?: LogCallback
): Promise<GeneratedQuestion | null> {
  onLog?.('Follow-up soru üretimi başlatılıyor', { 
    chunkId: context.chunkId,
    originalQuestionId: context.originalQuestion.id
  });

  const systemPrompt = `Sen, Türkiye'deki KPSS için profesyonel soru hazırlayan bir yapay zeka asistanısın.

Kullanıcı bir önceki soruyu YANLIŞ cevapladı. Sana verilen soruyla MANTIK OLARAK BENZER ama AYNI OLMAYAN yeni bir soru üretmelisin.

## ZORUNLU KURALLAR:
1. **JSON FORMATI**: Cevabını YALNIZCA JSON formatında ver.
2. **MANTİKSAL BENZERLİK**: Aynı kavramı/konuyu test et ama farklı bir senaryo veya bağlam kullan. ASLA aynı soru metnini kopyalama.
3. **ZORLUK**: Aynı seviyede ol.
4. **OLUMSUZ VURGU**: Olumsuz ifadeler (değildir, yoktur vb.) **kalın** yazılmalı.`;

  const originalQuestionJson = {
    q: context.originalQuestion.q,
    o: context.originalQuestion.o,
    a: context.originalQuestion.a,
    exp: context.originalQuestion.exp,
    img: context.originalQuestion.img || null
  };

  const userPrompt = `## DERS: ${courseName}
## ÜNİTE: ${sectionTitle}

## YANLIŞ CEVAPLANAN SORU:
${JSON.stringify(originalQuestionJson, null, 2)}

Kullanıcının verdiği cevap: ${['A', 'B', 'C', 'D', 'E'][context.incorrectOptionIndex]} ("${context.originalQuestion.o[context.incorrectOptionIndex]}")
Doğru cevap: ${['A', 'B', 'C', 'D', 'E'][context.correctOptionIndex]} ("${context.originalQuestion.o[context.correctOptionIndex]}")

${guidelines?.instruction ? `## DERS ÖZEL TALİMATI:\n${guidelines.instruction}\n` : ''}

## GÖREV:
Yukarıdaki soruyla MANTIK OLARAK BENZER ama AYNI OLMAYAN yeni bir soru üret.
Cevabını YALNIZCA JSON formatında ver.
{ "q": "...", "o": ["...", "...", "...", "...", "..."], "a": 0, "exp": "..." }`;

  const response = await callMiMo(
    systemPrompt,
    userPrompt,
    0.7,
    onLog
  );

  const questionData = parseJsonResponse(response, 'object') as { q: string; o: string[]; a: number; exp: string } | null;
  
  if (questionData && questionData.q && Array.isArray(questionData.o) && typeof questionData.a === 'number') {
    return {
      q: questionData.q,
      o: questionData.o,
      a: questionData.a,
      exp: questionData.exp || '',
      bloomLevel: 'application', // Follow-ups focus on application
      img: context.originalQuestion.img || null
    };
  }

  onLog?.('Follow-up soru parse edilemedi', { responseLength: response.length });
  return null;
}
