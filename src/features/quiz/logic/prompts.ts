import { type ConceptMapItem, type Message } from '@/features/quiz/types';

export const GENERAL_QUALITY_RULES = `## GENEL KALİTE KURALLARI:
1. **Akademik Dil:** Soru kökü ve şıklar resmi, akademik ve sınav formatına (KPSS) uygun olmalıdır.
2. **Kapsam:** Metnin dışına çıkma, ancak metindeki bilgiyi farklı bir bağlamda veya örnekle sorgulayabilirsin.
3. **Çeldiriciler:** Çeldiricilerin en az ikisi, metindeki diğer kavramlarla doğrudan ilişkili ama sorulan odak noktasıyla çelişen ifadeler olmalıdır. "Hepsi", "Hiçbiri" YASAKTIR.
4. **Şık Yapısı:** Her zaman tam 5 adet (A,B,C,D,E) seçenek olmalıdır.
5. **Şık Dengesi:** Seçeneklerin tümü benzer uzunlukta ve yapıda olmalıdır.
6. **JSON GÜVENLİĞİ VE LaTeX:** Tüm LaTeX komutlarında ters eğik çizgi (\\\\) karakterini JSON içinde KESİNLİKLE çiftle (örn: \\\\alpha, \\\\frac{1}{2}). Bu bir tercih değil, ZORUNLULUKTUR. Tekil ters eğik çizgi JSON parse hatalarına yol açar, sistemi çökertir ve bu en büyük HATA olarak kabul edilir.
7. **Görsel Referansı:** Eğer bir görseli referans alarak soru soruyorsan, soru metni içinde MUTLAKA "[GÖRSEL: X]" etiketini geçir. Bu etiket, kullanıcıya hangi görsele bakması gerektiğini gösterir.`;

export const COMMON_OUTPUT_FORMATS = `## ÇIKTI FORMATI:
Sadece ve sadece aşağıdaki JSON şemasına uygun çıktı ver. Markdown veya yorum ekleme.
LaTeX ifadeleri için JSON içinde çift ters eğik çizgi kullanmak (\\) EN KRİTİK kuraldır. Aksi takdirde sistem çöker.
{
  "q": "Soru metni... (Gerekirse [GÖRSEL: X] içerir, LaTeX içerirse \\\\ komutlarını MUTLAKA çiftle)",
  "o": ["Seçenek 1", "Seçenek 2", "Seçenek 3", "Seçenek 4", "Seçenek 5"], // A), B) gibi harfler KESİNLİKLE EKLEMEYİN. Sade metin/LaTeX olmalı.
  "a": 0, // 0-4 arası index
  "exp": "Açıklama... (LaTeX içerirse \\\\ komutlarını MUTLAKA çiftle)",
  "evidence": "Cevabı doğrulayan metin alıntısı...",
  "img": 0 // Görsel referansı varsa indexi (0, 1, 2...), yoksa null
}
## SİSTEM MESAJI:
Eğer soruyu kurgularken metindeki bir görseli [GÖRSEL: X] referans alıyorsan, o görselin numarasını (0, 1, 2 gibi) 'img' alanına yaz. Eğer sorunun bir görselle doğrudan ilgisi yoksa 'img' değerini null bırak.`;

// --- Prompt Architect & Assembly ---

export class PromptArchitect {
  static assemble(
    systemPrompt: string,
    contextPrompt: string,
    taskPrompt: string
  ): Message[] {
    const fixedContext = this.normalizeText(contextPrompt);
    const dynamicTask = this.normalizeText(taskPrompt);

    return [
      { role: 'system', content: this.normalizeText(systemPrompt) },
      {
        role: 'user',
        content: `${fixedContext}\n\n--- GÖREV ---\n${dynamicTask}`,
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
    } | null
  ): string {
    const parts: string[] = [];

    if (courseName && courseName.trim()) {
      parts.push(`## DERS: ${courseName.trim()}`);
    }
    if (sectionTitle && sectionTitle.trim()) {
      parts.push(`## KONU: ${sectionTitle.trim()}`);
    }

    if (guidelines) {
      parts.push('## DERS REHBERİ VE KURALLAR:');
      if (guidelines.instruction && guidelines.instruction.trim()) {
        parts.push(`### TEKNİK KURALLAR\n${guidelines.instruction.trim()}`);
      }
      if (guidelines.few_shot_example) {
        const exampleStr = JSON.stringify(guidelines.few_shot_example, null, 2);
        parts.push(`\n### İYİ ÖRNEK (Bunu model al):\n${exampleStr}`);
      }
      if (guidelines.bad_few_shot_example) {
        const badExampleStr = JSON.stringify(
          guidelines.bad_few_shot_example,
          null,
          2
        );
        parts.push(`\n### KÖTÜ ÖRNEK (Bundan kaçın):\n${badExampleStr}`);
      }
    }

    parts.push(GENERAL_QUALITY_RULES);
    parts.push(COMMON_OUTPUT_FORMATS);
    parts.push('## BAĞLAM METNİ:');
    parts.push(this.normalizeText(content));

    return parts
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .join('\n\n');
  }

  static cleanReferenceImages(content: string): string {
    return content.replace(/!\[[^\]]*\]\([^)]+\)/g, '[GÖRSEL]');
  }

  private static normalizeText(text: string): string {
    return text.replace(/\r\n/g, '\n').trim();
  }
}

// --- Dynamic Prompt Builders ---

export function buildAnalysisPrompt(
  sectionTitle: string,
  courseName: string,
  importance: string = 'medium'
): string {
  return `Sen Uzman bir Eğitim İçerik Analistisin (KPSS A Grubu). 
Görev: ${courseName} altındaki **"${sectionTitle}"** başlıklı metni tarayarak kapsamlı bir soru bankası haritası oluştur.
BU DERSİN ÖNEM DERECESİ: ${importance.toUpperCase()}
Belirli bir sayıya odaklanma. Metindeki 10 üzerinden 7 ve üzeri önem puanına sahip **TÜM** kavramları ve **TÜM** istisnaları (Exception Hunter) çıkar. Metin yoğunsa çok, sığ ise az kavram döndür.
Asla uydurma veya değersiz veri üretme.

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
}

export const GLOBAL_AI_SYSTEM_PROMPT =
  'Sen KPSS formatında, akademik dille soru yazan uzman bir yapay zekasın. SADECE JSON formatında çıktı ver. Cevabın dışında hiçbir metin, yorum veya markdown karakteri bulunmamalıdır.';

export function buildDraftingPrompt(
  concepts: ConceptMapItem[],
  strategy: { bloomLevel: string; instruction: string },
  usageType: 'antrenman' | 'deneme' | 'arsiv' = 'antrenman',
  previousDiagnoses?: string[]
): string {
  const parts = [
    `AMAÇ: Metni analiz ederek, belirtilen pedagojik stratejiye uygun, verilen her bir kavram için TEK BİR SORU (toplamda ${concepts.length} soru) üretmek.`,
    `---`,
  ];

  if (usageType === 'deneme') {
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
*Rastgele veya saçma yanlışlar üretme.*`);

  const conceptsText = concepts
    .map((concept, index) => {
      let text = `### Soru - İndeks [${index}]
- Kavram: ${concept.baslik}
- Odak Noktası: ${concept.odak}
- Bloom Seviyesi: ${concept.seviye || strategy.bloomLevel}`;
      if (concept.gorsel) {
        text += `\nGÖRSEL REFERANSI: Soruyu kurgularken '${concept.gorsel}' görseline atıfta bulun veya görselin açıkladığı durumu senaryolaştır.${
          concept.altText
            ? `\nGörsel Açıklaması (Alt-Text): ${concept.altText}`
            : ''
        }`;
      }
      return text;
    })
    .join('\n\n');

  parts.push(
    `HEDEF KAVRAMLAR VE ODAK NOKTALARI (Her biri için indeks sırasını koruyarak ayrı bir soru üret):\n\n${conceptsText}`
  );

  parts.push(`PEDAGOJİK STRATEJİ:
${strategy.instruction}

KANIT ZORUNLULUĞU:
Eğer soru bir senaryo veya analiz içeriyorsa; evidence alanına metindeki dayanak kuralı/tanımı yaz ve yanına kısa bir notla bu kuralın sorudaki duruma nasıl bağlandığını açıkla. Eğer metinde doğrudan bir kanıt veya dayanak yoksa o soruyu üretme.`);

  if (previousDiagnoses && previousDiagnoses.length > 0) {
    parts.push(`KULLANICININ GEÇMİŞ HATALARI (BU KONUDA):
Kullanıcı bu konuda daha önce şu hataları yaptı. Soruları üretirken bu zayıf noktaları özellikle test etmeye çalış:
${previousDiagnoses.map((d) => `- ${d}`).join('\n')}`);
  }

  parts.push(`ŞIK (SEÇENEK) KURALLARI:
- 'o' dizisi içindeki her bir eleman SADECE seçeneğin kendisini içermelidir.
- Şıkların başına "A) ", "B- ", "1. " gibi harf veya rakam KESİNLİKLE koymayın. Sistem bunları otomatik eklemektedir.
- Örn: "A) Türkiye" yerine sadece "Türkiye" yazın.`);

  parts.push(
    `Lütfen BAĞLAM METNİNİ referans alarak soruları oluştur ve SADECE JSON döndür.
Çıktı Formatı:
{
  "questions": [
    {
      "q": "soru metni",
      "o": ["şık 1", "şık 2", "şık 3", "şık 4", "şık 5"],
      "a": 0,
      "exp": "açıklama",
      "evidence": "kanıt"
    }
  ]
}`
  );

  return parts.join('\n\n');
}

export const VALIDATION_SYSTEM_PROMPT = `## ROL
Sen AuditPath için "Güvenlik ve Doğruluk Kontrolü Uzmanısın".
Görevin: Üretilen KPSS sorularının teknik ve bilimsel doğruluğunu kontrol etmektir. "HATA YOKLUĞU"na odaklanmalısın.

## DEĞERLENDİRME KRİTERLERİ VE PUAN KIRMA TABLOSU
Soruyu 100 tam puan üzerinden değerlendir. Aşağıdaki her bir hata için belirtilen puanı KESİNTİSİZ düş:

| Hata Türü | Kesilecek Puan | Açıklama |
| :--- | :--- | :--- |
| **Bilimsel/Teknik Hata** | **-100 Puan** | Bilgi hatası, yanlış çözüm veya metne aykırılık (Anında REJECTED). |
| **Çeldirici Zayıflığı** | **-40 Puan** | Mantıksız, bariz yanlış veya soruyla ilgisiz şıklar. |
| **LaTeX Yazım Hatası** | **-30 Puan** | Ters eğik çizgi hataları ($ veya \\\\ eksikliği) ve JSON kaçış hataları. |
| **Açıklama/Kanıt Uyumsuzluğu** | **-30 Puan** | exp veya evidence alanının soruyla veya metinle çelişmesi. |
| **Akademik Dil Uyumsuzluğu** | **-20 Puan** | KPSS formatına uymayan laubali veya basit anlatım. |

## KARAR MEKANİZMASI
- **Total Score >= 70 ise:** "APPROVED"
- **Total Score < 70 ise:** "REJECTED" (Yukarıdaki tablodan en az bir ciddi hata yapılmış demektir)

**ÖNEMLİ:**
- Her bir soruyu diğerlerinden bağımsız olarak değerlendir.
- Eğer karar "APPROVED" ise: \`critical_faults\` dizisini BOŞ bırak ([]), \`improvement_suggestion\` alanını BOŞ string ("") bırak.
- Eğer karar "REJECTED" ise: Hataları ve düzeltme önerisini yaz.

## GÜVENLİK KONTROLÜ (SAFETY CHECK) İLKESİ
- Sadece bariz hataları, halüsinasyonları ve teknik yanlışları reddet.
- Soru teknik olarak doğru ve çözülebilir ise, "daha iyi olabilirdi" diye reddetme, ONAYLA.

## ÇIKTI FORMATI (ZORUNLU):
Birden fazla soruyu tek seferde değerlendireceksin. Her soru için girdiğinde verilen 'index' değerini koruyarak SADECE aşağıdaki JSON yapısını döndür. Alan isimleri KESİNLİKLE İngilizce olmalıdır.
{
  "results": [
    {
      "index": 0, // Girdiyle aynı index
      "total_score": 0-100, // Sayısal değer
      "decision": "APPROVED", // Sadece "APPROVED" veya "REJECTED"
      "critical_faults": [], 
      "improvement_suggestion": ""
    }
  ]
}`;

import { type GeneratedQuestion } from '@/features/quiz/types';

export function buildBatchValidationPrompt(
  questions: GeneratedQuestion[]
): string {
  const questionsText = questions
    .map((question, index) => {
      const optionsText = question.o
        .map(
          (opt: string, i: number) => `${String.fromCharCode(65 + i)}) ${opt}`
        )
        .join('\n');
      const correctAnswer = String.fromCharCode(65 + question.a);

      return `### Soru - İndeks [${index}]\n\n**Soru:** ${question.q}\n\n**Şıklar:**\n${optionsText}\n\n**Doğru Cevap:** ${correctAnswer}\n\n**Açıklama:** ${question.exp}\n\n---`;
    })
    .join('\n\n');

  return `## DEĞERLENDİRİLECEK SORULAR:\n\n${questionsText}\n\nYukarıdaki soruları kaynak metne göre ayrı ayrı değerlendir ve SADECE istenen formattaki JSON'u üret.`;
}

export const BLOOM_INSTRUCTIONS = {
  knowledge:
    'Temel bilgi ve kavrama düzeyinde, akademik bir dille hazırlanmış öğretici bir soru üret. Tanım, ilke veya kavramsal özelliklere odaklan.',
  application:
    "Kuru tanım sorma. Kullanıcının günlük hayatta karşılaşabileceği, isimler ve olaylar içeren spesifik bir 'vaka/senaryo' (vignette) kurgula.",
  analysis:
    "Metindeki iki farklı kavramı karşılaştıran veya bir kuralın istisnasını sorgulayan 'muhakeme' odaklı bir soru üret. Soru, 'X olursa Y nasıl etkilenir?' gibi neden-sonuç zinciri kurdurmalıdır.",
};

export function buildFollowUpPrompt(
  evidence: string,
  originalQuestion: { q: string; o: string[]; a: number; exp: string },
  incorrectOptionIndex: number,
  correctOptionIndex: number,
  targetBloomLevel: string,
  scaffoldingNote: string,
  previousDiagnoses: string[]
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
    `## YANLIŞ CEVAPLANAN SORU:\n${JSON.stringify(originalQuestion, null, 2)}`,
    `Kullanıcının verdiği cevap: ${
      ['A', 'B', 'C', 'D', 'E'][incorrectOptionIndex]
    } ("${originalQuestion.o[incorrectOptionIndex]}")`,
    `Doğru cevap: ${['A', 'B', 'C', 'D', 'E'][correctOptionIndex]} ("${
      originalQuestion.o[correctOptionIndex]
    }")`,
  ];

  if (previousDiagnoses.length > 0) {
    taskParts.push(
      `## KULLANICININ GEÇMİŞ HATALARI:\n${previousDiagnoses
        .map((d) => `- ${d}`)
        .join('\n')}`
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
}`
  );

  return taskParts.join('\n\n');
}
