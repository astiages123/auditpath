import type { ConceptMapItem } from "@/features/quiz/types";

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
  "o": ["A", "B", "C", "D", "E"],
  "a": 0, // 0-4 arası index
  "exp": "Açıklama... (LaTeX içerirse \\\\ komutlarını MUTLAKA çiftle)",
  "evidence": "Cevabı doğrulayan metin alıntısı...",
  "img": 0 // Görsel referansı varsa indexi (0, 1, 2...), yoksa null
}
## SİSTEM MESAJI:
Eğer soruyu kurgularken metindeki bir görseli [GÖRSEL: X] referans alıyorsan, o görselin numarasını (0, 1, 2 gibi) 'img' alanına yaz. Eğer sorunun bir görselle doğrudan ilgisi yoksa 'img' değerini null bırak.`;

export const ANALYSIS_SYSTEM_PROMPT = (
  sectionTitle: string,
  courseName: string,
  importance: string = "medium",
) =>
  `Sen Uzman bir Eğitim İçerik Analistisin (KPSS A Grubu). 
Görev: ${courseName} altındaki **"${sectionTitle}"** başlıklı metni tarayarak kapsamlı bir soru bankası haritası oluştur.
BU DERSİN ÖNEM DERECESİ: ${importance.toUpperCase()}
Belirli bir sayıya odaklanma. Metindeki 10 üzerinden 7 ve üzeri önem puanına sahip **TÜM** kavramları ve **TÜM** istisnaları (Exception Hunter) çıkar. Metin yoğunsa çok, sığ ise az kavram döndür.
Asla uydurma veya değersiz veri üretme.

Sistem artık kelime sayısı ile değil, senin belirlediğin "Bilişsel Doygunluk Noktası" (Cognitive Saturation) üzerinden kota belirleyecek.
Görev: Metnin derinliğini ve dersin önem derecesini analiz ederek, bir öğrencinin bu konuyu "emekli etmesi" (tam öğrenmesi) için gereken ideal soru sayılarını (kotaları) belirle.

Kurallar:
1. **Bilişsel Doygunluk:** Gereksiz tekrardan kaçın. Konu ne eksik ne fazla, tam öğrenilsin.
2. **Terzi Dikimi Kotalar:** Dersin önem derecesine (Importance) ve metnin karmaşıklığına göre kotaları belirle. 
3. **EXCEPTION HUNTER:** Metinde "Ancak", "İstisnaen", "Şu kadar ki", "Saklı kalmak kaydıyla" gibi ifadelerle başlayan cümleleri TARA. Bu istisnaları ayrı birer kavram durağı olarak MUTLAKA listeye ekle ve 'isException': true olarak işaretle. (Priority 1)
4. Metnin baş, orta ve son kısımlarından dengeli bir konu dağılımı yap.
5. Belirlenen kavramlar anlamsal olarak birbirini kapsamamalı (overlap olmamalı), metnin farklı ve bağımsız bölümlerini temsil eden 'ana duraklar' niteliğinde olmalıdır.
6. 'seviye' alanını şu tanımlara göre belirle:
   - 'Bilgi': Tanım, kavram ve temel olgular.
   - 'Uygulama': Süreçler, yöntemler ve nasıl yapılır bilgisi.
   - 'Analiz': Neden-sonuç ilişkileri, kıyaslama ve çıkarımlar.
7. 'odak' alanı 15 kelimeyi geçmemeli ve net bir öğrenme kazanımı belirtmelidir.
8. Görsel Analizi: Çıktıdaki her objede 'gorsel' anahtarı mutlaka bulunmalıdır. Eğer ilgili görsel yoksa değeri kesinlikle null olmalıdır; anahtarı (key) asla silme veya atlama.
9. Görsel varsa 'altText' alanına görselin teknik açıklamasını ekle.
10. Her kavram için anahtar ismi olarak mutlaka 'baslik' kullanılmalıdır.

**Difficulty Index (Bilişsel Zorluk Endeksi) Kılavuzu:**
- 1: Giriş seviyesi, basit anlatım, hikaye tarzı (Örn: Tarih giriş)
- 3: Standart mevzuat veya konu anlatımı (Örn: Anayasa maddeleri)
- 5: Ağır doktrin, İcra-İflas gibi teknik ve karmaşık süreçler, yoğun Latince veya eski Türkçe terimler.

Çıktı Formatı:
Sadece saf JSON objesi döndür. Markdown bloğu (\`\`\`) veya giriş cümlesi ekleme.
{
  "difficulty_index": 3, 
  "concepts": [...],
  "quotas": {
    "antrenman": number,
    "arsiv": number,
    "deneme": number
  }
}`;

export const GLOBAL_AI_SYSTEM_PROMPT =
  "Sen KPSS formatında, akademik dille soru yazan uzman bir yapay zekasın. SADECE JSON formatında çıktı ver. Cevabın dışında hiçbir metin, yorum veya markdown karakteri bulunmamalıdır.";

export function buildDraftingTaskPrompt(
  concept: ConceptMapItem,
  strategy: { bloomLevel: string; instruction: string },
  usageType: "antrenman" | "deneme" | "arsiv" = "antrenman",
  previousDiagnoses?: string[],
): string {
  const parts = [
    `AMAÇ: Metni analiz ederek, belirtilen pedagojik stratejiye uygun tek bir soru üretmek.`,
    `---`,
  ];

  if (usageType === "deneme") {
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
*Rastgele veya saçma yanlışlar üretme.*

LATEX FORMAT ZORUNLULUĞU:
- Tüm sayısal verileri, matematiksel formülleri, değişkenleri ($x, y, P, Q$) ve teknik sembolleri ($IS-LM, \\sigma^2, \\alpha$ vb.) **hem soru metninde (q) hem de açıklamada (exp)** KESİNLİKLE LaTeX formatında yaz.
- Örn: "faiz oranı %5" yerine "$r = 5\\%$" veya "$P = 100$" şeklinde.`);

  parts.push(`HEDEF KAVRAM VE ODAK:
- Kavram: ${concept.baslik}
- Odak Noktası: ${concept.odak}
- Bloom Seviyesi: ${concept.seviye || strategy.bloomLevel}`);

  if (concept.gorsel) {
    parts.push(
      `GÖRSEL REFERANSI: Soruyu kurgularken '${concept.gorsel}' görseline atıfta bulun veya görselin açıkladığı durumu senaryolaştır.${
        concept.altText
          ? `\nGörsel Açıklaması (Alt-Text): ${concept.altText}`
          : ""
      }`,
    );
  }

  parts.push(`PEDAGOJİK STRATEJİ:
${strategy.instruction}

KANIT ZORUNLULUĞU:
Eğer soru bir senaryo veya analiz içeriyorsa; evidence alanına metindeki dayanak kuralı/tanımı yaz ve yanına kısa bir notla bu kuralın sorudaki duruma nasıl bağlandığını açıkla. Eğer metinde doğrudan bir kanıt veya dayanak yoksa o soruyu üretme.`);

  if (previousDiagnoses && previousDiagnoses.length > 0) {
    parts.push(`KULLANICININ GEÇMİŞ HATALARI (BU KONUDA):
Kullanıcı bu konuda daha önce şu hataları yaptı. Soruları üretirken bu zayıf noktaları özellikle test etmeye çalış:
${previousDiagnoses.map((d) => `- ${d}`).join("\n")}`);
  }

  parts.push(
    `Lütfen BAĞLAM METNİNİ referans alarak soruyu oluştur ve SADECE JSON döndür.`,
  );

  return parts.join("\n\n");
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
- Eğer karar "APPROVED" ise: \`critical_faults\` dizisini BOŞ bırak ([]), \`improvement_suggestion\` alanını BOŞ string ("") bırak.
- Eğer karar "REJECTED" ise: Hataları ve düzeltme önerisini yaz.

## GÜVENLİK KONTROLÜ (SAFETY CHECK) İLKESİ
- Sadece bariz hataları, halüsinasyonları ve teknik yanlışları reddet.
- Soru teknik olarak doğru ve çözülebilir ise, "daha iyi olabilirdi" diye reddetme, ONAYLA.

## ÇIKTI FORMATI (ZORUNLU):
Sadece aşağıdaki JSON yapısını döndür:
{
  "total_score": 0-100 arası sayı,
  "decision": "APPROVED" veya "REJECTED",
  "critical_faults": ["hata1", "hata2"],
  "improvement_suggestion": "öneri"
}`;

export function buildValidationTaskPrompt(question: {
  q: string;
  o: string[];
  a: number;
  exp: string;
}): string {
  const optionsText = question.o
    .map((opt: string, i: number) => `${String.fromCharCode(65 + i)}) ${opt}`)
    .join("\n");
  const correctAnswer = String.fromCharCode(65 + question.a);

  return `## DEĞERLENDİRİLECEK SORU:

**Soru:** ${question.q}

**Şıklar:**
${optionsText}

**Doğru Cevap:** ${correctAnswer}

**Açıklama:** ${question.exp}

---

Above the soruyu kaynak metne göre değerlendir ve JSON formatında puanla.`;
}

export function buildFollowUpTaskPrompt(
  evidence: string,
  originalQuestion: { q: string; o: string[]; a: number; exp: string },
  incorrectOptionIndex: number,
  correctOptionIndex: number,
  targetBloomLevel: string,
  scaffoldingNote: string,
  previousDiagnoses: string[],
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
      ["A", "B", "C", "D", "E"][incorrectOptionIndex]
    } ("${originalQuestion.o[incorrectOptionIndex]}")`,
    `Doğru cevap: ${["A", "B", "C", "D", "E"][correctOptionIndex]} ("${
      originalQuestion.o[correctOptionIndex]
    }")`,
  ];

  if (previousDiagnoses.length > 0) {
    taskParts.push(
      `## KULLANICININ GEÇMİŞ HATALARI:\n${
        previousDiagnoses
          .map((d) => `- ${d}`)
          .join("\n")
      }`,
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
}`,
  );

  return taskParts.join("\n\n");
}
