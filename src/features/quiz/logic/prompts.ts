import {
  CATEGORY_MAPPINGS,
  DEFAULT_CATEGORY,
} from '@/features/courses/utils/constants';
import {
  type ConceptMapItem,
  type GeneratedQuestion,
  type Message,
  toTurkishBloomLevel,
} from '../types';

/** Uygulama genelindeki yapay zeka sistem talimatı */
export const GLOBAL_AI_SYSTEM_PROMPT =
  'Uzman KPSS Eğitmeni: Akademik dille, KPSS müfredatına ve soru formatına %100 uygun soru yaz. SADECE JSON formatında çıktı ver. Ek metin veya yorum ekleme.';

/** Doğrulama (validation) aşaması için özel sistem talimatı */
export const VALIDATION_SYSTEM_PROMPT =
  'Uzman Editörü: Soruları bilimsel doğruluk ve KPSS formatıyla denetle. Hatalıysa REDDET ve kısa revizyon notu ekle.';

/** Genel kalite ve yazım kuralları */
export const GENERAL_QUALITY_RULES = `## KURALLAR:
1. Akademik dil kullan, KPSS formatına uy.
2. Sadece metne bağlı kal veya metinden türet.
3. 5 şık (A-E) üret, çeldiriciler güçlü olsun.
4. Matematiksel ifade varsa LaTeX kullan ve \\\\ karakterini çiftleyin.`;

/** Bloom seviyeleri için özel talimatlar */
export const BLOOM_INSTRUCTIONS: Record<string, string> = {
  Bilgi:
    'Temel kavramları, tanımları ve olguları sorgula. Hatırlamaya dayalı olsun.',
  Uygulama:
    'Kavramları yeni bir durumda kullanmayı, hesaplama yapmayı veya kuralları işletmeyi sorgula.',
  Analiz:
    'Parçalar arasındaki ilişkileri, yapıyı veya karmaşık senaryoların arka planını sorgula.',
};

/**
 * Prompt yönetimi için merkezi mimari sınıfı.
 */
export class PromptArchitect {
  /**
   * Mesajları birleştirerek LLM için final payload hazırlar.
   */
  static assemble(
    systemPrompt: string,
    contextPrompt: string,
    taskPrompt: string
  ): Message[] {
    return [
      { role: 'system', content: systemPrompt.trim() },
      {
        role: 'user',
        content: `${contextPrompt.trim()}\n\n--- GÖREV ---\n${taskPrompt.trim()}`,
      },
    ];
  }

  /**
   * AI'ya referans metin ve bağlam sunar.
   */
  static buildContext(
    content: string,
    courseName?: string,
    sectionTitle?: string,
    extraInfo?: string
  ): string {
    const parts: string[] = [];
    if (courseName) parts.push(`## DERS: ${courseName}`);
    if (sectionTitle) parts.push(`## KONU: ${sectionTitle}`);
    parts.push(GENERAL_QUALITY_RULES);
    parts.push('## BAĞLAM METNİ:');
    parts.push(content);
    if (extraInfo) parts.push(`\n## EK BİLGİ:\n${extraInfo}`);
    return parts.join('\n\n');
  }

  /**
   * Metindeki görsel referanslarını temizler.
   */
  static cleanReferenceImages(content: string): string {
    return content.replace(/!\[[^\]]*\]\([^)]+\)/g, '[GÖRSEL]').trim();
  }

  /** Analiz prompt builder proxy */
  static analysisPrompt = buildAnalysisPrompt;
  /** Soru üretim prompt builder proxy */
  static draftingPrompt = buildDraftingPrompt;
  /** Doğrulama prompt builder proxy */
  static batchValidationPrompt = buildBatchValidationPrompt;
}

/**
 * İçerik analizi için prompt oluşturur.
 */
export function buildAnalysisPrompt(
  sectionTitle: string,
  courseName: string,
  importance: string = 'medium'
): string {
  const category = CATEGORY_MAPPINGS[courseName] || DEFAULT_CATEGORY;
  return `### GÖREV: KAVRAM HARİTASI OLUŞTURMA
Ders: ${courseName}
Bölüm: ${sectionTitle}
Kategori: ${category}
Önem: ${importance}

Yukarıdaki metinden en kritik öğrenme noktalarını analiz et ve bir kavram haritası oluştur.
Her kavram için başlık, odak noktası ve zorluk seviyesi (Bilgi, Uygulama, Analiz) belirle.

### ZORUNLU JSON FORMATI
Yanıtını aşağıdaki şemaya BİREBİR uygun, geçerli bir JSON objesi olarak döndür. Markdown etiketi (\`\`\`json) kullanma.
{
  "difficulty_index": <1-5 arası tam sayı, metnin bilişsel zorluk endeksi>,
  "concepts": [
    {
      "baslik": "<kavramın kısa başlığı>",
      "odak": "<bu kavramın öğrenme odak noktası>",
      "seviye": "Bilgi | Uygulama | Analiz",
      "gorsel": null,
      "isException": false,
      "prerequisites": []
    }
  ]
}`;
}

/**
 * Soru üretimi için prompt oluşturur.
 */
export function buildDraftingPrompt(
  concepts: ConceptMapItem[],
  strategy: { bloomLevel: string; instruction: string },
  usageType: 'antrenman' | 'deneme' = 'antrenman',
  previousDiagnoses?: string[],
  courseName: string = '',
  conceptStrategies?: Array<{
    baslik: string;
    bloomLevel: string;
    instruction: string;
    focus?: string;
  }>
): string {
  const conceptTitles = concepts
    .map((conceptItem) => conceptItem.baslik)
    .join(', ');
  const strategyBlock =
    conceptStrategies && conceptStrategies.length > 0
      ? `\nKAVRAM BAZLI ÜRETİM PLANI:
${conceptStrategies
  .map(
    (item, index) =>
      `${index + 1}. ${item.baslik} | seviye=${toTurkishBloomLevel(
        item.bloomLevel as 'knowledge' | 'application' | 'analysis'
      )} | odak=${item.focus || 'genel'} | talimat=${item.instruction}`
  )
  .join('\n')}

Çoklu üretimde soruları yukarıdaki sıra ile üret. Her soru listedeki ilgili kavramın seviye ve talimatına uysun.`
      : '';
  return `### GÖREV: SORU ÜRETİMİ
Ders: ${courseName}
Tür: ${usageType}
Seviye: ${toTurkishBloomLevel(
    strategy.bloomLevel as 'knowledge' | 'application' | 'analysis'
  )}
Kavramlar: ${conceptTitles}

Talimat: ${strategy.instruction}
- Soru kökü açık ve net olmalıdır.
- 5 seçenek üret (harf ekleme).
- Akademik bir dil kullan.
${
  previousDiagnoses?.length
    ? `\nZAYIF NOKTALAR: ${previousDiagnoses.join(', ')}`
    : ''
}
${strategyBlock}

### ZORUNLU JSON FORMATI
Yanıtını aşağıdaki şemaya BİREBİR uygun, geçerli bir JSON objesi olarak döndür. Markdown etiketi kullanma.
{
  "q": "<soru metni>",
  "o": ["<A seçeneği>", "<B seçeneği>", "<C seçeneği>", "<D seçeneği>", "<E seçeneği>"],
  "a": <doğru cevabın 0-4 arası indeksi>,
  "exp": "<doğru cevabın açıklaması>",
  "evidence": "<metinden dayanak cümlesi>",
  "diagnosis": "<öğrencinin olası hata noktası/nedeni>",
  "insight": "<kavramsal çıkarım/mentor notu>"
}`;
}

/**
 * Toplu doğrulama işlemi için prompt oluşturur.
 */
export function buildBatchValidationPrompt(
  questions: GeneratedQuestion[]
): string {
  const questionList = questions
    .map(
      (question, index) =>
        `### Soru ${index}:\n${JSON.stringify(
          {
            q: question.q,
            o: question.o,
            a: question.a,
            exp: question.exp,
            evidence: question.evidence || '',
            diagnosis: question.diagnosis || '',
            insight: question.insight || '',
          },
          null,
          2
        )}`
    )
    .join('\n\n');

  return `### GÖREV: SORU DENETİMİ
Sana verilen ${questions.length} soruyu; bilimsel doğruluk ve format açısından denetle.
Hatalı olanları REDDET ve revizyon önerisi sun.
Özellikle şu alanları denetle: doğru cevap-açıklama tutarlılığı, seçenek kalitesi, evidence alanının metne dayanması, diagnosis ve insight alanlarının boş/uydurma olmaması.

${questionList}

### ZORUNLU JSON FORMATI
Yanıtını aşağıdaki şemaya BİREBİR uygun, geçerli bir JSON objesi olarak döndür. Markdown etiketi kullanma.
{
  "results": [
    {
      "index": <soru indeksi (0'dan başlar)>,
      "total_score": <0-100 arası toplam puan>,
      "decision": "APPROVED" veya "REJECTED",
      "critical_faults": ["<varsa hata açıklaması>"],
      "improvement_suggestion": "<iyileştirme önerisi>"
    }
  ]
}`;
}

/**
 * Takip (follow-up) soruları için prompt oluşturur.
 */
export function buildFollowUpPrompt(
  evidence: string,
  question: GeneratedQuestion,
  selectedAnswer: number,
  correctAnswer: number,
  bloomLevel: string,
  previousDiagnoses: string[]
): string {
  return `### GÖREV: TAKİP SORUSU ÜRETİMİ
Orijinal Soru: ${question.q}
Verilen Cevap: ${question.o[selectedAnswer] || 'Boş'}
Doğru Cevap: ${question.o[correctAnswer]}
Dayanak Metni: ${evidence}

Kullanıcı bu soruyu yanlış cevapladı. Yanlış anladığı noktayı veya kavram karmaşasını gidermek için yeni bir soru üret.
Seviye: ${toTurkishBloomLevel(
    bloomLevel as 'knowledge' | 'application' | 'analysis'
  )}
${
  previousDiagnoses.length
    ? `Geçmiş Teşhisler: ${previousDiagnoses.join(', ')}`
    : ''
}

### ZORUNLU JSON FORMATI
Yanıtını aşağıdaki şemaya BİREBİR uygun, geçerli bir JSON objesi olarak döndür. Markdown etiketi kullanma.
{
  "q": "<yeni takip sorusu metni>",
  "o": ["<A seçeneği>", "<B seçeneği>", "<C seçeneği>", "<D seçeneği>", "<E seçeneği>"],
  "a": <doğru cevabın 0-4 arası indeksi>,
  "exp": "<doğru cevabın açıklaması>",
  "evidence": "<metinden dayanak cümlesi>",
  "diagnosis": "<kullanıcının orijinal sorudaki hatasının teknik teşhisi>",
  "insight": "<bu kavramı pekiştirecek mentor notu>"
}`;
}
