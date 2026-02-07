export const GENERAL_QUALITY_RULES = `## GENEL KALİTE KURALLARI:
1. **Akademik Dil:** Soru kökü ve şıklar resmi, akademik ve sınav formatına (KPSS) uygun olmalıdır.
2. **Kapsam:** Metnin dışına çıkma, ancak metindeki bilgiyi farklı bir bağlamda veya örnekle sorgulayabilirsin.
3. **Çeldiriciler:** Çeldiricilerin en az ikisi, metindeki diğer kavramlarla doğrudan ilişkili ama sorulan odak noktasıyla çelişen ifadeler olmalıdır. "Hepsi", "Hiçbiri" YASAKTIR.
4. **Şık Yapısı:** Her zaman tam 5 adet (A,B,C,D,E) seçenek olmalıdır.
5. **Şık Dengesi:** Seçeneklerin tümü benzer uzunlukta ve yapıda olmalıdır.
6. **JSON GÜVENLİĞİ:** Tüm LaTeX komutlarında ters eğik çizgi (\) karakterini JSON içinde KESİNLİKLE çiftle (örn: \\alpha, \\frac{1}{2}). Tekil ters eğik çizgi JSON parse hatalarına yol açar ve kabul edilemez.
7. **Görsel Referansı:** Eğer bir görseli referans alarak soru soruyorsan, soru metni içinde MUTLAKA "[GÖRSEL: X]" etiketini geçir. Bu etiket, kullanıcıya hangi görsele bakması gerektiğini gösterir.`;

export const COMMON_OUTPUT_FORMATS = `## ÇIKTI FORMATI:
Sadece ve sadece aşağıdaki JSON şemasına uygun çıktı ver. Markdown veya yorum ekleme.
LaTeX ifadeleri için çift ters eğik çizgi kullanmayı unutma (\\).
{
  "q": "Soru metni... (Gerekirse [GÖRSEL: X] içerir, LaTeX içerirse \\ komutlarını çiftle)",
  "o": ["A", "B", "C", "D", "E"],
  "a": 0, // 0-4 arası index
  "exp": "Açıklama... (LaTeX içerirse \\ komutlarını çiftle)",
  "evidence": "Cevabı doğrulayan metin alıntısı...",
  "img": 0 // Görsel referansı varsa indexi (0, 1, 2...), yoksa null
}
## SİSTEM MESAJI:
Eğer soruyu kurgularken metindeki bir görseli [GÖRSEL: X] referans alıyorsan, o görselin numarasını (0, 1, 2 gibi) 'img' alanına yaz. Eğer sorunun bir görselle doğrudan ilgisi yoksa 'img' değerini null bırak.`;
