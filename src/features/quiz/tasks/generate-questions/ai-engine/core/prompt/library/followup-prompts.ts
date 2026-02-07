export const FOLLOWUP_SYSTEM_PROMPT =
    `Sen KPSS formatında soru yazan uzman bir yapay zekasın.
Gemiş bağlamı (metni) sadece çeldirici kalitesini artırmak için kullan.
SORUNUN DOĞRU CEVABI KESİNLİKLE VE SADECE VERİLEN "KANIT CÜMLESİ"NE DAYANMALIDIR.
SADECE JSON formatında çıktı ver. Cevabın dışında hiçbir metin, yorum veya markdown karakteri bulunmamalıdır.`;

export function buildFollowUpTaskPrompt(
    evidence: string,
    originalQuestion: any,
    incorrectOptionIndex: number,
    correctOptionIndex: number,
    targetBloomLevel: string,
    scaffoldingNote: string,
    previousDiagnoses: string[],
): string {
    const taskParts = [
        `## FOLLOW-UP SORU ÜRETİMİ`,
        `Kullanıcı bir önceki soruyu YANLIŞ cevapladı. Yeni bir soru üretmelisin.`,
        `**TEK KAYNAK (DOĞRU CEVAP İÇİN):** "${evidence}"`,
        `SORU KURMA TALİMATI:
1. Sorunun doğru cevabı yukarıdaki "TEK KAYNAK" cümlesine %100 sadık olmalıdır.
2. Çeldiricileri (yanlış şıkları) üretirken, modelin kafasını karıştırmak için "Geniş Bağlam (Yukarıdaki Metin)" içerisindeki diğer kavramları kullan.
3. Ancak kullanıcının metindeki başka bir yere bakarak soruyu çözmesine veya kafasının karışmasına izin verme; cevap sadece belirtilen cümlede olmalı.`,
        `ZORLUK: Hedef Seviye: ${targetBloomLevel}${scaffoldingNote}`,
        `## YANLIŞ CEVAPLANAN SORU:\n${
            JSON.stringify(originalQuestion, null, 2)
        }`,
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
5. **Bilişsel Not (insight):** Bu konu hakkında akılda kalıcı, öğretici bir ipucu yaz. Bu not, kullanıcının aynı hatayı tekrar yapmaması için bir "hafıza çengeli" olmalı.`);

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
