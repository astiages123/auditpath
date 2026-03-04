import {
  CATEGORY_MAPPINGS,
  DEFAULT_CATEGORY,
} from '@/features/courses/utils/constants';
import {
  type ConceptMapItem,
  type GeneratedQuestion,
  type Message,
} from '../types';

// === SECTION: Global AI Personality & Rules ===

/** Uygulama genelindeki yapay zeka sistem talimatı */
export const GLOBAL_AI_SYSTEM_PROMPT =
  'Sen KPSS formatında, akademik dille soru yazan uzman bir yapay zekasın. SADECE JSON formatında çıktı ver. Cevabın dışında hiçbir metin, yorum veya markdown karakteri bulunmamalıdır.';

/** Doğrulama (validation) aşaması için özel sistem talimatı */
export const VALIDATION_SYSTEM_PROMPT = `
Sen titiz bir editör ve denetçisin. 
Sana verilen soruları; bilimsel doğruluk, anlatım bozukluğu, kurgu hatası ve çeldirici kalitesi açısından denetlersin.
Eğer bir soru hatalıysa, neden hatalı olduğunu açıklar ve revizyon önerisi sunarsın.
`;

/** Genel kalite ve yazım kuralları */
export const GENERAL_QUALITY_RULES = `## GENEL KALİTE KURALLARI:
1. **Akademik Dil:** Soru kökü ve şıklar resmi, akademik ve sınav formatına (KPSS) uygun olmalıdır.
2. **Kapsam:** Metnin dışına çıkma, ancak metindeki bilgiyi farklı bir bağlamda veya örnekle sorgulayabilirsin.
3. **Çeldiriciler:** Çeldiricilerin en az ikisi, metindeki diğer kavramlarla doğrudan ilişkili ama sorulan odak noktasıyla çelişen ifadeler olmalıdır.
4. **Şık Yapısı:** Her zaman tam 5 adet (A,B,C,D,E) seçenek olmalıdır. Harf eklemeyin.
5. **JSON GÜVENLİĞİ:** LaTeX komutlarında ters eğik çizgi (\\\\) karakterini KESİNLİKLE çiftle.`;

/** Bloom seviyeleri için özel talimatlar */
export const BLOOM_INSTRUCTIONS: Record<string, string> = {
  Bilgi:
    'Temel kavramları, tanımları ve olguları sorgula. Hatırlamaya dayalı olsun.',
  Uygulama:
    'Kavramları yeni bir durumda kullanmayı, hesaplama yapmayı veya kuralları işletmeyi sorgula.',
  Analiz:
    'Parçalar arasındaki ilişkileri, yapıyı veya karmaşık senaryoların arka planını sorgula.',
};

// === SECTION: Prompt Architect Class ===

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

// === SECTION: Dynamic Prompt Builders ===

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
  courseName: string = ''
): string {
  const conceptTitles = concepts.map((c) => c.baslik).join(', ');
  return `### GÖREV: SORU ÜRETİMİ
Ders: ${courseName}
Tür: ${usageType}
Seviye: ${strategy.bloomLevel}
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

### ZORUNLU JSON FORMATI
Yanıtını aşağıdaki şemaya BİREBİR uygun, geçerli bir JSON objesi olarak döndür. Markdown etiketi kullanma.
{
  "q": "<soru metni>",
  "o": ["<A seçeneği>", "<B seçeneği>", "<C seçeneği>", "<D seçeneği>", "<E seçeneği>"],
  "a": <doğru cevabın 0-4 arası indeksi>,
  "exp": "<doğru cevabın açıklaması>",
  "evidence": "<metinden dayanak cümlesi>",
  "diagnosis": "<öğrencinin olası hata noktası>",
  "insight": "<kavramsal çıkarım notu>"
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
      (q, i) =>
        `### Soru ${i}:\n${JSON.stringify(
          { q: q.q, o: q.o, a: q.a, exp: q.exp },
          null,
          2
        )}`
    )
    .join('\n\n');

  return `### GÖREV: SORU DENETİMİ
Sana verilen ${questions.length} soruyu; bilimsel doğruluk ve format açısından denetle.
Hatalı olanları REDDET ve revizyon önerisi sun.

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
  _context: string,
  previousDiagnoses: string[]
): string {
  return `### GÖREV: TAKİP SORUSU ÜRETİMİ
Orijinal Soru: ${question.q}
Verilen Cevap: ${question.o[selectedAnswer] || 'Boş'}
Doğru Cevap: ${question.o[correctAnswer]}
Dayanak Metni: ${evidence}

Kullanıcı bu soruyu yanlış cevapladı. Yanlış anladığı noktayı veya kavram karmaşasını gidermek için yeni bir soru üret.
Seviye: ${bloomLevel}
${
  previousDiagnoses.length
    ? `Geçmiş Teşhisler: ${previousDiagnoses.join(', ')}`
    : ''
}

SADECE JSON döndür.`;
}
