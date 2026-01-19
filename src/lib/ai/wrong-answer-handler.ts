/**
 * Wrong Answer Handler
 *
 * Bu modül, kullanıcının yanlış cevapladığı sorular için
 * adaptif follow-up soru üretimi sağlar.
 *
 * - Aynı konudan farklı açıyla soru üretir
 * - parent_question_id ile orijinal soruya bağlanır
 * - SRS algoritmasıyla entegre çalışır
 */

import { supabase } from '../supabase';
import {
  QuizQuestion,
  QuizGenerationResult,
  getNoteContext,
  getSubjectGuidelines,
} from './quiz-api';

// --- Configuration ---
// const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'; // Unused
const MODEL_MIMO = 'xiaomi/mimo-v2-flash:free';

// --- Types ---
export interface WrongAnswerContext {
  chunkId: string;
  originalQuestion: QuizQuestion;
  incorrectOptionIndex: number;
  correctOptionIndex: number;
  topic: string;
  courseId: string;
  userId: string;
}

// --- Follow-up System Prompt ---
const FOLLOW_UP_SYSTEM_PROMPT = `Sen, Türkiye'deki KPSS için profesyonel soru hazırlayan bir yapay zeka asistanısın.

Kullanıcı bir önceki soruyu YANLIŞ cevapladı. Sana verilen soruyla MANTİK OLARAK BENZER ama AYNI OLMAYAN yeni bir soru üretmelisin.

## ZORUNLU KURALLAR:

1. **JSON FORMATI**: Cevabını YALNIZCA aşağıdaki JSON formatında ver:
{
  "q": "Soru metni...",
  "o": ["A şıkkı", "B şıkkı", "C şıkkı", "D şıkkı", "E şıkkı"],
  "a": 0,
  "exp": "Açıklama...",
  "img": null
}

2. **MANTİKSAL BENZERLİK**: Aynı kavramı/konuyu test et ama:
   - FARKLI bir senaryo veya bağlam kullan
   - FARKLI şıklar oluştur (aynı şıkları kopyalama)
   - Kullanıcının eksik olduğu noktayı hedefle
   - ASLA aynı soru metnini kullanma

3. **ZORLUK**: Aynı veya biraz daha kolay seviyede ol - kullanıcı öğrenme aşamasında

4. **ŞIK SAYISI**: Her zaman tam olarak 5 şık (A, B, C, D, E) olmalı

5. **OLUMSUZ VURGU**: Olumsuz ifadeler (değildir, yoktur vb.) **kalın** ve küçük harf olmalı`;

/**
 * Build follow-up prompt with wrong answer context - JSON doğrudan AI'a gönderilir
 */
function buildFollowUpPrompt(
  context: WrongAnswerContext,
  _noteContent: string,
  guidelines: { instruction?: string; few_shot_example?: QuizQuestion } | null
): string {
  const parts: string[] = [];

  // Doğrudan orijinal sorunun JSON'unu gönder
  const originalQuestionJson = {
    q: context.originalQuestion.q,
    o: context.originalQuestion.o,
    a: context.originalQuestion.a,
    exp: context.originalQuestion.exp,
    img: context.originalQuestion.img || null
  };

  parts.push(`## YANLIŞ CEVAPLANAN SORU (JSON):
\`\`\`json
${JSON.stringify(originalQuestionJson, null, 2)}
\`\`\`

Kullanıcının verdiği cevap: ${['A', 'B', 'C', 'D', 'E'][context.incorrectOptionIndex]} (Şıkkı: "${context.originalQuestion.o[context.incorrectOptionIndex]}")
Doğru cevap: ${['A', 'B', 'C', 'D', 'E'][context.correctOptionIndex]} (Şıkkı: "${context.originalQuestion.o[context.correctOptionIndex]}")`);

  // Add subject-specific instruction if available
  if (guidelines?.instruction) {
    parts.push(`## DERS ÖZEL TALİMATI:\n${guidelines.instruction}`);
  }

  parts.push(`## GÖREV:
Yukarıdaki JSON'daki soruyla MANTIK OLARAK BENZER ama AYNI OLMAYAN yeni bir soru üret.
- Aynı kavramı/konuyu test et
- Farklı bir açı/senaryo kullan
- Farklı şıklar oluştur
Cevabını YALNIZCA JSON formatında ver.`);

  return parts.join('\n\n');
}

/**
 * Parse and validate JSON response
 */
function parseQuizResponse(responseText: string): QuizQuestion | null {
  try {
    let jsonStr = responseText.trim();

    // Handle markdown code blocks
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Also try to find raw JSON object
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }

    const parsed = JSON.parse(jsonStr);

    // Validate structure
    if (
      typeof parsed.q !== 'string' ||
      !Array.isArray(parsed.o) ||
      parsed.o.length !== 5 ||
      typeof parsed.a !== 'number' ||
      parsed.a < 0 ||
      parsed.a > 4 ||
      typeof parsed.exp !== 'string'
    ) {
      console.error('[FollowUp] Invalid quiz question structure:', parsed);
      return null;
    }

    return {
      q: parsed.q,
      o: parsed.o.map((opt: unknown) => String(opt)),
      a: parsed.a,
      exp: parsed.exp,
      img: parsed.img || null,
    };
  } catch (e) {
    console.error('[FollowUp] Failed to parse quiz response:', e);
    return null;
  }
}

/**
 * Call OpenRouter API
 */
/**
 * Call AI Proxy Edge Function
 */
async function callOpenRouterAPI(prompt: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: {
        provider: 'openrouter',
        prompt,
        systemPrompt: FOLLOW_UP_SYSTEM_PROMPT,
        model: MODEL_MIMO,
        temperature: 0.7
      }
    });

    if (error) {
      console.error('[FollowUp] Edge Function error:', error);
      return null;
    }

    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error('[FollowUp] Edge Function call failed:', error);
    return null;
  }
}

/**
 * Save follow-up question to database with parent reference
 */
async function saveFollowUpQuestion(
  question: QuizQuestion,
  context: WrongAnswerContext,
  sectionTitle: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.from('questions').insert({
      course_id: context.courseId,
      chunk_id: context.chunkId,
      section_title: sectionTitle,
      question_data: question as unknown as import('../types/supabase').Json,
      usage_type: 'antrenman', // Follow-ups are always training questions
      sequence_index: 0,
      bloom_level: 'application', // Follow-ups focus on application
      parent_question_id: context.originalQuestion.id || null,
      is_global: false,
      created_by: context.userId,
    }).select('id').single();

    if (error) {
      console.error('[FollowUp] Error saving question:', error);
      return null;
    }


    return data.id;
  } catch (err) {
    console.error('[FollowUp] Exception saving question:', err);
    return null;
  }
}

/**
 * Generate a follow-up question for a wrong answer
 */
export async function generateFollowUpQuestion(
  context: WrongAnswerContext
): Promise<QuizGenerationResult> {


  // 1. Get note context
  const noteContext = await getNoteContext(context.chunkId);
  if (!noteContext) {
    console.error('[FollowUp] Note context not found');
    return { success: false, error: 'Not içeriği bulunamadı.' };
  }

  // 2. Get subject guidelines
  const guidelines = await getSubjectGuidelines(noteContext.courseName);

  // 3. Build prompt
  const prompt = buildFollowUpPrompt(context, noteContext.content, guidelines);

  // 4. Call API
  const responseText = await callOpenRouterAPI(prompt);
  if (!responseText) {
    return { success: false, error: 'API bağlantısı başarısız oldu.' };
  }

  // 5. Parse response
  const question = parseQuizResponse(responseText);
  if (!question) {
    return { success: false, error: 'Geçersiz yanıt formatı.' };
  }

  // 6. Save to database
  const savedId = await saveFollowUpQuestion(question, context, noteContext.h2Title);
  if (savedId) {
    question.id = savedId;
  }


  return { success: true, question };
}

/**
 * Check if a question is a follow-up (has parent)
 */
export async function isFollowUpQuestion(questionId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('questions')
    .select('parent_question_id')
    .eq('id', questionId)
    .single();

  if (error || !data) return false;
  return data.parent_question_id !== null;
}
