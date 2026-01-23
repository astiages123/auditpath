import { callMiMo, parseJsonResponse, type LogCallback } from '../clients/mimo';

export interface ConceptMapItem {
  baslik: string;
  odak: string;
  seviye: 'Bilgi' | 'Uygulama' | 'Analiz';
  gorsel?: string | null;
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
