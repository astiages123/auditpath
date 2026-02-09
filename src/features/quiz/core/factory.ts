/**
 * Quiz Factory (AI Production Layer)
 *
 * Unified pipeline for generating Questions, Follow-ups, and Archive Refresh items.
 * Consolidates GeneratorService, GenerationPipeline, PromptArchitect, and all Task Logic.
 */

import { z } from "zod";
import * as Repository from "../api/repository";
import { subjectKnowledgeService } from "@/shared/services/knowledge/subject-knowledge.service";
import { determineNodeStrategy } from "../algoritma/strategy";
import type {
    AIResponse,
    ConceptMapItem,
    ConceptMapResult,
    GeneratedQuestion,
    LLMProvider,
    Message,
} from "./types";
import { UnifiedLLMClient } from "../api/client";
import { rateLimiter } from "../api/rate-limit";

// --- Parser Logic ---

/**
 * Parse JSON from LLM response (simple extraction)
 */
export function parseJsonResponse(
    text: string | null | undefined,
    type: "object" | "array",
    onLog?: (msg: string, details?: Record<string, unknown>) => void,
): unknown {
    if (!text || typeof text !== "string") return null;

    try {
        let cleanText = text.trim();

        // 0. </think>...</think> bloklarını temizle (Qwen modelleri bunu ekliyor)
        cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

        // 1. Markdown bloklarını temizle (```json ... ``` veya sadece ``` ... ```)
        // Sadece ilk eşleşen bloğu al
        const markdownMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (markdownMatch) {
            cleanText = markdownMatch[1].trim();
        }

        // 2. Daha güvenli JSON ayıklama - indexOf ve lastIndexOf kullanarak
        const firstChar = type === "array" ? "[" : "{";
        const lastChar = type === "array" ? "]" : "}";
        const start = cleanText.indexOf(firstChar);
        const end = cleanText.lastIndexOf(lastChar);

        if (start !== -1 && end !== -1 && end > start) {
            cleanText = cleanText.substring(start, end + 1);
        } else {
            onLog?.("Geçerli JSON yapısı bulunamadı", {
                text: cleanText.substring(0, 100),
            });
            return null;
        }
        // 3. LaTeX Backslash Düzeltme (PRE-PROCESS)
        const regex = /(\\["\\/nrt]|\\u[0-9a-fA-F]{4})|(\\)/g;

        cleanText = cleanText.replace(regex, (match, valid, invalid) => {
            if (valid) return valid; // Geçerli escape, dokunma
            if (invalid) return "\\\\"; // Geçersiz backslash, çiftle
            return match;
        });

        // 4. Forgiving JSON Parser for Truncated Responses
        try {
            return JSON.parse(cleanText);
        } catch (e) {
            const closers = ["}", "]", '"}', '"]', "}", "]", "]}", "}}"];

            for (const closer of closers) {
                try {
                    return JSON.parse(cleanText + closer);
                } catch {
                    continue;
                }
            }

            if (type === "array" && cleanText.trim().startsWith("[")) {
                try {
                    return JSON.parse(cleanText + "}]");
                } catch {
                    // Ignore parse errors
                }
                try {
                    return JSON.parse(cleanText + "]");
                } catch {
                    // Ignore parse errors
                }
            }

            console.warn("JSON Parse Error (Unrecoverable):", e);
            return null;
        }
    } catch (e) {
        console.error("JSON Parse Error (Critical):", e);
        return null;
    }
}

// --- Structured Generator Logic ---

interface StructuredOptions<T> {
    schema: z.ZodSchema<T>;
    provider: LLMProvider;
    temperature?: number;
    maxRetries?: number;
    retryPromptTemplate?: string;
    model?: string;
    usageType?: string;
    onLog?: (msg: string, details?: Record<string, unknown>) => void;
}

const DEFAULT_RETRY_PROMPT = `BİR ÖNCEKİ CEVABIN JSON ŞEMASINA UYMUYORDU.
Lütfen geçerli bir JSON döndür.
Sadece JSON verisi gerekli.`;

export class StructuredGenerator {
    static async generate<T>(
        messages: Message[],
        options: StructuredOptions<T>,
    ): Promise<T | null> {
        const {
            schema,
            provider,
            maxRetries = 2,
            retryPromptTemplate = DEFAULT_RETRY_PROMPT,
            onLog,
        } = options;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const isRetry = attempt > 0;
            const currentMessages = [...messages];

            if (isRetry) {
                currentMessages.push({
                    role: "user",
                    content: retryPromptTemplate,
                });
                onLog?.(`Retry denemesi #${attempt}...`);
            }

            let lastResponse: AIResponse | null = null;
            try {
                const response: AIResponse = await rateLimiter.schedule(
                    () =>
                        UnifiedLLMClient.generate(
                            currentMessages,
                            {
                                provider,
                                model: options.model,
                                temperature: options.temperature ?? 0.1,
                                usageType: options.usageType,
                                onLog,
                            },
                        ),
                    provider,
                );
                lastResponse = response;

                const parsed = parseJsonResponse(
                    response.content,
                    "object",
                    onLog,
                );

                if (!parsed) {
                    onLog?.(`JSON Parse hatası (Deneme ${attempt + 1})`, {
                        raw_content: response.content,
                    });
                    throw new Error("JSON Parsing failed completely");
                }

                const validation = schema.safeParse(parsed);

                if (validation.success) {
                    return validation.data;
                } else {
                    console.error(
                        "!!! ZOD ERROR in field:",
                        JSON.stringify(validation.error.format(), null, 2),
                    );
                    const errorMsg = validation.error.issues
                        .map((i) => `${i.path.join(".")}: ${i.message}`)
                        .join(", ");
                    onLog?.(`Validasyon hatası (Deneme ${attempt + 1})`, {
                        error: errorMsg,
                        raw_content: response.content,
                    });
                }
            } catch (error) {
                onLog?.(`Generation hatası (Deneme ${attempt + 1})`, {
                    error: String(error),
                    raw_content: lastResponse?.content,
                });
            }
        }

        return null;
    }
}

// --- Base Task Infrastructure ---

export interface TaskContext {
    jobId?: string;
    traceId?: string;
    logger?: (msg: string, details?: Record<string, unknown>) => void;
}

export interface TaskResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    metadata?: Record<string, unknown>;
}

export abstract class BaseTask<TInput, TOutput> {
    abstract run(
        input: TInput,
        context?: TaskContext,
    ): Promise<TaskResult<TOutput>>;

    protected log(
        context: TaskContext | undefined,
        msg: string,
        details?: unknown,
    ) {
        if (context?.logger) {
            context.logger(msg, details as Record<string, unknown>);
        } else {
            console.log(`[Task] ${msg}`, details || "");
        }
    }
}

// --- Types & Schemas ---

export const ConceptMapSchema = z.preprocess(
    (val: any) => {
        if (val && typeof val === "object" && !val.baslik) {
            val.baslik = val.title || val.kavram || val.başlık || val.topic;
        }
        return val;
    },
    z.object({
        baslik: z.string().min(1),
        odak: z.string().default("Konu kapsamındaki temel kazanım"),
        // seviye alanına preprocess ekleyip metin bazında seviye belirleme
        seviye: z.preprocess((val) => {
            const s = String(val).toLowerCase();
            if (s.includes("uygulama") || s.includes("apply")) {
                return "Uygulama";
            }
            if (s.includes("analiz") || s.includes("analyze")) return "Analiz";
            return "Bilgi";
        }, z.enum(["Bilgi", "Uygulama", "Analiz"])),
        // gorsel alanı boş string gelirse null'a çevir
        gorsel: z.preprocess(
            (val) => (val === "" || val === undefined ? null : val),
            z.string().nullable(),
        ),
        altText: z.string().nullable().optional().default(null),
        isException: z.preprocess((val) => !!val, z.boolean().default(false)),
        prerequisites: z.array(z.string()).optional().default([]),
    }),
);

export const ConceptMapResponseSchema = z.object({
    difficulty_index: z.preprocess(
        (val) => {
            const num = Number(val);
            return Math.max(1, Math.min(5, isNaN(num) ? 3 : num));
        },
        z.number().min(1).max(5).describe(
            "Metnin bilişsel zorluk endeksi (1: Basit, 5: Çok Ağır Doktrin)",
        ),
    ),
    concepts: z.array(ConceptMapSchema).nonempty(),
});

export const GeneratedQuestionSchema = z.object({
    q: z.string().min(10, "Soru metni çok kısa"),
    o: z.array(z.string()).length(5, "Tam olarak 5 seçenek olmalı"),
    a: z.number().int().min(0).max(4),
    exp: z.string().min(10, "Açıklama metni çok kısa"),
    evidence: z.string().min(1, "Kanıt cümlesi zorunludur"),
    img: z.preprocess((val) => {
        if (val === null || val === undefined || val === "") return null;
        if (typeof val === "string") {
            if (val.toLowerCase() === "null") return null;
            const n = parseInt(val, 10);
            return isNaN(n) ? null : n;
        }
        return val;
    }, z.number().nullable().optional()),
    diagnosis: z.string().max(500).optional(),
    insight: z.string().max(500).nullable().optional(),
});

export const ValidationResultSchema = z.preprocess(
    (data: any) => {
        if (data && typeof data === "object") {
            // total_score alanı yoksa alternatif isimlere bak
            if (data.total_score === undefined) {
                data.total_score = data.score ?? data.puan ?? data.point;
            }
            // decision alanı metnine göre eşle
            if (data.decision && typeof data.decision === "string") {
                const d = data.decision.toUpperCase();
                if (
                    d.includes("APPROV") || d.includes("ONAY") ||
                    d.includes("KABUL") || d.includes("OK") ||
                    d.includes("TRUE")
                ) {
                    data.decision = "APPROVED";
                } else if (
                    d.includes("RED") || d.includes("REJECT") ||
                    d.includes("HATA")
                ) {
                    data.decision = "REJECTED";
                }
            }
        }
        return data;
    },
    z.object({
        total_score: z.coerce.number().min(0).max(100),
        decision: z.enum(["APPROVED", "REJECTED"]),
        critical_faults: z.array(z.string()).default([]),
        improvement_suggestion: z.string().default(""),
    }),
);

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export type GenerationStep =
    | "INIT"
    | "MAPPING"
    | "GENERATING"
    | "VALIDATING"
    | "SAVING"
    | "COMPLETED"
    | "ERROR";

export interface GenerationLog {
    id: string;
    step: GenerationStep;
    message: string;
    details: Record<string, unknown>;
    timestamp: Date;
}

export interface GeneratorCallbacks {
    onLog: (log: GenerationLog) => void;
    onQuestionSaved: (totalSaved: number) => void;
    onComplete: (result: { success: boolean; generated: number }) => void;
    onError: (error: string) => void;
}

// --- Prompts (Internal) ---

const GENERAL_QUALITY_RULES = `## GENEL KALİTE KURALLARI:
1. **Akademik Dil:** Soru kökü ve şıklar resmi, akademik ve sınav formatına (KPSS) uygun olmalıdır.
2. **Kapsam:** Metnin dışına çıkma, ancak metindeki bilgiyi farklı bir bağlamda veya örnekle sorgulayabilirsin.
3. **Çeldiriciler:** Çeldiricilerin en az ikisi, metindeki diğer kavramlarla doğrudan ilişkili ama sorulan odak noktasıyla çelişen ifadeler olmalıdır. "Hepsi", "Hiçbiri" YASAKTIR.
4. **Şık Yapısı:** Her zaman tam 5 adet (A,B,C,D,E) seçenek olmalıdır.
5. **Şık Dengesi:** Seçeneklerin tümü benzer uzunlukta ve yapıda olmalıdır.
6. **JSON GÜVENLİĞİ:** Tüm LaTeX komutlarında ters eğik çizgi () karakterini JSON içinde KESİNLİKLE çiftle (örn: \\alpha, \\frac{1}{2}). Tekil ters eğik çizgi JSON parse hatalarına yol açar ve kabul edilemez.
7. **Görsel Referansı:** Eğer bir görseli referans alarak soru soruyorsan, soru metni içinde MUTLAKA "[GÖRSEL: X]" etiketini geçir. Bu etiket, kullanıcıya hangi görsele bakması gerektiğini gösterir.`;

const COMMON_OUTPUT_FORMATS = `## ÇIKTI FORMATI:
Sadece ve sadece aşağıdaki JSON şemasına uygun çıktı ver. Markdown veya yorum ekleme.
LaTeX ifadeleri için çift ters eğik çizgi kullanmayı unutma (\\).
{
  "q": "Soru metni... (Gerekirse [GÖRSEL: X] içerir, LaTeX içerirse \\ komutlarını çiftle)",
  "o": ["A", "B", "C", "D", "E"],
  "a": 0, // 0-4 arası index
  "exp": "Açıklama... (LaTeX içerirse \\ komutlarını çiftle)",
  "evidence": "Cevabı doğrulayan metin alıntısı...",
  "img": 0 // Görsel referansı varsa indexi (0, 1, 2...), yoksa null
}
## SİSTEM MESAJI:
Eğer soruyu kurgularken metindeki bir görseli [GÖRSEL: X] referans alıyorsan, o görselin numarasını (0, 1, 2 gibi) 'img' alanına yaz. Eğer sorunun bir görselle doğrudan ilgisi yoksa 'img' değerini null bırak.`;

const ANALYSIS_SYSTEM_PROMPT = (
    targetCount: number,
    sectionTitle: string,
    courseName: string,
) => `Sen Uzman bir Eğitim İçerik Analistisin (KPSS A Grubu). 
Görev: ${courseName} altındaki **"${sectionTitle}"** başlıklı metni tarayarak kapsamlı bir soru bankası haritası oluştur. Hiçbir bilgi boşluğu bırakmayacak şekilde yaklaşık ${targetCount} adet kaliteli soru noktası belirle. Sadece Önem Puanı 10 üzerinden 7 ve üzeri olan noktaları listele. Metin bittiğinde veya kalitesiz detaylara gelindiğinde dur; asla hedef sayıya ulaşmak için uydurma veya değersiz veri üretme.

Ayrıca metnin "Bilişsel Zorluk Endeksini" (1-5) hesapmalısın.

Kurallar:
1. **EXCEPTION HUNTER:** Metinde "Ancak", "İstisnaen", "Şu kadar ki", "Saklı kalmak kaydıyla" gibi ifadelerle başlayan cümleleri TARA. Bu istisnaları ayrı birer kavram durağı olarak MUTLAKA listeye ekle ve 'isException': true olarak işaretle. (Priority 1)
2. Metnin baş, orta ve son kısımlarından dengeli bir konu dağılımı yap.
3. Belirlenen kavramlar anlamsal olarak birbirini kapsamamalı (overlap olmamalı), metnin farklı ve bağımsız bölümlerini temsil eden 'ana duraklar' niteliğinde olmalıdır.
4. 'seviye' alanını şu tanımlara göre belirle:
   - 'Bilgi': Tanım, kavram ve temel olgular.
   - 'Uygulama': Süreçler, yöntemler ve nasıl yapılır bilgisi.
   - 'Analiz': Neden-sonuç ilişkileri, kıyaslama ve çıkarımlar.
5. 'odak' alanı 15 kelimeyi geçmemeli ve net bir öğrenme kazanımı belirtmelidir.
6. Görsel Analizi: Çıktıdaki her objede 'gorsel' anahtarı mutlaka bulunmalıdır. Eğer ilgili görsel yoksa değeri kesinlikle null olmalıdır; anahtarı (key) asla silme veya atlama.
7. Görsel varsa 'altText' alanına görselin teknik açıklamasını ekle.
8. Her kavram için anahtar ismi olarak mutlaka 'baslik' kullanılmalıdır.

**Difficulty Index (Bilişsel Zorluk Endeksi) Kılavuzu:**
- 1: Giriş seviyesi, basit anlatım, hikaye tarzı (Örn: Tarih giriş)
- 3: Standart mevzuat veya konu anlatımı (Örn: Anayasa maddeleri)
- 5: Ağır doktrin, İcra-İflas gibi teknik ve karmaşık süreçler, yoğun Latince veya eski Türkçe terimler.

Çıktı Formatı:
Sadece saf JSON objesi döndür. Markdown bloğu (\`\`\`) veya giriş cümlesi ekleme.
{
  "difficulty_index": 3, 
  "concepts": [...]
}`;

const GLOBAL_AI_SYSTEM_PROMPT =
    "Sen KPSS formatında, akademik dille soru yazan uzman bir yapay zekasın. SADECE JSON formatında çıktı ver. Cevabın dışında hiçbir metin, yorum veya markdown karakteri bulunmamalıdır.";

function buildDraftingTaskPrompt(
    concept: ConceptMapItem,
    strategy: { bloomLevel: string; instruction: string },
    usageType: "antrenman" | "deneme" | "arsiv" = "antrenman",
    previousDiagnoses?: string[],
): string {
    const parts = [
        `AMAÇ: Metni analiz ederek, belirtilen pedagojik stratejiye uygun tek bir soru üretmek.`,
        `---`,
    ];

    if (usageType === "deneme") {
        parts.push(`!!! DENEME (SİMÜLASYON) MODU !!! / ZORLUK ARTIRILMIŞTIR
- **Çeldiriciler:** Şıklar birbirine ÇOK yakın olmalı. "Bariz yanlış" şık kesinlikle olmamalı.
- **Tuzak:** Doğru cevaba en yakın, güçlü bir çeldirici (distractor) mutlaka ekle.
- **Kapsam:** Soru, sadece bu ünitedeki izole bilgiyi değil, kurs genelinde bu kavramla karıştırılabilecek diğer terimleri de çağrıştırmalıdır.`);
    }

    parts.push(`ÇELDİRİCİ (DISTRACTOR) KURALLARI:
Yanlış seçenekler rastgele üretilmemeli, şu üç kategoriden en az birine dayanmalıdır:
1. **Kavram Karmaşası:** Doğru cevaba benzeyen ancak farklı bir bağlamda kullanılan terimler.
2. **İşlem/Mantık Hatası:** Doğru muhakeme sürecindeki yaygın bir hatanın sonucu.
3. **Yarım Doğru:** Doğru başlayan ancak yanlış biten (veya tam tersi) ifadeler.
*Rastgele veya saçma yanlışlar üretme.*

LATEX FORMAT ZORUNLULUĞU:
- Tüm sayısal verileri, matematiksel formülleri, değişkenleri ($x, y, P, Q$) ve teknik sembolleri ($IS-LM, \\sigma^2, \\alpha$ vb.) **hem soru metninde (q) hem de açıklamada (exp)** KESİNLİKLE LaTeX formatında yaz.
- Örn: "faiz oranı %5" yerine "$r = 5\\%$" veya "$P = 100$" şeklinde.`);

    parts.push(`HEDEF KAVRAM VE ODAK:
- Kavram: ${concept.baslik}
- Odak Noktası: ${concept.odak}
- Bloom Seviyesi: ${concept.seviye || strategy.bloomLevel}`);

    if (concept.gorsel) {
        parts.push(
            `GÖRSEL REFERANSI: Soruyu kurgularken '${concept.gorsel}' görseline atıfta bulun veya görselin açıkladığı durumu senaryolaştır.${
                concept.altText
                    ? `\nGörsel Açıklaması (Alt-Text): ${concept.altText}`
                    : ""
            }`,
        );
    }

    parts.push(`PEDAGOJİK STRATEJİ:
${strategy.instruction}

KANIT ZORUNLULUĞU:
Eğer soru bir senaryo veya analiz içeriyorsa; evidence alanına metindeki dayanak kuralı/tanımı yaz ve yanına kısa bir notla bu kuralın sorudaki duruma nasıl bağlandığını açıkla. Eğer metinde doğrudan bir kanıt veya dayanak yoksa o soruyu üretme.`);

    if (previousDiagnoses && previousDiagnoses.length > 0) {
        parts.push(`KULLANICININ GEÇMİŞ HATALARI (BU KONUDA):
Kullanıcı bu konuda daha önce şu hataları yaptı. Soruları üretirken bu zayıf noktaları özellikle test etmeye çalış:
${previousDiagnoses.map((d) => `- ${d}`).join("\n")}`);
    }

    parts.push(
        `Lütfen BAĞLAM METNİNİ referans alarak soruyu oluştur ve SADECE JSON döndür.`,
    );

    return parts.join("\n\n");
}

const VALIDATION_SYSTEM_PROMPT = `## ROL
Sen AuditPath için "Güvenlik ve Doğruluk Kontrolü Uzmanısın".
Görevin: Üretilen KPSS sorularının teknik ve bilimsel doğruluğunu kontrol etmektir. "HATA YOKLUĞU"na odaklanmalısın.

## DEĞERLENDİRME KRİTERLERİ (TOPLAM SKOR)
Soruyu aşağıdaki açılardan tek bir bütün olarak değerlendir ve 0-100 arası bir puan ver:

1. **Groundedness & Accuracy:** Soru metne sadık mı ve bilgi doğru mu? (En Kritik)
2. **Distractor Quality:** Çeldiriciler teknik olarak yanlış mı? (Cevap anahtarı net olmalı)
3. **Internal Logic:** Soru kökü, şıklar ve açıklama tutarlı mı?

## KARAR MEKANİZMASI
- **Total Score >= 70 ise:** "APPROVED"
- **Total Score < 70 ise:** "REJECTED"

**ÖNEMLİ:**
- Eğer karar "APPROVED" ise: \`critical_faults\` dizisini BOŞ bırak ([]), \`improvement_suggestion\` alanını BOŞ string ("") bırak.
- Eğer karar "REJECTED" ise: Hataları ve düzeltme önerisini yaz.

## GÜVENLİK KONTROLÜ (SAFETY CHECK) İLKESİ
- Sadece bariz hataları, halüsinasyonları ve teknik yanlışları reddet.
- Soru teknik olarak doğru ve çözülebilir ise, "daha iyi olabilirdi" diye reddetme, ONAYLA.

## ÇIKTI FORMATI (ZORUNLU):
Sadece aşağıdaki JSON yapısını döndür:
{
  "total_score": 0-100 arası sayı,
  "decision": "APPROVED" veya "REJECTED",
  "critical_faults": ["hata1", "hata2"],
  "improvement_suggestion": "öneri"
}`;

function buildValidationTaskPrompt(
    question: { q: string; o: string[]; a: number; exp: string },
): string {
    const optionsText = question.o
        .map((opt: string, i: number) =>
            `${String.fromCharCode(65 + i)}) ${opt}`
        )
        .join("\n");
    const correctAnswer = String.fromCharCode(65 + question.a);

    return `## DEĞERLENDİRİLECEK SORU:

**Soru:** ${question.q}

**Şıklar:**
${optionsText}

**Doğru Cevap:** ${correctAnswer}

**Açıklama:** ${question.exp}

---

Yukarıdaki soruyu kaynak metne göre değerlendir ve JSON formatında puanla.`;
}

function buildFollowUpTaskPrompt(
    evidence: string,
    originalQuestion: { q: string; o: string[]; a: number; exp: string },
    incorrectOptionIndex: number,
    correctOptionIndex: number,
    targetBloomLevel: string,
    scaffoldingNote: string,
    previousDiagnoses: string[],
): string {
    const taskParts = [
        `## ÖZEL TALİMATLAR`,
        `Gemiş bağlamı (metni) sadece çeldirici kalitesini artırmak için kullan.`,
        `SORUNUN DOĞRU CEVABI KESİNLİKLE VE SADECE VERİLEN "KANIT CÜMLESİ"NE DAYANMALIDIR.`,
        ``,
        `## FOLLOW-UP SORU ÜRETİMİ`,
        `Kullanıcı bir önceki soruyu YANLIŞ cevapladı. Yeni bir soru üretmelisin.`,
        `**TEK KAYNAK (DOĞRU CEVAP İÇİN):** "${evidence}"`,
        `SORU KURMA TALİMATI:
1. Sorunun doğru cevabı yukarıdaki "TEK KAYNAK" cümlesine %100 sadık olmalıdır.
2. Çeldiricileri (yanlış şıkları) üretirken, modelin kafasını karıştırmak için "Geniş Bağlam (Yukarıdaki Metin)" içerisindeki diğer kavramları kullan.
3. Ancak kullanıcının metindeki başka bir yere bakarak soruyu çözmesine veya kafasının karışmasına izin verme; cevap sadece belirtilen cümlede olmalı.`,
        `ZORLUK: Hedef Seviye: ${targetBloomLevel}${scaffoldingNote}`,
        `## YANLIŞ CEVAPLANAN SORU:\n${
            JSON.stringify(originalQuestion, null, 2)
        }`,
        `Kullanıcının verdiği cevap: ${
            ["A", "B", "C", "D", "E"][incorrectOptionIndex]
        } ("${originalQuestion.o[incorrectOptionIndex]}")`,
        `Doğru cevap: ${["A", "B", "C", "D", "E"][correctOptionIndex]} ("${
            originalQuestion.o[correctOptionIndex]
        }")`,
    ];

    if (previousDiagnoses.length > 0) {
        taskParts.push(
            `## KULLANICININ GEÇMİŞ HATALARI:\n${
                previousDiagnoses
                    .map((d) => `- ${d}`)
                    .join("\n")
            }`,
        );
    }

    taskParts.push(`EK KURALLAR:
1. **Çeldiriciler:** Kavram karmaşası yaratan, metinden beslenen ama bu soru için yanlış olan şıklar.
2. **LaTeX:** Sayısal veriler KESİNLİKLE LaTeX ($P=10$ vb.).
3. **Kanıt:** "evidence" alanına yukarıdaki "TEK KAYNAK" cümlesini aynen yaz.
4. **Teşhis (diagnosis):** Kullanıcının neden hata yaptığını analiz et ve kısa, profesyonel bir teşhis yaz. Örn: "Y kavramı ile X kavramı karıştırılıyor", "Zamansal sıralama hatası", "İstisna kuralının gözden kaçırılması".
5. **Sokratik Mentor (insight):** Kullanıcının hatasını fark etmesini sağlayacak, cevabı doğrudan vermeyen ama doğru düşünce yolunu gösteren 1-2 cümlelik bir "Öğretmen Notu" yaz.
   - Cevabı SÖYLEME.
   - Hatanın MANTIĞINI göster.
   - Motivasyon verici ve yönlendirici ol.
   - Örn: "Genelde yürütme yetkisini yargı ile karıştırıyorsun, bu soruda yetki devrinin kimde olduğuna odaklan."`);

    taskParts.push(
        `GÖREVİN: Belirtilen kanıt cümlesine odaklanarak yeni bir follow-up soru üret.
    
ÇIKTI FORMATI (SADECE JSON):
{
"q": "Soru metni...",
"o": ["A", "B", "C", "D", "E"],
"a": 0, "exp": "...", "evidence": "...", "img": null,
"diagnosis": "...", "insight": "..."
}`,
    );

    return taskParts.join("\n\n");
}

class PromptArchitect {
    static assemble(
        systemPrompt: string,
        contextPrompt: string,
        taskPrompt: string,
    ): Message[] {
        return [
            { role: "system", content: this.normalizeText(systemPrompt) },
            { role: "user", content: this.normalizeText(contextPrompt) },
            {
                role: "user",
                content: `--- GÖREV ---\n${
                    this.normalizeText(taskPrompt).trimStart()
                }`,
            },
        ];
    }

    static buildContext(
        content: string,
        courseName?: string,
        sectionTitle?: string,
        guidelines?: {
            instruction?: string;
            few_shot_example?: unknown;
            bad_few_shot_example?: unknown;
        } | null,
    ): string {
        const parts: string[] = [];

        if (courseName && courseName.trim()) {
            parts.push(`## DERS: ${courseName.trim()}`);
        }
        if (sectionTitle && sectionTitle.trim()) {
            parts.push(`## KONU: ${sectionTitle.trim()}`);
        }

        if (guidelines) {
            parts.push("## DERS REHBERİ VE KURALLAR:");
            if (guidelines.instruction && guidelines.instruction.trim()) {
                parts.push(
                    `### TEKNİK KURALLAR\n${guidelines.instruction.trim()}`,
                );
            }
            if (guidelines.few_shot_example) {
                const exampleStr = JSON.stringify(
                    guidelines.few_shot_example,
                    null,
                    2,
                );
                parts.push(`\n### İYİ ÖRNEK (Bunu model al):\n${exampleStr}`);
            }
            if (guidelines.bad_few_shot_example) {
                const badExampleStr = JSON.stringify(
                    guidelines.bad_few_shot_example,
                    null,
                    2,
                );
                parts.push(
                    `\n### KÖTÜ ÖRNEK (Bundan kaçın):\n${badExampleStr}`,
                );
            }
        }

        parts.push(GENERAL_QUALITY_RULES);
        parts.push(COMMON_OUTPUT_FORMATS);
        parts.push("## BAĞLAM METNİ:");
        parts.push(this.normalizeText(content));

        return parts.map((p) => p.trim()).filter((p) => p.length > 0).join(
            "\n\n",
        );
    }

    static cleanReferenceImages(content: string): string {
        return content.replace(/!\[[^\]]*\]\([^)]+\)/g, "[GÖRSEL]");
    }

    private static normalizeText(text: string): string {
        return text.replace(/\r\n/g, "\n").trim();
    }
}

// --- Analysis Task ---

interface AnalysisTaskInput {
    content: string;
    wordCount: number;
    meaningfulWordCount?: number;
    densityScore?: number;
    courseName: string;
    sectionTitle: string;
}

class AnalysisTask extends BaseTask<AnalysisTaskInput, ConceptMapResult> {
    async run(
        input: AnalysisTaskInput,
        context?: TaskContext,
    ): Promise<TaskResult<ConceptMapResult>> {
        const meaningfulCount = input.meaningfulWordCount || input.wordCount;
        const density = input.densityScore || 0.5;
        const base = meaningfulCount / 45;

        let multiplier = 1.0;
        if (density > 0.55) {
            multiplier = 1.2;
        } else if (density < 0.25) {
            multiplier = 0.8;
        }

        const calculated = base * multiplier;
        const targetCount = Math.max(3, Math.round(calculated));

        this.log(context, "Kavram haritası hedefleri belirlendi", {
            targetCount,
        });

        const systemPrompt = ANALYSIS_SYSTEM_PROMPT(
            targetCount,
            input.sectionTitle,
            input.courseName,
        );

        const contextPrompt = PromptArchitect.buildContext(
            PromptArchitect.cleanReferenceImages(input.content),
        );

        const messages = PromptArchitect.assemble(
            systemPrompt,
            contextPrompt,
            `Lütfen kavram haritasını ve yoğunluk skorunu oluştur. JSON formatında çıktı ver.`,
        );

        const result = await StructuredGenerator.generate(messages, {
            schema: ConceptMapResponseSchema,
            provider: "google",
            model: "gemini-2.5-flash",
            usageType: "analysis",
            onLog: (msg, details) => this.log(context, msg, details),
        });

        if (result) return { success: true, data: result };
        return { success: false, error: "Failed to generate concept map" };
    }
}

// --- Drafting Task ---

interface DraftingTaskInput {
    concept: ConceptMapItem;
    index: number;
    wordCount: number;
    courseName: string;
    usageType?: "antrenman" | "deneme" | "arsiv";
    previousDiagnoses?: string[];
    sharedContextPrompt: string;
}

class DraftingTask extends BaseTask<DraftingTaskInput, GeneratedQuestion> {
    async run(
        input: DraftingTaskInput,
        context?: TaskContext,
    ): Promise<TaskResult<GeneratedQuestion>> {
        const {
            concept,
            index,
            wordCount,
            courseName,
            usageType = "antrenman",
            previousDiagnoses,
            sharedContextPrompt,
        } = input;

        const strategy = determineNodeStrategy(
            index,
            wordCount,
            concept,
            courseName,
        );
        this.log(context, `Drafting Question for: ${concept.baslik}`, {
            strategy: strategy.bloomLevel,
        });

        const taskPrompt = buildDraftingTaskPrompt(
            concept,
            strategy,
            usageType,
            previousDiagnoses,
        );

        const messages = PromptArchitect.assemble(
            GLOBAL_AI_SYSTEM_PROMPT,
            sharedContextPrompt,
            taskPrompt,
        );

        const result = await StructuredGenerator.generate(messages, {
            schema: GeneratedQuestionSchema,
            provider: "mimo",
            temperature: 0.1,
            usageType: "drafting",
            onLog: (msg, details) => this.log(context, msg, details),
        });

        if (result) {
            const question: GeneratedQuestion = {
                ...result,
                bloomLevel: strategy.bloomLevel,
                img: result.img ?? null,
                concept: concept.baslik,
            };
            return { success: true, data: question };
        }

        return { success: false, error: "Failed to generate question" };
    }
}

// --- Validation Task ---

interface QuestionToValidate {
    q: string;
    o: string[];
    a: number;
    exp: string;
    bloomLevel?: "knowledge" | "application" | "analysis";
    img?: number | null;
}

interface ValidationTaskInput {
    question: QuestionToValidate;
    content: string;
}

class ValidationTask extends BaseTask<ValidationTaskInput, ValidationResult> {
    async run(
        input: ValidationTaskInput,
        context?: TaskContext,
    ): Promise<TaskResult<ValidationResult>> {
        const { question, content } = input;
        this.log(context, "Validating question...");

        const contextPrompt = PromptArchitect.buildContext(
            PromptArchitect.cleanReferenceImages(content),
        );
        const taskPrompt = buildValidationTaskPrompt(question);
        const messages = PromptArchitect.assemble(
            VALIDATION_SYSTEM_PROMPT,
            contextPrompt,
            taskPrompt,
        );

        const result = await StructuredGenerator.generate(messages, {
            schema: ValidationResultSchema,
            provider: "cerebras",
            usageType: "validation",
            onLog: (msg, details) => this.log(context, msg, details),
        });

        if (result) {
            if (result.decision === "APPROVED") {
                result.critical_faults = [];
                result.improvement_suggestion = "";
            }
            return { success: true, data: result };
        }

        return { success: false, error: "Validation failed" };
    }
}

// --- Revision Task ---

interface RevisionTaskInput {
    originalQuestion: GeneratedQuestion;
    validationResult: ValidationResult;
    sharedContextPrompt: string;
}

class RevisionTask extends BaseTask<RevisionTaskInput, GeneratedQuestion> {
    async run(
        input: RevisionTaskInput,
        context?: TaskContext,
    ): Promise<TaskResult<GeneratedQuestion>> {
        const { originalQuestion, validationResult, sharedContextPrompt } =
            input;
        this.log(context, "Revising question...");

        const REVISION_RETRY_TEMPLATE =
            `BİR ÖNCEKİ CEVABIN JSON ŞEMASINA UYMUYORDU.
        Lütfen geçerli bir JSON döndür.
        Şema kuralları:
        1. "o" dizisi TAM 5 elemanlı olmalı.
        2. "a" (doğru cevap indexi) 0 ile 4 arasında bir sayı olmalı.
        3. "img" görsel index numarası olmalıdır (Eğer görsel yoksa null).
        4. "evidence" alanı kanıt cümlesini içermelidir (Boş olamaz).
        5. Cevabın dışında hiçbir yorum veya açıklama ekleme. Sadece JSON verisi gerekli.`;

        const revisionTask =
            `Aşağıdaki soru, belirtilen nedenlerle REDDEDİLMİŞTİR.
        Lütfen geri bildirimi dikkate alarak soruyu revize et.
        
        ## REDDEDİLEN SORU:
        ${
                JSON.stringify(
                    {
                        q: originalQuestion.q,
                        o: originalQuestion.o,
                        a: originalQuestion.a,
                        exp: originalQuestion.exp,
                    },
                    null,
                    2,
                )
            }
        
        ## RET NEDENLERİ (KRİTİK HATALAR):
        ${validationResult.critical_faults.map((f) => `- ${f}`).join("\n")}
        
        ## İYİLEŞTİRME ÖNERİSİ:
        ${validationResult.improvement_suggestion}
        
        Soruyu revize et. Hataları gider, akademik dili koru.
        ${REVISION_RETRY_TEMPLATE}`;

        const messages = PromptArchitect.assemble(
            GLOBAL_AI_SYSTEM_PROMPT,
            sharedContextPrompt,
            revisionTask,
        );

        const result = await StructuredGenerator.generate(messages, {
            schema: GeneratedQuestionSchema,
            provider: "mimo",
            temperature: 0.1,
            maxRetries: 2,
            usageType: "revision",
            retryPromptTemplate: REVISION_RETRY_TEMPLATE,
            onLog: (msg, details) => this.log(context, msg, details),
        });

        if (result) {
            const revised: GeneratedQuestion = {
                ...result,
                bloomLevel: originalQuestion.bloomLevel,
                img: originalQuestion.img,
                concept: originalQuestion.concept,
            };
            return { success: true, data: revised };
        }

        return { success: false, error: "Revision failed" };
    }
}

// --- Follow-Up Task ---

interface WrongAnswerContext {
    chunkId: string;
    originalQuestion: {
        id: string;
        q: string;
        o: string[];
        a: number;
        exp: string;
        evidence: string;
        img?: number | null;
        bloomLevel?: string;
        concept: string;
    };
    incorrectOptionIndex: number;
    correctOptionIndex: number;
    courseId: string;
    userId: string;
}

interface FollowUpTaskInput {
    context: WrongAnswerContext;
    evidence: string;
    chunkContent: string;
    courseName: string;
    sectionTitle: string;
    guidelines: {
        instruction?: string | undefined;
        few_shot_example?: unknown;
        bad_few_shot_example?: unknown;
    };
}

class FollowUpTask extends BaseTask<FollowUpTaskInput, GeneratedQuestion> {
    async run(
        input: FollowUpTaskInput,
        context?: TaskContext,
    ): Promise<TaskResult<GeneratedQuestion>> {
        const { id: originalId, bloomLevel: originalBloom } =
            input.context.originalQuestion;
        const { userId, chunkId } = input.context;
        const { evidence, chunkContent, courseName, sectionTitle, guidelines } =
            input;

        this.log(context, "Generating Follow-up question...");

        const statusData = await Repository.getUserQuestionStatus(
            userId,
            originalId,
        );

        const consecutiveFails = statusData?.consecutive_fails ?? 0;
        let targetBloomLevel = (originalBloom || "application") as
            | "knowledge"
            | "application"
            | "analysis";
        let scaffoldingNote = "";

        if (consecutiveFails >= 2) {
            if (targetBloomLevel === "analysis") {
                targetBloomLevel = "application";
            } else if (targetBloomLevel === "application") {
                targetBloomLevel = "knowledge";
            }
            scaffoldingNote =
                `\n**SCAFFOLDING AKTİF**: Kullanıcı bu konuda zorlanıyor (Hata #${consecutiveFails}). Soruyu BİR ALT BİLİŞSEL SEVİYEYE (${targetBloomLevel}) indir.`;
        }

        const previousDiagnoses = await Repository.getRecentDiagnoses(
            userId,
            chunkId,
            3,
        );

        const contextPrompt = PromptArchitect.buildContext(
            PromptArchitect.cleanReferenceImages(chunkContent),
            courseName,
            sectionTitle,
            guidelines,
        );

        const originalQuestionJson = {
            q: input.context.originalQuestion.q,
            o: input.context.originalQuestion.o,
            a: input.context.originalQuestion.a,
            exp: input.context.originalQuestion.exp,
            img: input.context.originalQuestion.img ?? null,
        };

        const taskPrompt = buildFollowUpTaskPrompt(
            evidence,
            originalQuestionJson,
            input.context.incorrectOptionIndex,
            input.context.correctOptionIndex,
            targetBloomLevel,
            scaffoldingNote,
            previousDiagnoses,
        );

        const messages = PromptArchitect.assemble(
            GLOBAL_AI_SYSTEM_PROMPT,
            contextPrompt,
            taskPrompt,
        );

        const result = await StructuredGenerator.generate(messages, {
            schema: GeneratedQuestionSchema,
            provider: "mimo",
            temperature: 0.1,
            onLog: (msg, details) => this.log(context, msg, details),
        });

        if (result) {
            return {
                success: true,
                data: {
                    ...result,
                    bloomLevel: targetBloomLevel,
                    img: input.context.originalQuestion.img ?? null,
                    concept: input.context.originalQuestion.concept,
                },
            };
        }

        return { success: false, error: "Follow-up generation failed" };
    }
}

// --- Main Factory Class ---

export class QuizFactory {
    private analysisTask = new AnalysisTask();
    private draftingTask = new DraftingTask();
    private validationTask = new ValidationTask();
    private revisionTask = new RevisionTask();
    private followUpTask = new FollowUpTask();

    private createLog(
        step: GenerationStep,
        message: string,
        details: Record<string, unknown> = {},
    ): GenerationLog {
        return {
            id: crypto.randomUUID(),
            step,
            message,
            details,
            timestamp: new Date(),
        };
    }

    /**
     * Unified generation pipeline for Chunk-based questions
     */
    async generateForChunk(
        chunkId: string,
        callbacks: GeneratorCallbacks,
        options: {
            targetCount?: number;
            usageType?: "antrenman" | "arsiv" | "deneme";
            force?: boolean;
        } = {},
    ) {
        const log = (
            step: GenerationStep,
            msg: string,
            details: Record<string, unknown> = {},
        ) => {
            callbacks.onLog(this.createLog(step, msg, details));
        };

        try {
            // 1. INIT
            log("INIT", "Chunk bilgileri yükleniyor...", { chunkId });

            await Repository.updateChunkStatus(chunkId, "PROCESSING");

            const chunk = await Repository.getChunkWithContent(chunkId);
            if (!chunk) throw new Error("Chunk not found");

            // 2. MAPPING
            log("MAPPING", "Kavram haritası çıkarılıyor...");
            let concepts: ConceptMapItem[] = (chunk.metadata as {
                concept_map?: ConceptMapItem[];
                difficulty_index?: number;
                density_score?: number;
            })?.concept_map || [];
            let difficultyIndex = (chunk.metadata as {
                concept_map?: ConceptMapItem[];
                difficulty_index?: number;
                density_score?: number;
            })?.difficulty_index || (chunk.metadata as any)?.density_score || 3;

            if (concepts.length === 0) {
                const analysisResult = await this.analysisTask.run({
                    content: chunk.display_content || chunk.content,
                    wordCount: chunk.word_count || 500,
                    courseName: chunk.course_name,
                    sectionTitle: chunk.section_title,
                }, {
                    logger: (msg: string, d?: Record<string, unknown>) =>
                        log("MAPPING", msg, d || {}),
                });

                if (!analysisResult.success || !analysisResult.data) {
                    throw new Error("Concept mapping failed");
                }

                concepts = analysisResult.data.concepts;
                difficultyIndex = analysisResult.data.difficulty_index;

                const { error: updateErr } = await Repository
                    .updateChunkMetadata(chunkId, {
                        ...(chunk.metadata as Record<string, unknown>),
                        concept_map: concepts,
                        difficulty_index: difficultyIndex,
                    } as any);

                // Hata yönetimi: kayıt başarısız olursa sessiz kalma, hata fırlat
                if (updateErr) {
                    console.error("[Factory] Mapping save failed:", updateErr);
                    throw new Error(
                        `Kavram haritası kaydedilemedi: ${updateErr.message}`,
                    );
                }

                log("MAPPING", "Kavram haritası başarıyla kaydedildi.");
            }

            // 3. GENERATION LOOP
            const guidelines = await subjectKnowledgeService.getGuidelines(
                chunk.course_name,
            );
            const cleanContent = PromptArchitect.cleanReferenceImages(
                chunk.display_content || chunk.content,
            );
            const sharedContext = PromptArchitect.buildContext(
                cleanContent,
                chunk.course_name,
                chunk.section_title,
                guidelines,
            );

            // Determine quota and target
            const usageType = options.usageType || "antrenman";
            const targetConcepts = (usageType === "antrenman")
                ? concepts
                : [...concepts].sort(() => 0.5 - Math.random());

            let generatedCount = 0;
            const targetTotal = options.targetCount || concepts.length;

            log("GENERATING", `Üretim başlıyor: ${usageType.toUpperCase()}`, {
                target: targetTotal,
            });

            for (let i = 0; i < targetConcepts.length; i++) {
                if (generatedCount >= targetTotal) break;

                const concept = targetConcepts[i];
                log("GENERATING", `Kavram işleniyor: ${concept.baslik}`, {
                    index: i + 1,
                });

                // Check Cache
                const cached = await Repository.fetchCachedQuestion(
                    chunkId,
                    usageType,
                    concept.baslik,
                );

                if (cached) {
                    log("SAVING", "Cache'den getirildi", {
                        concept: concept.baslik,
                    });
                    callbacks.onQuestionSaved(++generatedCount);
                    continue;
                }

                // Draft
                const draft = await this.draftingTask.run({
                    concept,
                    index: i,
                    wordCount: chunk.word_count || 500,
                    courseName: chunk.course_name,
                    usageType,
                    sharedContextPrompt: sharedContext,
                }, {
                    logger: (msg: string, d?: Record<string, unknown>) =>
                        log("GENERATING", msg, d || {}),
                });

                if (!draft.success || !draft.data) continue;

                let question = draft.data;

                // Validate & Revise
                let validRes = await this.validationTask.run({
                    question,
                    content: cleanContent,
                }, {
                    logger: (msg: string, d?: Record<string, unknown>) =>
                        log("VALIDATING", msg, d || {}),
                });
                let attempts = 0;

                while (
                    validRes.success &&
                    validRes.data?.decision === "REJECTED" && attempts < 2
                ) {
                    attempts++;
                    log("VALIDATING", `Revizyon deneniyor (${attempts})...`);
                    const revRes = await this.revisionTask.run({
                        originalQuestion: question,
                        validationResult: validRes.data,
                        sharedContextPrompt: sharedContext,
                    }, {
                        logger: (msg: string, d?: Record<string, unknown>) =>
                            log(
                                "VALIDATING",
                                msg,
                                d || {},
                            ),
                    });

                    if (!revRes.success || !revRes.data) break;
                    question = revRes.data;
                    validRes = await this.validationTask.run({
                        question,
                        content: cleanContent,
                    }, {
                        logger: (msg: string, d?: Record<string, unknown>) =>
                            log(
                                "VALIDATING",
                                msg,
                                d || {},
                            ),
                    });
                }

                if (
                    validRes.success && validRes.data?.decision === "APPROVED"
                ) {
                    // Save
                    const { error: saveErr } = await Repository.createQuestion({
                        chunk_id: chunkId,
                        course_id: chunk.course_id,
                        section_title: chunk.section_title,
                        usage_type: usageType,
                        bloom_level: question.bloomLevel || "knowledge",
                        question_data: {
                            q: question.q,
                            o: question.o,
                            a: question.a,
                            exp: question.exp,
                            img: question.img,
                            evidence: question.evidence,
                            diagnosis: question.diagnosis,
                            insight: question.insight,
                        },
                        concept_title: concept.baslik,
                    });

                    if (!saveErr) {
                        callbacks.onQuestionSaved(++generatedCount);
                        log("SAVING", "Soru kaydedildi", {
                            concept: concept.baslik,
                        });
                    } else {
                        log("ERROR", "Kayıt hatası", {
                            error: saveErr.message,
                        });
                    }
                } else {
                    log("ERROR", "Soru onaylanmadı", {
                        concept: concept.baslik,
                    });
                }
            }

            await Repository.updateChunkStatus(chunkId, "COMPLETED");
            callbacks.onComplete({ success: true, generated: generatedCount });
            log("COMPLETED", "İşlem tamamlandı", { total: generatedCount });
        } catch (e: unknown) {
            const errorMessage = e instanceof Error
                ? e.message
                : "Bilinmeyen hata";
            log("ERROR", errorMessage);
            callbacks.onError(errorMessage);
            await Repository.updateChunkStatus(chunkId, "FAILED");
        }
    }

    /**
     * Generate Follow-Up Question
     */
    async generateFollowUp(
        context: WrongAnswerContext,
    ): Promise<string | null> {
        try {
            const chunk = await Repository.getChunkWithContent(context.chunkId);

            if (!chunk) return null;

            const guidelines = await subjectKnowledgeService.getGuidelines(
                chunk.course_name,
            );
            const cleanContent = PromptArchitect.cleanReferenceImages(
                chunk.display_content || chunk.content,
            );

            const result = await this.followUpTask.run({
                context,
                evidence: context.originalQuestion.evidence || "",
                chunkContent: cleanContent,
                courseName: chunk.course_name,
                sectionTitle: chunk.section_title,
                guidelines: guidelines
                    ? {
                        instruction: guidelines.instruction,
                        few_shot_example: guidelines.few_shot_example,
                    }
                    : {},
            });

            if (!result.success || !result.data) return null;

            const q = result.data;
            const { error: saveErr } = await Repository.createQuestion({
                chunk_id: context.chunkId,
                course_id: context.courseId,
                section_title: chunk.section_title,
                usage_type: "antrenman",
                bloom_level: q.bloomLevel,
                created_by: context.userId,
                parent_question_id: context.originalQuestion.id,
                question_data: {
                    q: q.q,
                    o: q.o,
                    a: q.a,
                    exp: q.exp,
                    img: q.img,
                    evidence: q.evidence,
                    diagnosis: q.diagnosis,
                    insight: q.insight,
                },
            });

            if (saveErr) return null;
            const saved = await Repository.fetchGeneratedQuestions(
                context.chunkId,
                "antrenman",
                1,
            );
            return saved?.[0]?.id || null;
        } catch (e) {
            console.error("FollowUp Gen Error:", e);
            return null;
        }
    }

    /**
     * Generate Archive Refresh Question (Anti-Ezber)
     */
    async generateArchiveRefresh(
        chunkId: string,
        originalQuestionId: string,
    ): Promise<string | null> {
        try {
            const originalQ = await Repository.getQuestionData(
                originalQuestionId,
            );
            if (!originalQ?.concept_title) return null;

            const chunk = await Repository.getChunkWithContent(chunkId);
            if (!chunk) return null;

            const guidelines = await subjectKnowledgeService.getGuidelines(
                chunk.course_name,
            );
            const cleanContent = PromptArchitect.cleanReferenceImages(
                chunk.display_content || chunk.content,
            );
            const sharedContext = PromptArchitect.buildContext(
                cleanContent,
                chunk.course_name,
                chunk.section_title,
                guidelines,
            );

            const concept: ConceptMapItem = {
                baslik: originalQ.concept_title,
                odak: "Kavram pekiştirme ve tazeleme",
                seviye: "Bilgi",
                gorsel: null,
            };

            const draft = await this.draftingTask.run({
                concept,
                index: 0,
                wordCount: 500,
                courseName: chunk.course_name,
                usageType: "arsiv",
                sharedContextPrompt: sharedContext,
            });

            if (!draft.success || !draft.data) return null;

            const q = draft.data;
            const { error: saveErr } = await Repository.createQuestion({
                chunk_id: chunkId,
                course_id: chunk.course_id,
                section_title: chunk.section_title,
                usage_type: "arsiv",
                bloom_level: q.bloomLevel || "knowledge",
                question_data: {
                    q: q.q,
                    o: q.o,
                    a: q.a,
                    exp: q.exp,
                    img: q.img,
                    evidence: q.evidence,
                    diagnosis: q.diagnosis,
                    insight: q.insight,
                },
                concept_title: concept.baslik,
            });

            if (saveErr) return null;

            const saved = await Repository.fetchGeneratedQuestions(
                chunkId,
                "arsiv",
                1,
            );
            return saved?.[0]?.id || null;
        } catch (e) {
            console.error("Archive Refresh Error:", e);
            return null;
        }
    }
}
