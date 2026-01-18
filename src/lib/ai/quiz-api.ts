/**
 * MiMo V2 Flash Quiz Generation API
 *
 * This module provides integration with Xiaomi's MiMo V2 Flash model
 * via OpenRouter for generating KPSS-standard quiz questions.
 */

import { supabase } from '../supabase';
import { validateQuestion, isValidationPassed } from './QuestionValidatorService';

// --- Configuration ---
// const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'; // Unused
const MODEL_MIMO = 'xiaomi/mimo-v2-flash:free';
const MODEL_MAPPER = 'xiaomi/mimo-v2-flash:free';
const MAX_RETRIES = 2;

// --- Types ---
export interface QuizQuestion {
  q: string; // Question text (may contain LaTeX)
  o: string[]; // 5 options (A-E)
  a: number; // Correct answer index (0-4)
  exp: string; // Explanation (may contain LaTeX)
  img?: string | null; // Optional image filename
  imgPath?: string | null; // Dynamic path for the image
  id?: string; // Database ID of the question
}

export interface ConceptMapItem {
  baslik: string;
  odak: string;
  seviye: 'Bilgi' | 'Uygulama' | 'Analiz';
  gorsel: string | null;
}

export type ConceptMap = ConceptMapItem[];

export interface SubjectGuidelines {
  subject_name: string;
  instruction: string;
  few_shot_example: QuizQuestion;
}

export interface NoteContext {
  courseId?: string;
  courseSlug?: string;
  courseName: string;
  h1Title: string | null;
  h2Title: string | null;
  h3Title: string;

  content: string;
  wordCount: number;
  metadata?: Record<string, unknown>;
}

export type QuestionUsageType = 'antrenman' | 'arsiv' | 'deneme';
export type BloomLevel = 'knowledge' | 'application' | 'analysis';

interface QuotaDefinition {
  total: number;
}

export interface QuizGenerationResult {
  success: boolean;
  question?: QuizQuestion;
  error?: string;
}

// --- System Prompt ---
const SYSTEM_PROMPT = `Sen, Türkiye'deki KPSS (Kamu Personeli Seçme Sınavı) için profesyonel soru hazırlayan bir yapay zeka asistanısın.

## ZORUNLU KURALLAR:

1. **JSON FORMATI**: Cevabını YALNIZCA aşağıdaki JSON formatında ver. Başka hiçbir metin ekleme:
{
  "q": "Soru metni...",
  "o": ["A şıkkı", "B şıkkı", "C şıkkı", "D şıkkı", "E şıkkı"],
  "a": 0,
  "exp": "Açıklama...",
  "img": null veya "dosya_adi.webp" (Eğer bir görsel kullanıldıysa)
}

2. **LATEX FORMATI**: Tüm matematiksel ifadeleri LaTeX formatında yaz:
   - Inline formüller için: $formül$
   - Blok formüller için: $$formül$$
   - Örnekler: $x^2$, $\\frac{a}{b}$, $\\sum_{i=1}^{n}$

3. **GÖRSEL KULLANIMI**:
   - Eğer sana "GÖRSEL REFERANSI" başlığı altında bir dosya veya 'gorsel' alanı verildiyse, soruyu MUTLAKA bu görsele dayandır.
   - Eğer görsel verildi ise: "Grafiğe göre...", "Şekildeki verilere dayanarak..." gibi ifadeler KULLAN.
   - Eğer görsel VERİLMEDİ ise: Soru kökünde ASLA "Aşağıdaki grafikte", "Yandaki şekilde", "Tabloya göre" gibi görsel atıflarda BULUNMA. Soruyu tamamen metinsel kurgula.
   - ÖNEMLİ: Soru metninin içinde ASLA dosya adını (örn: "image7.webp") GEÇİRME. Sadece içeriğe atıf yap.

4. **DİL VE ÜSLUP**:
   - Akademik Türkçe kullan
   - Dersin terminolojisine sadık kal
   - Şıklar mantıklı ve KPSS standardında olmalı

5. **ŞIK SAYISI**: Her zaman tam olarak 5 şık (A, B, C, D, E) olmalı

6. **DOĞRU CEVAP**: "a" alanı 0-4 arası bir sayı olmalı (0=A, 1=B, 2=C, 3=D, 4=E)

7. **OLUMSUZ VURGU FORMATI**:
   - Soru kökündeki olumsuz ifadeler (değildir, almaz, yoktur, beklenemez, yanlıştır, aşağıdakilerden hangisi...değildir vb.) ASLA tamamen büyük harfle (ALL CAPS) yazılmamalıdır.
   - Bu kelimeler yalnızca **kalın** (bold) ve küçük harf olmalıdır.
   - Doğru örnek: "Aşağıdakilerden hangisi anayasal bir hak **değildir**?"
   - Yanlış örnek: "Aşağıdakilerden hangisi anayasal bir hak DEĞİLDİR?"

8. **BAĞLAMSAL BÜTÜNLÜK**:
   - Soru kökünde bir öncüle, veriye veya sıralamaya atıf yapılıyorsa (Örn: "Verilen bilgilere göre...", "Yukarıdaki tabloya göre...", "I, II ve III numaralı ifadelerden..."), bu bilgiler soru metni içerisinde mutlaka yer almalıdır.
   - Bağımsız sorularda gereksiz atıf cümleleri kullanılmamalıdır.
   - Eğer soru "Aşağıdakilerden hangileri doğrudur?" formatındaysa, "Aşağıdakiler" listesini soru metninde açıkça belirt.`;

const MAPPER_SYSTEM_PROMPT = `Sen bir Eğitim İçerik Analistisin. Metni analiz ederek soru üretilecek [TARGET_COUNT] adet ana durak belirle. 
Metnin baş, orta ve son kısımlarından dengeli bir dağılım yap. 
Metin içerisindeki görsel referanslarını (örn: image7.webp) tespit et ve ilgili konuyla eşleştir.

Sadece şu formatta bir JSON dizisi döndür: 
[
  { 
    "baslik": "Kısa Konu Başlığı", 
    "odak": "Neye odaklanılacak?",
    "seviye": "Bilgi" | "Uygulama" | "Analiz",
    "gorsel": "imageX.webp" | null
  }
]
Açıklama ekleme.`;

export interface QuotaStatus {
  wordCount: number;
  conceptCount: number;
  quota: QuotaDefinition;
  used: number;
  isFull: boolean;
}

// --- API Functions ---

/**
 * Get subject guidelines from database
 */
export async function getSubjectGuidelines(
  courseName: string
): Promise<SubjectGuidelines | null> {
  // 1. Try exact match
  const { data: initialData, error } = await supabase
    .from('subject_guidelines')
    .select('subject_name, instruction, few_shot_example')
    .eq('subject_name', courseName)
    .maybeSingle();

  let data = initialData;

  // 2. If no match and name has a dash/hyphen (e.g., "Mikro İktisat - Bilge Beyaz"),
  // try matching with the base subject name ("Mikro İktisat")
  if (!data && (courseName.includes('-') || courseName.includes('–'))) {
    const baseName = courseName.split(/[–-]/)[0].trim();

    
    const { data: baseData } = await supabase
      .from('subject_guidelines')
      .select('subject_name, instruction, few_shot_example')
      .eq('subject_name', baseName)
      .maybeSingle();
    
    data = baseData;
  }

  // 3. Fallback: Try to find a subject name that is CONTAINED within the course name
  // E.g., if course is "Genel Muhasebe - Sinan Öztürk", search for "Muhasebe"
  if (!data) {

    
    // Fetch all subject labels to find a match in JS
    const { data: allSubjects } = await supabase
      .from('subject_guidelines')
      .select('subject_name, instruction, few_shot_example');
    
    if (allSubjects) {
      // Find the longest subject name that is contained in our courseName
      // Longest first to avoid matching "İktisat" when "Mikro İktisat" is what we want
      const sortedSubjects = [...allSubjects].sort((a, b) => b.subject_name.length - a.subject_name.length);
      
      const bestMatch = sortedSubjects.find(s => 
        courseName.toLocaleLowerCase('tr').includes(s.subject_name.toLocaleLowerCase('tr'))
      );
      
      if (bestMatch) {

        data = bestMatch;
      }
    }
  }

  if (error || !data) {
    console.warn(`No guidelines found for subject: ${courseName}`);
    return null;
  }

  return {
    subject_name: data.subject_name,
    instruction: data.instruction,
    few_shot_example: data.few_shot_example as unknown as QuizQuestion,
  };
}

/**
 * Get note content with hierarchy for quiz generation
 */
export async function getNoteContext(chunkId: string): Promise<NoteContext | null> {
  const { data, error } = await supabase
    .from('note_chunks')
    .select('course_id, course_name, section_title, content, metadata, parent_h1_id, parent_h2_id, word_count')
    .eq('id', chunkId)
    .single();

  if (error || !data) {
    console.error('Error fetching note chunk:', error);
    return null;
  }

  // Fetch course slug for dynamic image paths
  const { data: courseData } = await supabase
    .from('courses')
    .select('course_slug')
    .eq('id', data.course_id)
    .single();

  // Extract hierarchy from metadata if available
  const metadata = (data.metadata || {}) as Record<string, unknown>;
  const h1Title = (metadata.h1_title as string) || data.parent_h1_id || null;
  const h2Title = (metadata.h2_title as string) || data.parent_h2_id || null;

  return {
    courseId: data.course_id,
    courseSlug: courseData?.course_slug,
    courseName: data.course_name,
    h1Title,
    h2Title,
    h3Title: data.section_title,
    content: data.content,
    wordCount: data.word_count || 0,
    metadata,
  };
}

/**
 * Save generated concept map to note chunk metadata
 */
async function saveConceptMapToChunk(chunkId: string, map: ConceptMap, currentMetadata: Record<string, unknown> = {}): Promise<void> {
  try {
    const updatedMetadata = {
      ...currentMetadata,
      concept_map: map
    };

    const { error } = await supabase
      .from('note_chunks')
      .update({ metadata: updatedMetadata as unknown as import('../types/supabase').Json })
      .eq('id', chunkId);

    if (error) {
      console.error('[QuizGen] Error saving concept map to chunk:', error);
    } else {

    }
  } catch (err) {
    console.error('[QuizGen] Exception saving concept map:', err);
  }
}

/**
 * Calculate quota based on word count
 * Formula: 
 * - baseCount = determined by wordCount
 * - antrenman = baseCount (100%)
 * - arsiv = 25% of antrenman
 * - deneme = 25% of antrenman
 * - total = antrenman + arsiv + deneme
 */
/**
 * Calculate quota based on Concept Density (CD)
 * CD = Concept Count / Word Count
 * Multipliers:
 * CD < 2%: 0.8x
 * 2% <= CD <= 5%: 1.0x
 * CD > 5%: 1.3x
 * FinalQuota = BaseQuota(WordCount) * Multiplier
 */
function calculateQuota(wordCount: number, conceptCount: number): QuotaDefinition {
  // 1. Base Quota
  let baseCount = 4;
  if (wordCount <= 150) {
    baseCount = 4;
  } else if (wordCount <= 500) {
    baseCount = 8;
  } else if (wordCount <= 1200) {
    baseCount = 12;
  } else {
    baseCount = 20;
  }

  // 2. Concept Density (CD) logic
  // Avoid division by zero
  const safeWordCount = wordCount > 0 ? wordCount : 1;
  const cd = conceptCount / safeWordCount;
  
  let multiplier = 1.0;
  if (cd < 0.02) {
      multiplier = 0.8;
  } else if (cd <= 0.05) {
      multiplier = 1.0;
  } else {
      multiplier = 1.3;
  }

  const finalTotal = Math.round(baseCount * multiplier);

  // Ensure minimum 1 if concepts exist, else 0? 
  // If conceptCount is 0, cd is 0 -> multiplier 0.8 -> total = base * 0.8.
  // But if conceptCount is actually 0, we can't generate questions properly (no topics).
  // Check caller logic: if conceptCount == 0 returns error. So here we just calculate quota.

  return { 
    total: Math.max(1, finalTotal)
  };
}

/**
 * Determine the next usage type and sequence index
 */
/**
 * Determine Node Selection Strategy based on progress and chunk size
 */
function determineNodeStrategy(
  currentCount: number,
  totalQuota: number,
  wordCount: number
): { bloomLevel: BloomLevel; instruction: string; nodeType: 'Definition' | 'Relationship' | 'Result' } {
  if (totalQuota === 0) return { bloomLevel: 'knowledge', instruction: '', nodeType: 'Definition' };

  // Small Chunk Strategy (<= 150 words)
  // Only Definition and Relationship. No Analysis/Result.
  if (wordCount <= 150) {
      // Alternate between Definition and Relationship
      const isRel = currentCount % 2 !== 0; 
      
      if (isRel) {
          return {
              bloomLevel: 'application', // Using application instead of analysis to keep it simpler
              nodeType: 'Relationship',
              instruction: "Şu an 'İlişki' aşamasındasın. Seçilen kavramın diğer kavramlarla ilişkisini, farklarını veya benzerliklerini sorgulayan bir soru üret. (Analiz/Sonuç düzeyine girme)."
          };
      } else {
          return {
              bloomLevel: 'knowledge',
              nodeType: 'Definition',
              instruction: "Şu an 'Tanım' aşamasındasın. Seçilen kavramın temel tanımını, ne olduğunu ve temel özelliklerini sorgulayan bir soru üret."
          };
      }
  }

  // Normal Strategy for larger chunks
  const progress = currentCount / totalQuota;

  if (progress < 0.40) {
    // 0-40%: Definition (Knowledge)
    return {
      bloomLevel: 'knowledge',
      nodeType: 'Definition',
      instruction: "Şu an 'Tanım' aşamasındasın. Seçilen kavramın temel tanımını, ne olduğunu ve temel özelliklerini sorgulayan bir soru üret."
    };
  } else if (progress < 0.80) {
    // 40-80%: Relationship (Application/Analysis)
    return {
      bloomLevel: 'analysis',
      nodeType: 'Relationship',
      instruction: "Şu an 'İlişki' aşamasındasın. Seçilen kavramın diğer kavramlarla ilişkisini, farklarını veya benzerliklerini sorgulayan bir soru üret."
    };
  } else {
    // 80-100%: Result/Effect (Analysis)
    return {
      bloomLevel: 'analysis',
      nodeType: 'Result',
      instruction: "Şu an 'Sonuç/Etki' aşamasındasın. Seçilen kavramın doğurduğu sonuçları, etkilerini veya neden-sonuç bağlamını sorgulayan bir soru üret."
    };
  }
}


/**
 * Save generated question to database
 */
async function saveQuestionToDatabase(
  question: QuizQuestion,
  noteContext: NoteContext,
  chunkId: string | null,
  metadata: { 
    usageType: QuestionUsageType; 
    sequenceIndex: number; 
    bloomLevel: BloomLevel; 
    isGlobal?: boolean; 
    createdBy?: string;
    qualityScore?: number;
    validatorFeedback?: string;
    validationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  }
): Promise<string | null> {
  if (!noteContext.courseId) {
    console.error('Cannot save question: courseId is missing');
    return null;
  }

  try {
    const { data, error } = await supabase.from('questions').insert({
      course_id: noteContext.courseId,
      chunk_id: chunkId,
      section_title: noteContext.h3Title,
      question_data: question as unknown as import('../types/supabase').Json,
      usage_type: metadata.usageType,
      sequence_index: metadata.sequenceIndex,
      bloom_level: metadata.bloomLevel,
      is_global: metadata.isGlobal ?? true,
      created_by: metadata.createdBy ?? null,
      quality_score: metadata.qualityScore ?? null,
      validator_feedback: metadata.validatorFeedback ?? null,
      validation_status: metadata.validationStatus ?? 'APPROVED'
    }).select('id').single();

    if (error) {
      console.error('Error saving question to database:', error);
      return null;
    } else {

      return data.id;
    }
  } catch (err) {
    console.error('Exception saving question to database:', err);
    return null;
  }
}

/**
 * Build the complete prompt for MiMo
 */
function buildPrompt(
  noteContext: NoteContext,
  guidelines: SubjectGuidelines | null,
  bloomInstruction?: string,
  conceptMapItem?: ConceptMapItem | null
): string {
  const parts: string[] = [];

  // Add subject-specific instruction if available
  if (guidelines?.instruction) {
    parts.push(`## DERS ÖZEL TALİMATI (${noteContext.courseName}):\n${guidelines.instruction}`);
  }

  // Add few-shot example if available
  if (guidelines?.few_shot_example) {
    parts.push(`## ÖRNEK SORU:\n\`\`\`json\n${JSON.stringify(guidelines.few_shot_example, null, 2)}\n\`\`\``);
  }

  // Add note content with hierarchy
  const hierarchyStr = [
    noteContext.h1Title ? `Ders: ${noteContext.h1Title}` : null,
    noteContext.h2Title ? `Konu Grubu: ${noteContext.h2Title}` : null,
    `Konu: ${noteContext.h3Title}`,
  ]
    .filter(Boolean)
    .join(' > ');

  parts.push(`## DERS NOTU:
### ${hierarchyStr}

${noteContext.content}`);

  parts.push(
    `## GÖREV:\nYukarıdaki ders notu içeriğine dayalı, KPSS standardında özgün bir çoktan seçmeli soru üret. Cevabını YALNIZCA JSON formatında ver.`
  );

  if (conceptMapItem) {
    parts.push(`### Soru Odak Noktası (Kritik):
Bu soru için aşağıdaki başlığa ve odak noktasına sadık kal:
\`\`\`json
${JSON.stringify(conceptMapItem, null, 2)}
\`\`\``);

    if (conceptMapItem.gorsel) {
       parts.push(`## GÖRSEL REFERANSI:
Bu soru için şu görseli kullanmalısın: ${conceptMapItem.gorsel}
Lütfen soruyu bu görseldeki verilere/şekle dayandır.`);
    } else {
       parts.push(`## GÖRSEL DURUMU:
Bu soru için herhangi bir görsel (grafik, tablo, şekil) MEVCUT DEĞİLDİR.
Lütfen soruyu tamamen metne çözdürülebilir şekilde kurgula. "Aşağıdaki grafikte" gibi ifadeler KULLANMA.`);
    }
  }

  if (bloomInstruction) {
     parts.push(`## PEDAGOJİK HEDEF (GİZLİ):\n${bloomInstruction}`);
     
     // Override instruction based on mapper Level if available and different
     if (conceptMapItem?.seviye === 'Analiz' && !bloomInstruction.includes('Analiz')) {
         parts.push(`(Dikkat: İçerik haritası bu konunun ANALİZ seviyesinde sorulmasını öneriyor. Lütfen zorluğu artır.)`);
     }
  }

  return parts.join('\n\n');
}

/**
 * Parse and validate JSON response from MiMo
 */
function parseQuizResponse(responseText: string): QuizQuestion | null {
  try {
    // Try to extract JSON from the response
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
      console.error('Invalid quiz question structure:', parsed);
      return null;
    }

    return {
      q: parsed.q,
      o: parsed.o.map((opt: unknown) => String(opt)),
      a: parsed.a,
      exp: parsed.exp,
      img: parsed.img || null, // Capture image if returned by MiMo
    };
  } catch (e) {
    console.error('Failed to parse quiz response:', e);
    return null;
  }
}

/**
 * Call MiMo V2 Flash API via OpenRouter
 */
/**
 * Call OpenRouter API
 */
/**
 * Call AI Proxy Edge Function
 */
async function callOpenRouterAPI(prompt: string, model: string, systemPrompt: string, temperature: number = 0.7): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: {
        provider: 'openrouter',
        prompt,
        systemPrompt,
        model,
        temperature
      }
    });

    if (error) {
      console.error(`Edge Function error (${model}):`, error);
      return null;
    }

    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error(`Edge Function call failed (${model}):`, error);
    return null;
  }
}

/**
 * Generate Concept Map using Llama
 */
async function generateConceptMap(content: string, wordCount: number): Promise<ConceptMap | null> {
  let targetCount = 3;
  if (wordCount > 1200) targetCount = 14;
  else if (wordCount > 500) targetCount = 9;
  else if (wordCount > 150) targetCount = 5;

  const currentSystemPrompt = MAPPER_SYSTEM_PROMPT.replace('[TARGET_COUNT]', targetCount.toString());
  
  // We use the content as the user prompt
  const userPrompt = `Analiz edilecek metin:\n\n${content}`;



  // Call Llama
  const responseText = await callOpenRouterAPI(userPrompt, MODEL_MAPPER, currentSystemPrompt, 0.5);

  if (!responseText) {
    console.warn('[Mapper] API response empty.');
    return null;
  }

  try {
    // Attempt to extract JSON
    let jsonStr = responseText.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    else {
        const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
        if (arrayMatch) jsonStr = arrayMatch[0];
    }

    const parsed = JSON.parse(jsonStr);

    if (Array.isArray(parsed) && parsed.every((item: unknown) => typeof (item as ConceptMapItem).baslik === 'string' && typeof (item as ConceptMapItem).odak === 'string')) {

      return parsed as ConceptMap;
    }
    
    console.warn('[Mapper] Invalid JSON structure.', parsed);
    return null;

  } catch (e) {
    console.warn('[Mapper] Failed to parse JSON:', e);
    return null;
  }

}

/**
 * Fetch a pending follow-up question for the user
 * Pending means:
 * - Has parent_question_id (is a follow-up)
 * - chunk_id matches
 * - user has NOT answered this specific question yet
 */
async function fetchPendingFollowUpQuestion(
  chunkId: string,
  userId: string
): Promise<QuizQuestion | null> {
  try {
    // 1. Get all follow-up questions for this chunk (has parent_question_id)
    const { data: followUps, error: questionsError } = await supabase
      .from('questions')
      .select('id, question_data')
      .eq('chunk_id', chunkId)
      .not('parent_question_id', 'is', null);

    if (questionsError || !followUps || followUps.length === 0) {
      return null;
    }

    // 2. Get user's answered questions for this chunk
    const { data: progress, error: progressError } = await supabase
      .from('user_quiz_progress')
      .select('question_id')
      .eq('user_id', userId)
      .eq('chunk_id', chunkId);

    if (progressError) {
      console.warn('[QuizGen] Error checking progress:', progressError);
      return null;
    }

    const answeredIds = new Set(progress?.map(p => p.question_id) || []);

    // 3. Get user's question statuses to check for pending_followup
    const followUpIds = followUps.map(q => q.id);
    const { data: statuses } = await supabase
      .from('user_question_status')
      .select('question_id, status')
      .eq('user_id', userId)
      .in('question_id', followUpIds);

    const statusMap = new Map(statuses?.map(s => [s.question_id, s.status]) || []);

    // 4. Find the first follow-up that hasn't been answered and is pending
    const pending = followUps.find(q => {
      const userStatus = statusMap.get(q.id);
      // Return if not answered yet, or if status is pending_followup
      return !answeredIds.has(q.id) || userStatus === 'pending_followup';
    });

    if (pending) {

      const question = pending.question_data as unknown as QuizQuestion;
      question.id = pending.id;
      return question;
    }

    return null;
  } catch (e) {
    console.error('[QuizGen] Error fetching pending follow-ups:', e);
    return null;
  }
}


/**
 * Generate a quiz question for a given note chunk
 */
export async function generateQuizQuestion(
  chunkId: string,
  options: { userId?: string; isGlobal?: boolean; createdBy?: string } = {}
): Promise<QuizGenerationResult> {
  const { userId, isGlobal, createdBy } = options;


  // 0. Check for pending follow-up questions first (if userId provided)
  if (userId) {
    const pendingFollowUp = await fetchPendingFollowUpQuestion(chunkId, userId);
    if (pendingFollowUp) {

      
      // Inject image path if needed
      // We need note context for courseSlug to do this properly
      // So we'll do it after loading context, or just fetch it quickly here.
      // Actually, let's just let it be, or do a quick lookup if img is present.
      if (pendingFollowUp.img && !pendingFollowUp.imgPath) {
         // Optimization: We could fetch courseSlug, but maybe not critical if path is relative or handled by frontend
         // But let's try to be consistent.
         const { data: chunkData } = await supabase.from('note_chunks').select('course_id').eq('id', chunkId).single();
         if (chunkData) {
            const { data: courseData } = await supabase.from('courses').select('course_slug').eq('id', chunkData.course_id).single();
            if (courseData) {
               pendingFollowUp.imgPath = `/notes/${courseData.course_slug}/media/`;
            }
         }
      }

      return { success: true, question: pendingFollowUp };
    }
  }

  // 1. Get note context
  const noteContext = await getNoteContext(chunkId);
  if (!noteContext) {
    console.error('[QuizGen] Note context not found');
    return { success: false, error: 'Not içeriği bulunamadı.' };
  }


  // 2. Load or Generate Concept Map
  let conceptMap: ConceptMap | null = null;
  const existingMap = (noteContext.metadata?.concept_map as ConceptMap) || null;
  const mapCreatedAt = noteContext.metadata?.concept_map_created_at;

  const CONCEPT_MAP_TTL_DAYS = 7;
  const now = new Date();
  const isExpired = mapCreatedAt 
    ? (now.getTime() - new Date(mapCreatedAt as string).getTime() > CONCEPT_MAP_TTL_DAYS * 86400000) 
    : false;

  if (!isExpired && existingMap && Array.isArray(existingMap) && existingMap.length > 0) {

    conceptMap = existingMap;
  } else {
    if (isExpired) {

    } else {

    }
    
    conceptMap = await generateConceptMap(noteContext.content, noteContext.wordCount);
    
    if (conceptMap) {
      await saveConceptMapToChunk(chunkId, conceptMap, noteContext.metadata);
    }
  }

  const conceptCount = conceptMap ? conceptMap.length : 0;
  if (conceptCount === 0) {
     return { success: false, error: 'İçerik haritası oluşturulamadı, soru üretilemiyor.' };
  }

  // 3. Calculate Quota and Check Status
  const quota = calculateQuota(noteContext.wordCount, conceptCount);
  
  // Count existing questions for this chunk
  const { count: currentCount, error: countError } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('chunk_id', chunkId);

  if (countError) {
      console.error('[QuizGen] Error counting questions:', countError);
      return { success: false, error: 'Veritabanı hatası.' };
  }

  const totalGenerated = currentCount || 0;

  if (totalGenerated >= quota.total) {
      return { success: false, error: 'Bu bölüm için belirlenen soru kotası dolmuştur.' };
  }

  // 4. Determine Node Strategy based on Progress
  const strategy = determineNodeStrategy(totalGenerated, quota.total, noteContext.wordCount);


  // 5. Select Topic (Round-robin)
  // Use current count as index
  const mapIndex = totalGenerated % conceptCount;
  const selectedTopic = conceptMap![mapIndex];


  // 6. Build Prompt
  const guidelines = await getSubjectGuidelines(noteContext.courseName);
  const prompt = buildPrompt(noteContext, guidelines, strategy.instruction, selectedTopic);


  // 7. Call API with validation loop
  const MAX_VALIDATION_ATTEMPTS = 3;
  let improvementHint: string | null = null;

  for (let validationAttempt = 0; validationAttempt < MAX_VALIDATION_ATTEMPTS; validationAttempt++) {
    const isFailSafe = validationAttempt === MAX_VALIDATION_ATTEMPTS - 1;

    
    // Build prompt (with improvement hint if this is a retry)
    let currentPrompt = prompt;
    if (improvementHint) {
      currentPrompt += `\n\n## İYİLEŞTİRME TALİMATI (ÖNCEKİ DENEMEDE BAŞARISIZ):\n${improvementHint}`;

    }

    // Try to generate with retries
    let question: QuizQuestion | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {

      const responseText = await callOpenRouterAPI(currentPrompt, MODEL_MIMO, SYSTEM_PROMPT);

      if (!responseText) {
        if (attempt === MAX_RETRIES) {
          console.error('[QuizGen] API failed after retries');
          return { success: false, error: 'API bağlantısı başarısız oldu. Lütfen tekrar deneyin.' };
        }

        continue;
      }

      question = parseQuizResponse(responseText);
      if (question) break;

      if (attempt === MAX_RETRIES) {
        console.error('[QuizGen] Failed to parse response after retries');
        return { success: false, error: 'Geçersiz yanıt formatı. Lütfen tekrar deneyin.' };
      }
    }

    if (!question) {
      return { success: false, error: 'Soru üretilemedi.' };
    }



    // 8. VALIDATE THE QUESTION

    const validationResult = await validateQuestion(question, noteContext.content, { isFailSafe });

    if (isValidationPassed(validationResult)) {

      
      // Save to database with validation metadata
      const savedId = await saveQuestionToDatabase(question, noteContext, chunkId, {
        usageType: 'antrenman',
        sequenceIndex: totalGenerated + 1,
        bloomLevel: strategy.bloomLevel,
        isGlobal: isGlobal ?? true,
        createdBy: createdBy,
        qualityScore: validationResult.total_score,
        validatorFeedback: JSON.stringify(validationResult),
        validationStatus: 'APPROVED'
      });

      if (savedId) {
        question.id = savedId;
      }

      // Inject explicit image from Topic if needed
      if (selectedTopic?.gorsel && !question.img) {
        question.img = selectedTopic.gorsel;
      }

      // Add dynamic imgPath
      if (question.img && noteContext.courseSlug) {
        question.imgPath = `/notes/${noteContext.courseSlug}/media/`;
      }
      
      return { success: true, question };
    } else {
      // Validation failed


      
      if (validationAttempt < MAX_VALIDATION_ATTEMPTS - 1) {
        // Prepare for retry with improvement hint
        improvementHint = validationResult.improvement_suggestion || 
          `Önceki soru ${validationResult.total_score} puan aldı. Şu hataları düzelt: ${validationResult.critical_faults.join(', ')}`;

      } else {
        // Max attempts reached, log failure
        console.error(`[QuizGen] ⚠️ Max validation attempts reached. Final score: ${validationResult.total_score}/100`);
        console.error('[QuizGen] This chunk could not produce a quality question.');
        
        return { 
          success: false, 
          error: `Şu an uygun kalitede soru üretilemiyor. Son skor: ${validationResult.total_score}/100. Lütfen daha sonra tekrar deneyin.`
        };
      }
    }
  }

  return { success: false, error: 'Beklenmeyen hata oluştu.' };
}

/**
 * Generate a quiz question from raw content (without chunk ID)
 */
export async function generateQuizQuestionFromContent(
  courseName: string,
  sectionTitle: string,
  content: string,
  courseId?: string
): Promise<QuizGenerationResult> {
  // Fetch course slug for dynamic image paths
  const { data: courseData } = await supabase
    .from('courses')
    .select('course_slug')
    .eq('name', courseName)
    .maybeSingle();

  const noteContext: NoteContext = {
    courseName,
    courseSlug: courseData?.course_slug,
    h1Title: null,
    h2Title: null,
    h3Title: sectionTitle,
    content,
    wordCount: content.trim().split(/\s+/).length,
  };

  // Get subject guidelines
  const guidelines = await getSubjectGuidelines(courseName);

  // Generate Concept Map (optional for ad-hoc but good to have)
  const conceptMap = await generateConceptMap(content, noteContext.wordCount);
  
  // For ad-hoc content, we just pick the first topic or random? 
  // Let's pick random to add variety if user clicks multiple times
  const randomTopic = conceptMap && conceptMap.length > 0 
    ? conceptMap[Math.floor(Math.random() * conceptMap.length)] 
    : null;

  // Build prompt
  const prompt = buildPrompt(noteContext, guidelines, undefined, randomTopic);

  // Call API with retry logic
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const responseText = await callOpenRouterAPI(prompt, MODEL_MIMO, SYSTEM_PROMPT);

    if (!responseText) {
      if (attempt === MAX_RETRIES) {
        return { success: false, error: 'API bağlantısı başarısız oldu. Lütfen tekrar deneyin.' };
      }
      continue;
    }

    const question = parseQuizResponse(responseText);

    if (question) {
      // Add dynamic imgPath
      if (question.img && noteContext.courseSlug) {
        question.imgPath = `/notes/${noteContext.courseSlug}/media/`;
      }

      // Save to database if courseId provided
      if (courseId) {
          const savedId = await saveQuestionToDatabase(question, { ...noteContext, courseId }, null, {
             usageType: 'antrenman',
             sequenceIndex: 0,
             bloomLevel: 'application'
          });
          if (savedId) question.id = savedId;
      }

      return { success: true, question };
    }

    if (attempt === MAX_RETRIES) {
      return {
        success: false,
        error: 'Geçersiz yanıt formatı. Lütfen tekrar deneyin.',
      };
    }
  }

  return { success: false, error: 'Beklenmeyen hata oluştu.' };
}

/**
 * Get quota status for UI
 */
export async function getChunkQuotaStatus(chunkId: string): Promise<QuotaStatus | null> {
  const noteContext = await getNoteContext(chunkId);
  if (!noteContext) return null;

  // Retrieve concept map to know real count
  const existingMap = (noteContext.metadata?.concept_map as ConceptMap) || [];
  const conceptCount = existingMap.length;

  const quota = calculateQuota(noteContext.wordCount, conceptCount);
  
  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('chunk_id', chunkId);

  const used = count || 0;
  const isFull = used >= quota.total;

  return {
    wordCount: noteContext.wordCount,
    conceptCount,
    quota,
    used,
    isFull
  };
}
