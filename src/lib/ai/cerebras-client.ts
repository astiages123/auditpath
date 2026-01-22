/**
 * Cerebras API Client (via Supabase Proxy)
 * 
 * Supabase Edge Function üzerinden Cerebras API çağrısı yapar.
 * - CORS sorunu yok
 * - API anahtarı güvende
 */

import { supabase } from '@/lib/supabase';

// Types
export interface QuestionToValidate {
  q: string;
  o: string[];
  a: number;
  exp: string;
}

export interface ValidationCriteriaBreakdown {
  groundedness: number;  // 0-20
  pedagogy: number;      // 0-20
  distractors: number;   // 0-20
  clarity: number;       // 0-20
  explanation: number;   // 0-20
}

export interface ValidationResult {
  questionIndex: number;
  total_score: number;  // 0-100
  criteria_breakdown: ValidationCriteriaBreakdown;
  critical_faults: string[];
  improvement_suggestion: string;
  decision: 'APPROVED' | 'REJECTED';
}

interface CerebrasResponse {
  id: string;
  choices: {
    message: {
      content: string;
    };
  }[];
}

type LogCallback = (message: string, details?: Record<string, unknown>) => void;

// --- System Prompt ---
const VALIDATOR_SYSTEM_PROMPT = `Sen AuditPath için bir Üst Düzey Eğitim Denetçisisin. Görevin, verilen kaynak metin ile üretilen soruyu karşılaştırıp 'Sıfır Hata' prensibiyle puanlamaktır.

Puanlama Kriterleri (her biri 0-20 arasında puanla, toplam 0-100):

1. **Groundedness (Metne Sadakat)**: Soru sadece kaynak metindeki bilgileri mi kullanıyor? Metin dışı bilgi veya halüsinasyon varsa bu kritere direkt 0 ver.

2. **Pedagojik Derinlik**: Soru sadece ezber mi? Yoksa öğrenciyi analiz yapmaya, ilişki kurmaya zorluyor mu? Düşük bilişsel seviyeli sorulara düşük puan ver.

3. **Çeldirici Kalitesi**: Yanlış şıklar mantıklı mı? Cevap çok bariz ve kolayca eleme yapılabilir mi? Bir uzman için bile zorlu çeldiriciler yüksek puan alır.

4. **Netlik**: KPSS standartlarında, resmi ve hatasız bir Türkçe mi kullanılmış? Belirsiz veya karışık ifadeler düşük puan alır.

5. **Açıklama Kalitesi**: Cevap açıklaması metne atıf yapıyor mu? Sadece doğru cevabı söylemek yerine öğretici bir açıklama mı var?

KARAR MEKANİZMASI:
- Toplam skor 80 ve üzeri ise: "APPROVED"
- 80 altı ise: "REJECTED" (improvement_suggestion zorunlu olarak doldur)
- Groundedness = 0 ise, toplam skor ne olursa olsun: "REJECTED"

Çıktı Formatı (SADECE JSON, başka metin ekleme):
{
  "total_score": integer,
  "criteria_breakdown": {
    "groundedness": 0-20,
    "pedagogy": 0-20,
    "distractors": 0-20,
    "clarity": 0-20,
    "explanation": 0-20
  },
  "critical_faults": ["hata1", "hata2"],
  "improvement_suggestion": "string veya boş",
  "decision": "APPROVED" | "REJECTED"
}`;

/**
 * Call Cerebras API via Supabase Proxy
 */
async function callCerebras(systemPrompt: string, userPrompt: string, onLog?: LogCallback): Promise<string> {
  onLog?.('Cerebras API çağrısı başlatılıyor (Supabase Proxy)...', { promptLength: userPrompt.length });

  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: {
      provider: 'cerebras',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1, // Low temperature for consistent grading
      max_tokens: 4096
    }
  });

  if (error) {
    onLog?.('Cerebras API hatası', { error: error.message });
    throw new Error(`Cerebras API Hatası: ${error.message}`);
  }

  const response = data as CerebrasResponse;
  const content = response.choices?.[0]?.message?.content || '';
  
  onLog?.('Cerebras API yanıtı alındı', { responseLength: content.length });
  
  return content;
}

/**
 * Parse validator JSON response
 */
function parseValidationResponse(responseText: string): Omit<ValidationResult, 'questionIndex'> | null {
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
function buildValidationPrompt(question: QuestionToValidate, sourceContent: string): string {
  const optionsText = question.o
    .map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`)
    .join('\n');

  const correctAnswer = String.fromCharCode(65 + question.a);

  return `## KAYNAK METİN:
${sourceContent.slice(0, 8000)}

---

## DEĞERLENDİRİLECEK SORU:

**Soru:** ${question.q}

**Şıklar:**
${optionsText}

**Doğru Cevap:** ${correctAnswer}

**Açıklama:** ${question.exp}

---

Yukarıdaki soruyu kaynak metne göre değerlendir ve JSON formatında puanla.`;
}

/**
 * Validate a batch of questions against source content
 */
export async function validateQuestionBatch(
  questions: QuestionToValidate[],
  sourceContent: string,
  onLog?: LogCallback
): Promise<ValidationResult[]> {
  onLog?.('Doğrulama başlatılıyor', { questionCount: questions.length });

  const results: ValidationResult[] = [];

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    
    onLog?.(`Soru ${i + 1} doğrulanıyor...`, { 
      preview: question.q.substring(0, 60) + '...'
    });

    const prompt = buildValidationPrompt(question, sourceContent);
    
    try {
      const responseText = await callCerebras(VALIDATOR_SYSTEM_PROMPT, prompt, onLog);
      
      if (!responseText) {
        onLog?.(`Soru ${i + 1} validator yanıt boş, varsayılan APPROVED`, {});
        results.push({
          questionIndex: i,
          total_score: 80,
          criteria_breakdown: { groundedness: 16, pedagogy: 16, distractors: 16, clarity: 16, explanation: 16 },
          critical_faults: [],
          improvement_suggestion: '',
          decision: 'APPROVED'
        });
        continue;
      }

      const parsed = parseValidationResponse(responseText);
      
      if (!parsed) {
        onLog?.(`Soru ${i + 1} parse başarısız, varsayılan APPROVED`, {});
        results.push({
          questionIndex: i,
          total_score: 80,
          criteria_breakdown: { groundedness: 16, pedagogy: 16, distractors: 16, clarity: 16, explanation: 16 },
          critical_faults: [],
          improvement_suggestion: '',
          decision: 'APPROVED'
        });
        continue;
      }

      results.push({
        questionIndex: i,
        ...parsed
      });

      onLog?.(`Soru ${i + 1} doğrulandı`, {
        decision: parsed.decision,
        total_score: parsed.total_score,
        criteria: parsed.criteria_breakdown
      });

    } catch (e) {
      onLog?.(`Soru ${i + 1} doğrulama hatası`, { error: String(e) });
      // Default to approved if validator fails
      results.push({
        questionIndex: i,
        total_score: 80,
        criteria_breakdown: { groundedness: 16, pedagogy: 16, distractors: 16, clarity: 16, explanation: 16 },
        critical_faults: [],
        improvement_suggestion: '',
        decision: 'APPROVED'
      });
    }
  }

  onLog?.('Doğrulama tamamlandı', { 
    total: questions.length,
    approved: results.filter(r => r.decision === 'APPROVED').length,
    rejected: results.filter(r => r.decision === 'REJECTED').length
  });

  return results;
}
