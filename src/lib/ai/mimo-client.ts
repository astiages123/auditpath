/**
 * MiMo API Client (via Supabase Proxy)
 * 
 * Supabase Edge Function üzerinden MiMo API çağrısı yapar.
 * - CORS sorunu yok
 * - API anahtarı güvende
 */

import { supabase } from '@/lib/supabase';

// Types
export interface ConceptMapItem {
  baslik: string;
  odak: string;
  seviye: 'Bilgi' | 'Uygulama' | 'Analiz';
  gorsel?: string | null;
}

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

interface MiMoResponse {
  id: string;
  choices: {
    message: {
      content: string;
    };
  }[];
}

type LogCallback = (message: string, details?: Record<string, unknown>) => void;

/**
 * Call MiMo API via Supabase Proxy
 */
async function callMiMo(systemPrompt: string, userPrompt: string, temperature: number = 0.7, onLog?: LogCallback): Promise<string> {
  onLog?.('MiMo API çağrısı başlatılıyor (Supabase Proxy)...', { promptLength: userPrompt.length });

  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: {
      provider: 'mimo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      max_tokens: 4096
    }
  });

  if (error) {
    onLog?.('MiMo API hatası', { error: error.message });
    throw new Error(`MiMo API Hatası: ${error.message}`);
  }

  const response = data as MiMoResponse;
  const content = response.choices?.[0]?.message?.content || '';
  
  onLog?.('MiMo API yanıtı alındı', { responseLength: content.length });
  
  return content;
}

/**
 * Parse JSON from LLM response (simple extraction)
 */
function parseJsonResponse(text: string, type: 'object' | 'array'): unknown | null {
  try {
    const pattern = type === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
    const match = text.match(pattern);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * Generate concept map from content
 */
export async function generateConceptMap(
  content: string, 
  wordCount: number,
  onLog?: LogCallback
): Promise<ConceptMapItem[]> {
  // Calculate target concept count based on word count
  let targetCount = 3;
  if (wordCount > 1200) targetCount = 14;
  else if (wordCount > 500) targetCount = 9;
  else if (wordCount > 150) targetCount = 5;
  
  onLog?.('Kavram haritası oluşturuluyor', { wordCount, targetCount });

  const systemPrompt = `Sen bir Eğitim İçerik Analistisin. Metni analiz ederek soru üretilecek ${targetCount} adet ana durak belirle. 
Metnin baş, orta ve son kısımlarından dengeli bir dağılım yap. 
Metin içerisindeki görsel referanslarını (örn: image7.webp) tespit et ve ilgili konuyla eşleştir.

Sadece şu formatta bir JSON dizisi döndür: 
[
  { "baslik": "Kısa Konu Başlığı", "odak": "Neye odaklanılacak?", "seviye": "Bilgi" | "Uygulama" | "Analiz", "gorsel": "imageX.webp" | null }
]
Açıklama ekleme.`;

  const userPrompt = `Analiz edilecek metin:\n\n${content}`;

  const response = await callMiMo(systemPrompt, userPrompt, 0.5, onLog);
  
  const concepts = parseJsonResponse(response, 'array') as ConceptMapItem[] | null;
  
  if (concepts && Array.isArray(concepts)) {
    onLog?.('Kavram haritası oluşturuldu', { 
      conceptCount: concepts.length,
      concepts: concepts.map(c => c.baslik)
    });
    return concepts;
  }
  
  onLog?.('Kavram haritası çıkarma başarısız', {});
  return [];
}

/**
 * Determine bloom level strategy based on concept and index
 */
function determineNodeStrategy(index: number, wordCount: number, concept?: ConceptMapItem): { bloomLevel: 'knowledge' | 'application' | 'analysis'; instruction: string } {
  // 1. If mapping exists and has a level, respect it
  if (concept?.seviye) {
    if (concept.seviye === 'Analiz') return { bloomLevel: 'analysis', instruction: 'Sonuç/Analiz odaklı zor soru.' };
    if (concept.seviye === 'Uygulama') return { bloomLevel: 'application', instruction: 'İlişki/Uygulama odaklı soru.' };
    if (concept.seviye === 'Bilgi') return { bloomLevel: 'knowledge', instruction: 'Tanım/Bilgi odaklı soru.' };
  }

  // 2. Small Chunk Strategy (<= 150 words)
  if (wordCount <= 150) {
    const isRel = index % 2 !== 0; 
    if (isRel) {
      return {
        bloomLevel: 'application',
        instruction: "Şu an 'İlişki' aşamasındasın. Seçilen kavramın diğer kavramlarla ilişkisini, farklarını veya benzerliklerini sorgulayan bir soru üret."
      };
    } else {
      return {
        bloomLevel: 'knowledge',
        instruction: "Şu an 'Tanım' aşamasındasın. Seçilen kavramın temel tanımını, ne olduğunu ve temel özelliklerini sorgulayan bir soru üret."
      };
    }
  }

  // 3. Fallback to fixed distribution (50/25/25) for larger chunks
  const remainder = index % 4;
  if (remainder < 2) return { bloomLevel: 'knowledge', instruction: 'Tanım/Bilgi odaklı soru.' };
  if (remainder === 2) return { bloomLevel: 'application', instruction: 'İlişki/Uygulama odaklı soru.' };
  return { bloomLevel: 'analysis', instruction: 'Sonuç/Analiz odaklı zor soru.' };
}

/**
 * Build question generation prompt
 */
function buildPrompt(
  content: string,
  courseName: string,
  sectionTitle: string,
  concept: ConceptMapItem | null,
  strategy: { bloomLevel: string; instruction: string },
  guidelines: { instruction?: string; few_shot_example?: unknown } | null
): string {
  const parts = [
    `Sen KPSS uzmanı bir yapay zekasın.`,
    `Ders: ${courseName}`,
    `Ünite/Konu: ${sectionTitle}`,
    `İçerik:\n${content.slice(0, 6000)}`,
    `---`,
    `GÖREV: Yukarıdaki metne dayalı 1 adet çoktan seçmeli soru üret.`,
  ];

  if (concept) {
    parts.push(`Soru Odak Noktası (BU KISMA SADIK KAL):
- Konu: ${concept.baslik}
- Odak: ${concept.odak}
- Seviye: ${concept.seviye}`);
    
    if (concept.gorsel) {
      parts.push(`GÖRSEL REFERANSI: Bu soruyu '${concept.gorsel}' görseline dayandır.`);
    }
  }

  parts.push(`PEDAGOJİK HEDEF: ${strategy.instruction}`);
  
  parts.push(`## KALİTE STANDARTLARI (Denetçi tarafından puanlanacaktır):
- **Metne Sadakat ve Yaratıcılık:** Soru temelini metindeki kavramlardan almalıdır. Ancak 'Uygulama' veya 'Analiz' seviyesindeki sorularda, konuyu pekiştirmek için gerçekçi senaryolar, farklı isimler veya benzer sayısal değerler (metindeki temel mantığa ve bilimsel gerçeklere sadık kalarak) kullanılabilir.
- **Mantıksal Tutarlılık:** Eklenen her yeni veri veya örnek, metindeki ana kurallar ve kavramsal tanımlarla (örn: doyum noktası, azalan marjinal fayda vb.) %100 uyumlu olmalıdır. Uydurulan örnekler konuyu çarpıtmamalıdır.
- **Pedagojik Derinlik:** Sadece ezber değil, kavramsal kavrayışı veya analizi ölçmelidir.
- **Çeldirici Kalitesi:** Yanlış seçenekler mantıklı ve metinle uyumlu olmalı, "Hepsi" veya "Hiçbiri" gibi kaçamak şıklar kullanılmamalıdır.
- **Netlik:** Soru kökü ve seçenekler gereksiz karmaşıklıktan uzak, anlaşılır olmalıdır.
- **Açıklama Kalitesi:** Doğru cevabın neden doğru olduğu ve çeldiricilerin neden yanlış olduğu akademik bir dille açıklanmalıdır. Açıklama, kullanılan senaryo ile metin arasındaki bağı kurmalıdır.`);

  parts.push(`FORMAT: SADECE JSON. Her zaman 5 şık olmalı. Hatalı ifadeler (değildir, yoktur vb.) kalın (**...**) yazılmalı.`);
  parts.push(`{ "q": "...", "o": ["A", "B", "C", "D", "E"], "a": 0, "exp": "..." }`);

  if (guidelines?.instruction) {
    parts.push(`Özel Talimat: ${guidelines.instruction}`);
  }

  if (guidelines?.few_shot_example) {
    parts.push(`## ÖRNEK SORU FORMATI:\n\`\`\`json\n${JSON.stringify(guidelines.few_shot_example, null, 2)}\n\`\`\``);
  }
  
  return parts.join('\n\n');
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
    'Sen KPSS uzmanı bir yapay zekasın. SADECE JSON formatında follow-up soru üret.',
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
