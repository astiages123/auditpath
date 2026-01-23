import type { ConceptMapItem } from '../mapping';

/**
 * Determine bloom level strategy based on concept and index
 */
export function determineNodeStrategy(index: number, wordCount: number, concept?: ConceptMapItem): { bloomLevel: 'knowledge' | 'application' | 'analysis'; instruction: string } {
  // 1. If mapping exists and has a level, respect it
  if (concept?.seviye) {
    if (concept.seviye === 'Analiz') return { bloomLevel: 'analysis', instruction: 'Sonuç/Analiz odaklı zor soru.' };
    if (concept.seviye === 'Uygulama') return { bloomLevel: 'application', instruction: 'İlişki/Uygulama odaklı soru.' };
    if (concept.seviye === 'Bilgi') return { bloomLevel: 'knowledge', instruction: 'Tanım/Bilgi odaklı soru.' };
  }

  // 2. Small Chunk Strategy (<= 150 words)
  if (wordCount <= 150) {
    const isRel = index % 2 !== 0; 
    if (isRel) {
      return {
        bloomLevel: 'application',
        instruction: "Şu an 'İlişki' aşamasındasın. Seçilen kavramın diğer kavramlarla ilişkisini, farklarını veya benzerliklerini sorgulayan bir soru üret."
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

/**
 * Build question generation prompt
 */
export function buildPrompt(
  content: string,
  courseName: string,
  sectionTitle: string,
  concept: ConceptMapItem | null,
  strategy: { bloomLevel: string; instruction: string },
  guidelines: { instruction?: string; few_shot_example?: unknown } | null
): string {
  const parts = [
    `Sen KPSS uzmanı bir yapay zekasın.`,
    `Ders: ${courseName}`,
    `Ünite/Konu: ${sectionTitle}`,
    `İçerik:\n${content}`,
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
- **Metne Sadakat ve Yaratıcılık:** Soru temelini metindeki kavramlardan almalıdır. Ancak 'Uygulama' veya 'Analiz' seviyesindeki sorularda, konuyu pekiştirmek için gerçekçi senaryolar, farklı isimler veya benzer sayısal değerler (metindeki temel mantığa ve bilimsel gerçeklere sadık kalarak) kullanılabilir.
- **Mantıksal Tutarlılık:** Eklenen her yeni veri veya örnek, metindeki ana kurallar ve kavramsal tanımlarla (örn: doyum noktası, azalan marjinal fayda vb.) %100 uyumlu olmalıdır. Uydurulan örnekler konuyu çarpıtmamalıdır.
- **Pedagojik Derinlik:** Sadece ezber değil, kavramsal kavrayışı veya analizi ölçmelidir.
- **Çeldirici Kalitesi:** Yanlış seçenekler mantıklı ve metinle uyumlu olmalı, "Hepsi" veya "Hiçbiri" gibi kaçamak şıklar kullanılmamalıdır.
- **Netlik:** Soru kökü ve seçenekler gereksiz karmaşıklıktan uzak, anlaşılır olmalıdır.
- **Açıklama Kalitesi:** Doğru cevabın neden doğru olduğu ve çeldiricilerin neden yanlış olduğu akademik bir dille açıklanmalıdır. Açıklama, kullanılan senaryo ile metin arasındaki bağı kurmalıdır.`);

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
