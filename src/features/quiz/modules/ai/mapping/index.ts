import { z } from "zod";
import { callMiMo, type LogCallback, parseJsonResponse } from "../clients/mimo";
import { PromptArchitect } from "../prompt-architect";

// Zod Schema Definition
const ConceptMapSchema = z.object({
  baslik: z.string(),
  odak: z.string().describe("15 kelimeyi geçmeyen öğrenme kazanımı"),
  seviye: z.enum(["Bilgi", "Uygulama", "Analiz"]),
  gorsel: z.string().nullable(),
  altText: z.string().describe("Görselin teknik açıklaması").nullable()
    .optional(),
  prerequisites: z.array(z.string()).describe(
    "Bu kavramı anlamak için bilinmesi gereken önceki kavramlar (varsa)",
  ),
  isException: z.boolean().optional().describe(
    "Eğer kavram bir istisna durumunu belirtiyorsa true",
  ),
  questionVariations: z.array(z.object({
    type: z.enum(["Bilgi", "Uygulama", "Analiz"]),
    description: z.string().describe("Soru varyasyonunun kurgusu"),
  })).length(3).describe("Bu kavram için üretilecek 3 farklı soru tipi planı"),
});

const ConceptMapResponseSchema = z.object({
  density_score: z.number().min(1).max(5).describe(
    "Metnin yoğunluk skoru (1: Basit, 5: Çok Ağır Doktrin)",
  ),
  concepts: z.array(ConceptMapSchema),
});

export type ConceptMapItem = z.infer<typeof ConceptMapSchema>;

export interface ConceptMapResult {
  concepts: ConceptMapItem[];
  density_score: number;
}

/**
 * Calculates dynamic target concept count based on word count
 * Formula: modernized for KPSS A Group intensity
 */
function calculateTargetCount(wordCount: number): number {
  // Updated Formula: sqrt(Word Count / 3)
  // ~300 words -> 10 items
  // ~1000 words -> 18 items
  // ~2700+ words -> 30 items (max)
  const calculated = Math.floor(Math.sqrt(wordCount / 3));
  // Min 5, Max 30
  return Math.min(30, Math.max(5, calculated));
}

/**
 * Generate concept map from content
 */
export async function generateConceptMap(
  content: string,
  wordCount: number,
  onLog?: LogCallback,
): Promise<ConceptMapResult> {
  const targetCount = calculateTargetCount(wordCount);

  onLog?.("Kavram haritası oluşturuluyor", { wordCount, targetCount });

  const systemPrompt = `Sen Uzman bir Eğitim İçerik Analistisin (KPSS A Grubu). 
Görevin: Metni analiz ederek soru üretimine uygun ${targetCount} adet ana durak (kavram) belirlemektir. Ayrıca metnin "Bilişsel Yoğunluk Skorunu" (1-5) hesaplamalısın.

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
8. **Prerequisites (Ön Koşullar):** Her kavram için, o kavramın anlaşılması için gereken "önceki" kavramları 'prerequisites' listesine ekle. Eğer yoksa boş liste döndür.
9. **Soru Varyasyon Planlaması:** Her bir mapping target (kavram) için tek bir soru kökü değil, 3 farklı varyasyon oluşturacak şekilde planlama yap:
   - Varyasyon 1 (Bilgi/Tanım): Kavramın doğrudan tanımını veya temel özelliğini sorgula.
   - Varyasyon 2 (Uygulama/Senaryo): "X durumu gerçekleşirse..." veya "Y şahsı şu işlemi yaparsa..." gibi KPSS formatına uygun bir vaka (case study) kurgula.
   - Varyasyon 3 (Analiz/Negatif): "Hangisi ... değildir?" veya "Hangisi yanlıştır?" diyerek çeldiricilerin gücünü test et.

**Density Score (Yoğunluk Skoru) Kılavuzu:**
- 1: Giriş seviyesi, basit anlatım, hikaye tarzı (Örn: Tarih giriş)
- 3: Standart mevzuat veya konu anlatımı (Örn: Anayasa maddeleri)
- 5: Ağır doktrin, İcra-İflas gibi teknik ve karmaşık süreçler, yoğun Latince veya eski Türkçe terimler.

Çıktı Formatı:
Sadece saf JSON objesi döndür. Markdown bloğu (\`\`\`) veya giriş cümlesi ekleme.
{
  "density_score": 1, // 1-5 arası tam sayı
  "concepts": [
    { 
      "baslik": "Konu Başlığı", 
      "odak": "Öğrenci bu bölümde neyi kavrayacak?", 
      "seviye": "Bilgi", 
      "isException": false,
      "prerequisites": ["Ön koşul 1", "Ön koşul 2"],
      "gorsel": "image3.webp",
      "altText": "Görsel açıklaması...",
      "questionVariations": [
        { "type": "Bilgi", "description": "Konunun temel tanımı sorulacak." },
        { "type": "Uygulama", "description": "Örnek bir vaka üzerinden sorulacak." },
        { "type": "Analiz", "description": "Hangisi yanlıştır formatında sorulacak." }
      ]
    }
  ]
}`;

  // Temperature 0.2 for more deterministic and structured output
  const contextPrompt = PromptArchitect.buildContext(
    // AI'a görsel URL'lerini gönderme - sadece metin içeriği
    content.replace(/!\[[^\]]*\]\([^)]+\)/g, "[GÖRSEL]"),
  );
  const messages = PromptArchitect.assemble(
    systemPrompt,
    contextPrompt,
    "Lütfen kavram haritasını ve yoğunluk skorunu oluştur.",
  );

  const response = await callMiMo(messages, 0.2, onLog);

  const rawData = parseJsonResponse(response.content, "object");

  // Runtime Validation with Zod
  const validationResult = ConceptMapResponseSchema.safeParse(rawData);

  if (validationResult.success) {
    const data = validationResult.data;
    onLog?.("Kavram haritası oluşturuldu", {
      conceptCount: data.concepts.length,
      densityScore: data.density_score,
      concepts: data.concepts.map((c) => c.baslik),
    });
    return {
      concepts: data.concepts,
      density_score: data.density_score,
    };
  }

  onLog?.("Kavram haritası doğrulama hatası", {
    error: validationResult.error,
  });

  // Fallback return
  return {
    concepts: [],
    density_score: 3, // Default medium
  };
}
