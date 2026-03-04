/**
 * LLM yanıtından JSON verisini temizler ve parse eder.
 * @param text - LLM'den gelen ham metin
 * @param type - Beklenen veri tipi ('object' | 'array')
 * @returns Parse edilmiş veri veya null
 */
export function parseJsonResponse(
  text: string | null | undefined,
  type: 'object' | 'array'
): unknown {
  if (!text) return null;

  try {
    // 0. <think> bloklarını temizle
    let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // 1. Gereksiz markdown karakterlerini temizle
    cleanText = cleanText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');

    // 2. LaTeX backslash (\) karakterlerini kaçış karakterine çevirir
    // Bu adım JSON.parse öncesi yapılmalı ki \f gibi karakterler bozulmasın
    cleanText = cleanText.replace(/\\/g, '\\\\');

    // 3. Basit bir JSON bulma (ilk { veya [ ile son } veya ] arası)
    const firstBrace = cleanText.indexOf(type === 'object' ? '{' : '[');
    let lastBrace = cleanText.lastIndexOf(type === 'object' ? '}' : ']');

    if (firstBrace === -1) {
      throw new Error('JSON structure not found in text');
    }

    // Eğer lastBrace yoksa (truncated), olabildiğince al
    if (lastBrace === -1) {
      lastBrace = cleanText.length - 1;
    }

    cleanText = cleanText.slice(firstBrace, lastBrace + 1);

    // 4. Forgiving JSON Parser - eksik kapanış parantezlerini dene
    try {
      return JSON.parse(cleanText);
    } catch (e) {
      const closers = ['}', ']', '"}', '"]', '}}', ']}'];
      for (const closer of closers) {
        try {
          return JSON.parse(cleanText + closer);
        } catch {
          continue;
        }
      }
      throw e;
    }
  } catch (error) {
    console.error('[ParserHelpers][parseJsonResponse] Hata:', error);
    return null;
  }
}
