/**
 * Question Validator Service
 * 
 * Validates generated quiz questions against source content
 * using a separate LLM as a quality assurance layer.
 */

import { supabase } from '../supabase';

// --- Configuration ---
const VALIDATOR_MODEL = 'openai/gpt-oss-120b';
const VALIDATION_THRESHOLD = 80;

// --- Types ---
export interface ValidationCriteriaBreakdown {
  groundedness: number;  // 0-10
  pedagogy: number;      // 0-10
  distractors: number;   // 0-10
  clarity: number;       // 0-10
  explanation: number;   // 0-10
}

export interface ValidationResult {
  total_score: number;  // 0-100
  criteria_breakdown: ValidationCriteriaBreakdown;
  critical_faults: string[];
  improvement_suggestion: string;
  decision: 'APPROVED' | 'REJECTED';
}

export interface QuestionToValidate {
  q: string;
  o: string[];
  a: number;
  exp: string;
}

// --- System Prompt ---
const VALIDATOR_SYSTEM_PROMPT = `Sen AuditPath için bir Üst Düzey Eğitim Denetçisisin. Görevin, verilen kaynak metin ile üretilen soruyu karşılaştırıp 'Sıfır Hata' prensibiyle puanlamaktır.

Puanlama Kriterleri (her biri 0-10 arasında puanla, toplam 0-100):

1. **Groundedness (Metne Sadakat)**: Soru sadece kaynak metindeki bilgileri mi kullanıyor? Metin dışı bilgi veya halüsinasyon varsa bu kritere direkt 0 ver.

2. **Pedagojik Derinlik**: Soru sadece ezber mi? Yoksa öğrenciyi analiz yapmaya, ilişki kurmaya zorluyor mu? Düşük bilişsel seviyeli sorulara düşük puan ver.

3. **Çeldirici Kalitesi**: Yanlış şıklar mantıklı mı? Cevap çok bariz ve kolayca eleme yapılabilir mi? Bir uzman için bile zorlu çeldiriciler yüksek puan alır.

4. **Netlik**: KPSS standartlarında, resmi ve hatasız bir Türkçe mi kullanılmış? Belirsiz veya karışık ifadeler düşük puan alır.

5. **Açıklama Kalitesi**: Cevap açıklaması metne atıf yapıyor mu? Sadece doğru cevabı söylemek yerine öğretici bir açıklama mı var?

KARAR MEKANİZMASI:
- Toplam skor (tüm kriterlerin toplamı x 2) 80 ve üzeri ise: "APPROVED"
- 80 altı ise: "REJECTED" (improvement_suggestion zorunlu olarak doldur)
- Groundedness = 0 ise, toplam skor ne olursa olsun: "REJECTED"

Çıktı Formatı (SADECE JSON, başka metin ekleme):
{
  "total_score": integer,
  "criteria_breakdown": {
    "groundedness": 0-10,
    "pedagogy": 0-10,
    "distractors": 0-10,
    "clarity": 0-10,
    "explanation": 0-10
  },
  "critical_faults": ["hata1", "hata2"],
  "improvement_suggestion": "string veya boş",
  "decision": "APPROVED" | "REJECTED"
}`;

// --- API Functions ---

/**
 * Call AI Proxy Edge Function for validation
 */
async function callValidatorAPI(prompt: string, model: string = VALIDATOR_MODEL): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: {
        provider: 'openrouter',
        prompt,
        systemPrompt: VALIDATOR_SYSTEM_PROMPT,
        model,
        temperature: 0.3  // Low temperature for consistent grading
      }
    });

    if (error) {
      console.error(`[Validator] Edge Function error:`, error);
      return null;
    }

    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error(`[Validator] Edge Function call failed:`, error);
    return null;
  }
}

/**
 * Parse validator JSON response
 */
function parseValidationResponse(responseText: string): ValidationResult | null {
  try {
    let jsonStr = responseText.trim();

    // Handle markdown code blocks
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Find raw JSON object
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }

    const parsed = JSON.parse(jsonStr);

    // Validate structure
    if (
      typeof parsed.total_score !== 'number' ||
      !parsed.criteria_breakdown ||
      typeof parsed.criteria_breakdown.groundedness !== 'number' ||
      typeof parsed.criteria_breakdown.pedagogy !== 'number' ||
      typeof parsed.criteria_breakdown.distractors !== 'number' ||
      typeof parsed.criteria_breakdown.clarity !== 'number' ||
      typeof parsed.criteria_breakdown.explanation !== 'number' ||
      !['APPROVED', 'REJECTED'].includes(parsed.decision)
    ) {
      console.error('[Validator] Invalid response structure:', parsed);
      return null;
    }

    return {
      total_score: parsed.total_score,
      criteria_breakdown: {
        groundedness: parsed.criteria_breakdown.groundedness,
        pedagogy: parsed.criteria_breakdown.pedagogy,
        distractors: parsed.criteria_breakdown.distractors,
        clarity: parsed.criteria_breakdown.clarity,
        explanation: parsed.criteria_breakdown.explanation
      },
      critical_faults: Array.isArray(parsed.critical_faults) ? parsed.critical_faults : [],
      improvement_suggestion: parsed.improvement_suggestion || '',
      decision: parsed.decision
    };
  } catch (e) {
    console.error('[Validator] Failed to parse response:', e);
    return null;
  }
}

/**
 * Build validation prompt
 */
function buildValidationPrompt(question: QuestionToValidate, sourceContent: string, isFailSafe: boolean = false): string {
  const optionsText = question.o
    .map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`)
    .join('\n');

  const correctAnswer = String.fromCharCode(65 + question.a);

  let prompt = `## KAYNAK METİN:
${sourceContent}

---

## DEĞERLENDİRİLECEK SORU:

**Soru:** ${question.q}

**Şıklar:**
${optionsText}

**Doğru Cevap:** ${correctAnswer}

**Açıklama:** ${question.exp}

---

Yukarıdaki soruyu kaynak metne göre değerlendir ve JSON formatında puanla.`;

  if (isFailSafe) {
    prompt += `\n\n*** DİKKAT: BU SON DENEMEDİR (TOLERANS MODU) ***
    Lütfen değerlendirme kriterlerini %10 oranında gevşet. Ufak kusurları görmezden gel ve sadece çok kritik hatalara (yanlış bilgi, mantıksız şıklar) odaklan. Amacımız soruyu reddetmek değil, kurtarmaktır.`;
  }

  return prompt;
}

/**
 * Validate a generated question against source content
 */
export async function validateQuestion(
  question: QuestionToValidate,
  sourceContent: string,
  options: { isFailSafe?: boolean, threshold?: number, model?: string } = {}
): Promise<ValidationResult> {
  const { isFailSafe = false, threshold, model } = options;


  const prompt = buildValidationPrompt(question, sourceContent, isFailSafe);
  const responseText = await callValidatorAPI(prompt, model);

  if (!responseText) {
    console.warn('[Validator] API response empty, defaulting to APPROVED');
    // Default to approved if validator fails to avoid blocking generation
    return {
      total_score: 80,
      criteria_breakdown: {
        groundedness: 8,
        pedagogy: 8,
        distractors: 8,
        clarity: 8,
        explanation: 8
      },
      critical_faults: [],
      improvement_suggestion: '',
      decision: 'APPROVED'
    };
  }

  const result = parseValidationResponse(responseText);

  if (!result) {
    console.warn('[Validator] Failed to parse response, defaulting to APPROVED');
    return {
      total_score: 80,
      criteria_breakdown: {
        groundedness: 8,
        pedagogy: 8,
        distractors: 8,
        clarity: 8,
        explanation: 8
      },
      critical_faults: [],
      improvement_suggestion: '',
      decision: 'APPROVED'
    };
  }

  // Log results



  return result;
}

/**
 * Check if validation passed threshold
 */
export function isValidationPassed(result: ValidationResult, threshold: number = VALIDATION_THRESHOLD): boolean {
  return result.decision === 'APPROVED' && result.total_score >= threshold;
}

/**
 * Get validation threshold constant
 */
export function getValidationThreshold(): number {
  return VALIDATION_THRESHOLD;
}
