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
});

export type ConceptMapItem = z.infer<typeof ConceptMapSchema>;

/**
 * Calculates dynamic target concept count based on word count
 * Formula: significantly reduced scale for better focus
 */
function calculateTargetCount(wordCount: number): number {
  // Logarithmic/Square root based scaling
  // ~200 words -> 5 items
  // ~1000 words -> 11 items
  // ~3000+ words -> 15 items (max)
  const calculated = Math.floor(Math.sqrt(wordCount / 8));
  return Math.min(15, Math.max(3, calculated));
}

/**
 * Generate concept map from content
 */
export async function generateConceptMap(
  content: string,
  wordCount: number,
  onLog?: LogCallback,
): Promise<ConceptMapItem[]> {
  const targetCount = calculateTargetCount(wordCount);

  onLog?.("Kavram haritası oluşturuluyor", { wordCount, targetCount });

  const systemPrompt = `Sen Uzman bir Eğitim İçerik Analistisin. 
Görevin: Metni analiz ederek soru üretimine uygun ${targetCount} adet ana durak (kavram) belirlemektir.

Kurallar:
1. Metnin baş, orta ve son kısımlarından dengeli bir konu dağılımı yap.
2. Belirlenen kavramlar anlamsal olarak birbirini kapsamamalı (overlap olmamalı), metnin farklı ve bağımsız bölümlerini temsil eden 'ana duraklar' niteliğinde olmalıdır.
3. 'seviye' alanını şu tanımlara göre belirle:
   - 'Bilgi': Tanım, kavram ve temel olgular.
   - 'Uygulama': Süreçler, yöntemler ve nasıl yapılır bilgisi.
   - 'Analiz': Neden-sonuç ilişkileri, kıyaslama ve çıkarımlar.
4. 'odak' alanı 15 kelimeyi geçmemeli ve net bir öğrenme kazanımı belirtmelidir.
5. Görsel Analizi: Çıktıdaki her objede 'gorsel' anahtarı mutlaka bulunmalıdır. Eğer ilgili görsel yoksa değeri kesinlikle null olmalıdır; anahtarı (key) asla silme veya atlama.
6. Görsel varsa 'altText' alanına görselin teknik açıklamasını ekle.
7. Metnin tamamını analiz et ve hiçbir önemli bölümü atlama.

Çıktı Formatı:
Sadece saf JSON dizisi döndür. Markdown bloğu (\`\`\`) veya giriş cümlesi ekleme.
Cevabın dışında hiçbir metin, yorum veya markdown karakteri bulunmamalıdır.

Örnek Şema:
[
  { 
    "baslik": "Konu Başlığı", 
    "odak": "Öğrenci bu bölümde neyi kavrayacak?", 
    "seviye": "Bilgi", 
    "gorsel": "image3.webp",
    "altText": "Görsel açıklaması..."
  }
]`;

  // Temperature 0.2 for more deterministic and structured output
  const contextPrompt = PromptArchitect.buildContext(
    // AI'a görsel URL'lerini gönderme - sadece metin içeriği
    content.replace(/!\[[^\]]*\]\([^)]+\)/g, "[GÖRSEL]"),
  );
  const messages = PromptArchitect.assemble(
    systemPrompt,
    contextPrompt,
    "Lütfen kavram haritasını oluştur.",
  );

  const response = await callMiMo(messages, 0.2, onLog);

  const rawData = parseJsonResponse(response.content, "array");

  // Runtime Validation with Zod
  const validationResult = z.array(ConceptMapSchema).safeParse(rawData);

  if (validationResult.success) {
    const concepts = validationResult.data;
    onLog?.("Kavram haritası oluşturuldu", {
      conceptCount: concepts.length,
      concepts: concepts.map((c) => c.baslik),
    });
    return concepts;
  }

  onLog?.("Kavram haritası doğrulama hatası", {
    error: validationResult.error,
  });
  return [];
}
