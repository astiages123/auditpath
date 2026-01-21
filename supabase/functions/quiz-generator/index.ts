import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Configuration ---
const MODEL_MIMO = 'xiaomi/mimo-v2-flash:free';
const MODEL_VALIDATOR = 'openai/gpt-oss-120b:free'; // Reverted to 120b as requested
const DELAY_MS = 3000; // Increased to be safer
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 2000;
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json();
    
    // Webhook payload: { type: 'INSERT' | 'UPDATE', table: 'note_chunks', record: { ... }, old_record: { ... } }
    // Manual trigger payload: { chunkId: '...' }
    
    let chunkId = payload.chunkId;
    
    // Support Database Webhook payload
    if (!chunkId && payload.record && payload.table === 'note_chunks') {
        chunkId = payload.record.id;
        // Verify trigger conditions again just in case
        if (!payload.record.is_ready || payload.record.status !== 'PENDING') {
            return new Response(JSON.stringify({ message: 'Condition not met (not PENDING/ready)', skipped: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
    }

    const mode = payload.mode || 'initial'; // 'initial' | 'nightly' | 'followup'
    const incorrectIds = payload.incorrectIds || [];
    const userId = payload.userId;

    if (!chunkId) {
        throw new Error('No chunkId provided');
    }

    console.log(`[QuizGen] Processing chunk: ${chunkId}, Mode: ${mode}, Incorrects: ${incorrectIds.length}`);

    // 1. Lock Row & Set Status to PROCESSING
    const { error: updateError } = await supabase
        .from('note_chunks')
        .update({ 
            status: 'PROCESSING', 
            attempts: payload.record?.attempts ? payload.record.attempts + 1 : 1,
            error_message: null
        })
        .eq('id', chunkId);
    
    if (updateError) throw new Error(`Failed to lock chunk: ${updateError.message}`);

    // 2. Fetch Data (Chunk + Course + Guidelines)
    const { data: chunk, error: chunkError } = await supabase
        .from('note_chunks')
        .select('*, courses(*)')
        .eq('id', chunkId)
        .single();

    if (chunkError || !chunk) throw new Error('Chunk not found');

    const courseName = chunk.course_name;
    const guidelines = await getSubjectGuidelines(courseName);
    const wordCount = chunk.word_count || 500;

    // 3. Mapping (Concept Map) Logic
    let conceptMap = chunk.metadata?.concept_map;
    if (!conceptMap || !Array.isArray(conceptMap)) {
        console.log(`[QuizGen] Generating new concept map...`);
        conceptMap = await generateConceptMap(chunk.content, wordCount);
        if (conceptMap) {
            await saveConceptMap(chunkId, conceptMap, chunk.metadata);
        }
    }
    const mapCount = conceptMap?.length || 1;

    // 4. Calculate Quota (Concept Density Logic)
    const antrenmanTarget = calculateTargetQuestionCount(wordCount, mapCount);
    const arsivTarget = Math.ceil(antrenmanTarget * 0.25);
    const denemeTarget = Math.ceil(antrenmanTarget * 0.25);
    
    console.log(`[QuizGen] Targets -> Antrenman: ${antrenmanTarget}, Arşiv: ${arsivTarget}, Deneme: ${denemeTarget} (Mode: ${mode})`);

    // 5. Dynamic Quota Calculation & Task List Building (Prevent Waste)
    let taskList: any[] = [];

    if (mode === 'followup' && incorrectIds.length > 0) {
        taskList = incorrectIds.map((pid: string) => ({ type: 'antrenman', parentId: pid }));
    } else {
        // Fetch existing counts per type
        const { data: existingSummary } = await supabase
            .from('questions')
            .select('usage_type')
            .eq('chunk_id', chunkId)
            .eq('validation_status', 'APPROVED');
        
        const counts = {
            antrenman: existingSummary?.filter(q => q.usage_type === 'antrenman').length || 0,
            arsiv: existingSummary?.filter(q => q.usage_type === 'arsiv').length || 0,
            deneme: existingSummary?.filter(q => q.usage_type === 'deneme').length || 0
        };

        if (mode === 'nightly') {
            // Nightly refills Arşiv and Deneme
            const neededArsiv = Math.max(0, arsivTarget - counts.arsiv);
            const neededDeneme = Math.max(0, denemeTarget - counts.deneme);
            
            for (let i = 0; i < neededArsiv; i++) taskList.push({ type: 'arsiv', index: i + counts.arsiv });
            for (let i = 0; i < neededDeneme; i++) taskList.push({ type: 'deneme', index: i + counts.deneme });
        } else {
            // Initial/Default refills Antrenman
            const neededAntrenman = Math.max(0, antrenmanTarget - counts.antrenman);
            for (let i = 0; i < neededAntrenman; i++) taskList.push({ type: 'antrenman', index: i + counts.antrenman });
        }
    }

    const totalTasks = taskList.length;
    console.log(`[QuizGen] Tasks to generate: ${totalTasks}`);

    if (totalTasks === 0) {
        console.log(`[QuizGen] All quotas already filled. Skipping generation.`);
        await supabase.from('note_chunks').update({ status: 'COMPLETED' }).eq('id', chunkId);
        return new Response(JSON.stringify({ success: true, generated: 0, message: 'All quotas filled' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // 6. Generation Loop with 3-Stage Scoring Algorithm
    let successfulCount = 0;
    const generatedIds: string[] = [];
    let taskIndex = 0;

    // Continue until tasks exhausted
    while (taskIndex < taskList.length) {
        // Dynamic batch size: reduced to 1 for maximum stability with 120B model
        const batchSize = Math.min(1, taskList.length - taskIndex);
        const batch = taskList.slice(taskIndex, taskIndex + batchSize);
        
        console.log(`[QuizGen] Processing Batch: Tasks ${taskIndex + 1}-${taskIndex + batch.length} of ${totalTasks}`);

        const batchPromises = batch.map(async (task, batchIdx) => {
            const index = taskIndex + batchIdx;
            try {
                const concept = conceptMap ? conceptMap[index % mapCount] : null;
                const strategy = determineNodeStrategy(index, wordCount, concept);

                // --- 3-Stage Scoring Algorithm ---
                interface AttemptResult {
                    questionData: any;
                    validationResult: any;
                    score: number;
                }
                const attempts: AttemptResult[] = [];
                const MAX_STAGES = 3;
                const THRESHOLD_INSTANT = 85;
                const THRESHOLD_GOOD = 80;
                const THRESHOLD_MINIMUM = 77;

                for (let stage = 1; stage <= MAX_STAGES; stage++) {
                    const isRevision = stage > 1;
                    const lastAttempt = attempts[attempts.length - 1];
                    
                    // Build prompt (with feedback for revisions)
                    const currentPrompt = !isRevision
                        ? buildPrompt(chunk, guidelines, strategy, concept)
                        : buildRevisionPrompt(chunk, guidelines, strategy, concept, lastAttempt?.questionData, lastAttempt?.validationResult);

                    // Temperature: 0.7 -> 0.8 -> 0.85 (progressively more creative)
                    const temp = 0.7 + (stage - 1) * 0.075;
                    const responseText = await callOpenRouter(currentPrompt, MODEL_MIMO, 'You are a quiz generator. Output JSON only.', temp);

                    if (!responseText) continue;
                    const questionData = parseQuizResponse(responseText);
                    if (!questionData) continue;

                    const validationResult = await validateQuestion(questionData, chunk.content);
                    if (!validationResult) {
                        console.warn(`[QuizGen] Q#${index + 1} Stage ${stage}: Validator failed. Retrying...`);
                        stage--; // Decrement so that stage stays same after next increment
                        await new Promise(r => setTimeout(r, 4000));
                        continue;
                    }
                    const score = validationResult.total_score || 0;

                    attempts.push({ questionData, validationResult, score });
                    console.log(`[QuizGen] Q#${index + 1} Stage ${stage}: Score = ${score}`);

                    // --- Stage Decision Logic ---
                    const maxScore = Math.max(...attempts.map(a => a.score));

                    // Stage 1: Instant approval if >= 85
                    if (stage === 1 && score >= THRESHOLD_INSTANT) {
                        console.log(`[QuizGen] Q#${index + 1} INSTANT APPROVE (S1=${score} >= 85)`);
                        break;
                    }

                    // Stage 2: If max >= 80, done. If max >= 77, go to Stage 3. Else discard.
                    if (stage === 2) {
                        if (maxScore >= THRESHOLD_GOOD) {
                            console.log(`[QuizGen] Q#${index + 1} APPROVED at Stage 2 (max=${maxScore} >= 80)`);
                            break;
                        } else if (maxScore < THRESHOLD_MINIMUM) {
                            console.log(`[QuizGen] Q#${index + 1} CRITICAL REJECT (max=${maxScore} < 77). Discarding.`);
                            return null; // Discard immediately
                        }
                        // Else: 77 <= maxScore < 80, continue to Stage 3
                    }

                    // Stage 3: Final decision
                    if (stage === 3) {
                        if (maxScore >= THRESHOLD_MINIMUM) {
                            console.log(`[QuizGen] Q#${index + 1} RESCUE APPROVED at Stage 3 (max=${maxScore} >= 77)`);
                        } else {
                            console.log(`[QuizGen] Q#${index + 1} FINAL REJECT (max=${maxScore} < 77). Discarding.`);
                            return null;
                        }
                    }
                }

                if (attempts.length === 0) {
                    console.warn(`[QuizGen] Q#${index + 1} No valid attempts generated.`);
                    return null;
                }

                // Select best attempt
                const bestAttempt = attempts.reduce((best, curr) => curr.score > best.score ? curr : best);
                const finalScore = bestAttempt.score;

                // Final gate: Only save if >= 77
                if (finalScore < THRESHOLD_MINIMUM) {
                    console.log(`[QuizGen] Q#${index + 1} NOT SAVED (finalScore=${finalScore} < 77)`);
                    return null;
                }

                // Save ONLY approved questions
                const { data: qData, error: qError } = await supabase.from('questions').insert({
                    course_id: chunk.course_id,
                    chunk_id: chunkId,
                    section_title: chunk.section_title,
                    question_data: bestAttempt.questionData,
                    usage_type: task.type,
                    sequence_index: task.index ?? 0,
                    bloom_level: strategy.bloomLevel,
                    is_global: true,
                    quality_score: finalScore,
                    validator_feedback: JSON.stringify(bestAttempt.validationResult),
                    validation_status: 'APPROVED',
                    parent_question_id: task.parentId || null
                }).select('id').single();

                if (qError) {
                    console.error(`[QuizGen] Save error Q#${index + 1}: ${qError.message}`);
                    return null;
                }

                if (mode === 'followup' && userId && qData.id) {
                    await supabase.from('user_question_status').upsert({
                        user_id: userId,
                        question_id: qData.id,
                        status: 'pending_followup'
                    }, { onConflict: 'user_id,question_id' });
                }

                console.log(`[QuizGen] Q#${index + 1} SAVED with score ${finalScore}`);
                return qData.id;

            } catch (err) {
                if (err.message === 'DAILY_LIMIT_EXCEEDED') throw err; 
                console.error(`[QuizGen] Error in Q#${index + 1}:`, err);
                return null;
            }
        });

        const batchResults = await Promise.all(batchPromises);

        batchResults.forEach(id => {
            if (id) {
                generatedIds.push(id);
                successfulCount++;
            }
        });

        taskIndex += batch.length;

        // Delay between batches
        if (successfulCount < totalTasks && taskIndex < taskList.length) {
            await new Promise(r => setTimeout(r, DELAY_MS));
        }
    }

    // 5. Final Status Update
    const finalStatus = successfulCount > 0 ? 'COMPLETED' : 'FAILED';
    const finalMsg = successfulCount > 0 ? null : 'No questions generated';

    await supabase.from('note_chunks').update({
        status: finalStatus,
        error_message: finalMsg
    }).eq('id', chunkId);

    return new Response(JSON.stringify({ 
        success: true, 
        generated: successfulCount, 
        ids: generatedIds 
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[QuizGen] Fatal Error:', error);
    
    // If it's a daily limit, move back to PENDING so it can be picked up tomorrow
    if (error.message === 'DAILY_LIMIT_EXCEEDED') {
        await supabase.from('note_chunks').update({ 
            status: 'PENDING', 
            error_message: 'OpenRouter Günlük Limit Doldu. Yarın otomatik devam edecek.' 
        }).eq('id', chunkId);
    } else {
        await supabase.from('note_chunks').update({ 
            status: 'FAILED', 
            error_message: error.message 
        }).eq('id', chunkId);
    }
    
    return new Response(JSON.stringify({ error: error.message }), {
        status: error.message.includes('DAILY_LIMIT_EXCEEDED') ? 429 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})

// --- Constants & Prompts ---

const VALIDATOR_SYSTEM_PROMPT = `Sen bir Eğitim Denetçisisin. Verilen kaynak metin ile üretilen soruyu karşılaştırıp puanla.
Puanlama Kriterleri (0-20):
1. Groundedness (Metne Sadakat)
2. Pedagojik Derinlik
3. Çeldirici Kalitesi
4. Netlik
5. Açıklama Kalitesi

Çıktı Formatı (SADECE JSON):
{
  "total_score": integer (0-100),
  "criteria_breakdown": { "groundedness": 0-20, "pedagogy": 0-20, "distractors": 0-20, "clarity": 0-20, "explanation": 0-20 },
  "critical_faults": [],
  "improvement_suggestion": "",
  "decision": "APPROVED" | "REJECTED"
}`;

// --- Helpers ---

async function getSubjectGuidelines(courseName: string) {
    // 1. Exact match
    const { data: initialData } = await supabase
        .from('subject_guidelines')
        .select('*')
        .eq('subject_name', courseName)
        .maybeSingle();

    if (initialData) return initialData;

    // 2. Dash/Hyphen check (e.g. "Mikro İktisat - X Hoca")
    if (courseName.includes('-') || courseName.includes('–')) {
        const baseName = courseName.split(/[–-]/)[0].trim();
        const { data: baseData } = await supabase
            .from('subject_guidelines')
            .select('*')
            .eq('subject_name', baseName)
            .maybeSingle();
        if (baseData) return baseData;
    }

    // 3. Containment Search
    // Fetch all guidelines (usually small table) and find match
    const { data: allSubjects } = await supabase
        .from('subject_guidelines')
        .select('*');

    if (allSubjects) {
        // Sort by length desc to match longest possible name
        const sorted = allSubjects.sort((a, b) => b.subject_name.length - a.subject_name.length);
        const match = sorted.find(s => courseName.toLowerCase().includes(s.subject_name.toLowerCase()));
        if (match) return match;
    }
    
    return null;
}

function calculateTargetQuestionCount(wordCount: number, conceptCount: number) {
    const MIN_BASE_QUOTA = 8;
    const MAX_BASE_QUOTA = 30;
    const GROWTH_RATE_PER_100_WORDS = 1.1;

    // 1. Base Quota
    const linearGrowth = (Math.max(0, wordCount) / 100) * GROWTH_RATE_PER_100_WORDS;
    const rawBase = MIN_BASE_QUOTA + linearGrowth;
    const baseCount = Math.min(MAX_BASE_QUOTA, rawBase);

    // 2. Concept Density (CD) Multiplier
    const safeWordCount = wordCount > 0 ? wordCount : 1;
    const cd = conceptCount / safeWordCount;
    
    let multiplier = 1.0;
    if (cd < 0.02) multiplier = 0.8; // Sparse
    else if (cd > 0.05) multiplier = 1.3; // Dense
    
    return Math.ceil(baseCount * multiplier);
}

function determineNodeStrategy(index: number, wordCount: number, concept?: any) {
// 1. If mapping exists and has a level, respect it
    if (concept?.seviye) {
        if (concept.seviye === 'Analiz') return { bloomLevel: 'analysis', instruction: 'Sonuç/Analiz odaklı zor soru.' };
        if (concept.seviye === 'Uygulama') return { bloomLevel: 'application', instruction: 'İlişki/Uygulama odaklı soru.' };
        if (concept.seviye === 'Bilgi') return { bloomLevel: 'knowledge', instruction: 'Tanım/Bilgi odaklı soru.' };
    }

    // 2. Small Chunk Strategy (<= 150 words)
    // Avoid Analysis/Result questions for sparse content to prevent hallucination.
    if (wordCount <= 150) {
        const isRel = index % 2 !== 0; 
        if (isRel) {
            return {
                bloomLevel: 'application',
                instruction: "Şu an 'İlişki' aşamasındasın. Seçilen kavramın diğer kavramlarla ilişkisini, farklarını veya benzerliklerini sorgulayan bir soru üret. (Analiz/Sonuç düzeyine girme)."
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

async function generateConceptMap(content: string, wordCount: number) {
    let targetCount = 3;
    if (wordCount > 1200) targetCount = 14;
    else if (wordCount > 500) targetCount = 9;
    else if (wordCount > 150) targetCount = 5;

    const systemPrompt = `Sen bir Eğitim İçerik Analistisin. Metni analiz ederek soru üretilecek ${targetCount} adet ana durak belirle. 
    Metnin baş, orta ve son kısımlarından dengeli bir dağılım yap. 
    Metin içerisindeki görsel referanslarını (örn: image7.webp) tespit et ve ilgili konuyla eşleştir.

    Sadece şu formatta bir JSON dizisi döndür: 
    [
      { "baslik": "Kısa Konu Başlığı", "odak": "Neye odaklanılacak?", "seviye": "Bilgi" | "Uygulama" | "Analiz", "gorsel": "imageX.webp" | null }
    ]
    Açıklama ekleme.`;

    const response = await callOpenRouter(`Analiz edilecek metin:\n\n${content}`, MODEL_MIMO, systemPrompt, 0.5);
    try {
        const jsonMatch = response?.match(/\[[\s\S]*\]/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
        return null;
    }
}

async function saveConceptMap(chunkId: string, mapping: any, existingMetadata: any) {
    await supabase.from('note_chunks').update({
        metadata: { ...existingMetadata, concept_map: mapping, concept_map_created_at: new Date().toISOString() }
    }).eq('id', chunkId);
}

function buildPrompt(chunk: any, guidelines: any, strategy: any, concept: any) {
    const parts = [
        `Sen KPSS uzmanı bir yapay zekasın.`,
        `Ders: ${chunk.course_name}`,
        `Ünite/Konu: ${chunk.section_title}`,
        `İçerik:\n${chunk.content}`,
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
- **Metne Sadakat (Groundedness):** Soru ve seçeneklerdeki tüm bilgiler doğrudan kaynak metne dayanmalıdır. Metinde olmayan hiçbir bilgi veya uydurma veri kullanılmamalıdır.
- **Pedagojik Derinlik:** Sadece ezber değil, kavramsal kavrayışı veya analizi ölçmelidir.
- **Çeldirici Kalitesi:** Yanlış seçenekler mantıklı ve metinle uyumlu olmalı, "Hepsi" veya "Hiçbiri" gibi kaçamak şıklar kullanılmamalıdır.
- **Netlik:** Soru kökü ve seçenekler gereksiz karmaşıklıktan uzak, anlaşılır olmalıdır.
- **Açıklama Kalitesi:** Doğru cevabın neden doğru olduğu ve çeldiricilerin neden yanlış olduğu akademik bir dille açıklanmalıdır.`);

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

function buildRevisionPrompt(chunk: any, guidelines: any, strategy: any, concept: any, previousQuestion: any, report: any) {
    const base = buildPrompt(chunk, guidelines, strategy, concept);
    const revisionOverlay = [
        `\n\n### ÖNCEKİ DENEME HATALI BULUNDU (DÜZELTME GEREKİYOR)`,
        `Üretilen önceki soru denetçi tarafından reddedildi veya düşük puan aldı.`,
        `Kritik Hatalar: ${report?.critical_faults?.join(', ') || 'Belirtilmedi'}`,
        `İyileştirme Önerisi: ${report?.improvement_suggestion || 'Belirtilmedi'}`,
        `Önceki Soru (Hatalı): ${JSON.stringify(previousQuestion)}`,
        `\nLÜTFEN YUKARIDAKİ ELEŞTİRİLERİ DİKKATE ALARAK, METNE DAHA SADIK VE HATASIZ BİR SORU ÜRET.`
    ];
    return base + revisionOverlay.join('\n');
}

function parseQuizResponse(text: string) {
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        const json = JSON.parse(jsonMatch[0]);
        if (!json.q || !Array.isArray(json.o) || typeof json.a !== 'number') return null;
        return json;
    } catch {
        return null;
    }
}

async function validateQuestion(question: any, sourceContent: string) {
    const prompt = `## KAYNAK METİN:\n${sourceContent}\n\n## SORU:\n${JSON.stringify(question)}\n\nLütfen yukarıdaki soruyu kalite standartlarına göre (Groundedness, Pedagoji, Çeldirici, Netlik) puanla ve SADECE JSON döndür.`;
    
    // Use a slightly lower temperature for validator for consistency
    const response = await callOpenRouter(prompt, MODEL_VALIDATOR, VALIDATOR_SYSTEM_PROMPT, 0.1);
    
    if (!response) return null;

    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("[QuizGen] Validator response has no JSON block:", response);
            return null;
        }
        const data = JSON.parse(jsonMatch[0]);
        if (typeof data.total_score !== 'number') {
            console.error("[QuizGen] Validator JSON is missing total_score:", data);
            return null;
        }
        return data;
    } catch (e) {
        console.error("[QuizGen] Validator JSON parse Error:", e, "Response:", response);
        return null;
    }
}

async function callOpenRouter(prompt: string, model: string, systemPrompt: string = 'You are a quiz generator. Output JSON only.', temperature: number = 0.7) {
    if (!OPENROUTER_API_KEY) throw new Error('Missing OPENROUTER_API_KEY');
    
    let lastError = null;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            if (attempt > 0) {
                const backoff = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
                console.log(`[QuizGen] Retry attempt ${attempt} after ${backoff}ms...`);
                await new Promise(r => setTimeout(r, backoff));
            }

            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://auditpath.app',
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ],
                    temperature: temperature
                })
            });

            if (!res.ok) {
                const txt = await res.text();
                console.error(`OpenRouter Error (${res.status}) [Attempt ${attempt}]: ${txt}`);
                
                // If rate limited (429), parse reset time if available
                if (res.status === 429) {
                    if (txt.includes('free-models-per-day')) {
                        console.error(`[QuizGen] FATAL: Daily limit reached. Stopping everything.`);
                        throw new Error('DAILY_LIMIT_EXCEEDED');
                    }
                    continue; // Retry only for per-minute limits
                }
                
                // For transient 5xx errors, also retry
                if (res.status >= 500) {
                    continue;
                }

                return null; // Fatal non-retryable error
            }

            const data = await res.json();
            return data.choices?.[0]?.message?.content;

        } catch (err) {
            // If it is the daily limit error we just threw, stop retrying immediately
            if (err instanceof Error && err.message === 'DAILY_LIMIT_EXCEEDED') {
                 throw err;
            }
            console.error(`[QuizGen] Fetch error [Attempt ${attempt}]:`, err);
            lastError = err;
        }
    }

    return null;
}
