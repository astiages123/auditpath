1. Ceza Hukuku (Maddi ve Usul)
Instruction (Talimat):
1. Soyut tanım sorma; "Fail-Fiil-Netice" illiyet bağını içeren somut vaka analizi (case-study) kurgula.
2. İştirak (azmettirme/yardım) ve teşebbüs aşamalarının iç içe geçtiği çoklu fail senaryolarına odaklan.
3. Çeldiricilerde TCK'daki sınırdaş kurumları kullan (Örn: Şahısta Hata vs. Hedefte Sapma).
4. Analiz kısmında mutlaka ilgili TCK madde numaralarına (m.30, m.38, m.44 vb.) atıf yap.
Few-Shot Example (JSON):
JSON

{
  "q": "Fail (A), (B)’yi öldürmesi için (C)’yi azmettirmiştir. (C), (B) zannederek (B)’nin ikiz kardeşi (D)’ye ateş etmiş; mermi (D)’yi sıyırmış, o sırada yoldan geçen (E) ise seken mermiyle hayatını kaybetmiştir. Bu olaydaki ceza sorumluluğu için hangisi doğrudur?",
  "o": [
    "(C), (D)’ye karşı 'Kasten Öldürmeye Teşebbüs', (E)’ye karşı 'Olası Kastla Öldürme'den sorumlu olur.",
    "(C), (D) üzerindeki hatası nedeniyle sorumlu tutulamaz; sadece (E) için 'Taksirle Öldürme'den sorumludur.",
    "(C), (D)’ye karşı 'Kasten Öldürmeye Teşebbüs', (E)’ye karşı ise 'Taksirle Öldürme'den sorumlu olur; (A) ise azmettirmeden sorumludur.",
    "(C), 'Şahısta Hata' ve 'Hedefte Sapma' birleştiği için tek bir 'Kasten Öldürme'den cezalandırılır.",
    "(C), (D)’ye karşı 'Teşebbüs'ten sorumludur; (E)’nin ölümü 'Hedefte Sapma' uyarınca 'Taksirle Öldürme'dir ve fikri içtima hükümleri uygulanır."
  ],
  "a": 4,
  "exp": "Şahısta hata (TCK m.30/1) failin kastını ortadan kaldırmaz. Ancak hedefte sapma neticesinde başka birinin zarar görmesi durumunda TCK m.44 (Fikri İçtima) gereği fail, en ağır cezayı gerektiren suçtan sorumlu tutulur."
}

2. Mikro İktisat
Instruction (Talimat):
1. Analitik çıkarım ve değişken etkileşimini (Ceteris Paribus) test et.
2. Marjinal analiz (türev alma) ve denge noktası (MC=MR) hesaplamaları içeren sayısal sorular kurgula.
3. "Eğri üzerinde hareket" ile "eğrinin kayması" ayrımını temel yanıltıcı (çeldirici) olarak kullan.
4. Tüm fonksiyon ve sembolleri LaTeX (STC,Q2,P=10) formatında yaz.
Few-Shot Example (JSON):
JSON

{
  "q": "Tam rekabet piyasasında bir firmanın maliyet fonksiyonu $STC = Q^3 - 4Q^2 + 10Q + 20$ ve piyasa fiyatı $P = 10$ ise, firmanın kârını maksimize eden üretim düzeyi ($Q$) nedir?",
  "o": [
    "$Q=4$ birim üretir ve aşırı kâr elde eder.",
    "$Q=1$ birim üretir ve zarar etmesine rağmen üretime devam eder.",
    "$Q=4$ birim üretir ve sadece normal kâr elde eder.",
    "$Q=2$ birim üretir ve başabaş noktasındadır.",
    "$Q=\\frac{8}{3}$ birim üretir; üretim düzeyi marjinal maliyetin fiyata eşitlendiği noktada belirlenir."
  ],
  "a": 4,
  "exp": "Kâr maksimizasyonu için $P = MC$ olmalıdır. $MC = \\frac{dSTC}{dQ} = 3Q^2 - 8Q + 10$. Buradan $10 = 3Q^2 - 8Q + 10 \\Rightarrow 3Q^2 - 8Q = 0$ denkleminden $Q = \\frac{8}{3}$ bulunur."
}

3. Muhasebe (Genel ve Banka)
Instruction (Talimat):
1. Tekil yevmiye kaydı yerine, işlemin Bilanço ve Öz Kaynaklar üzerindeki bütüncül etkisini sorgula.
2. Dönemsellik ilkesi, amortisman ve karşılık ayırma gibi dönem sonu işlemlerine odaklan.
3. Banka muhasebesinde Mevduat’ın banka için bir 'Pasif/Borç' olduğu gerçeğini çeldirici olarak kullan.
4. Analiz kısmında mutlaka MSUGT kavramsal çerçevesine atıf yap.
Few-Shot Example (JSON):
JSON

{
  "q": "İşletme, 3 aylık kira bedeli olan 90.000 TL’yi peşin ödemiş ve tamamını gider kaydetmiştir. Dönem sonu itibarıyla (1 ay sonra) yapılması gereken düzeltme kaydının mali tablolara etkisi nedir?",
  "o": [
    "60.000 TL borçlandırılır; varlık toplamı değişmez.",
    "30.000 TL alacaklandırılır; öz kaynaklar azalır.",
    "60.000 TL 'Gelecek Aylara Ait Giderler' borçlandırılır; bu işlem net kârı ve aktif toplamını artırır.",
    "90.000 TL 'Peşin Ödenen Giderler' alacaklandırılır; aktif toplamı azalır.",
    "Banka standartlarına göre tutar doğrudan gider olarak kalır."
  ],
  "a": 2,
  "exp": "Dönemsellik ilkesi gereği, henüz gerçekleşmemiş 2 aylık (60.000 TL) kısım giderden çıkarılıp '180 Gelecek Aylara Ait Giderler' hesabına aktarılmalıdır. Giderin azalması net kârı ve dolayısıyla öz kaynakları artırır."
}

4. İstatistik
Instruction (Talimat):
1. Ham hesaplama yerine, veri seti manipülasyonlarının parametreler (μ,σ2) üzerindeki etkisini sorgula.
2. Standart sapma ile varyans arasındaki karesel ilişkiyi ve Değişim Katsayısı (DK) özelliklerini kullan.
3. Uç değerlerin (outliers) merkezi eğilim ölçülerini nasıl saptırdığını test et.
4. Tüm istatistiksel sembolleri LaTeX formatında yaz.
Few-Shot Example (JSON):
JSON

{
  "q": "Bir veri setindeki tüm değerler $k$ gibi pozitif bir sabit sayı ile çarpıldığında; aritmetik ortalama ($\\mu$), varyans ($\\sigma^2$) ve değişim katsayısı (DK) nasıl değişir?",
  "o": [
    "$\\mu$ $k$ katına çıkar, $\\sigma^2$ değişmez, DK $k$ katına çıkar.",
    "$\\mu$ $k$ birim artar, $\\sigma^2$ $k^2$ katına çıkar, DK değişmez.",
    "$\\mu$ $k$ katına çıkar, $\\sigma^2$ $k^2$ katına çıkar, DK değişmez.",
    "$\\mu$ $k$ katına çıkar, $\\sigma^2$ $k$ katına çıkar, DK azalır.",
    "Sadece varyans etkilenir, diğerleri sabit kalır."
  ],
  "a": 2,
  "exp": "Ortalama $k$ ile doğru orantılı artar ($\\mu_{yeni} = k \\cdot \\mu$). Varyans farkların karesi olduğu için $k^2$ katına çıkar. DK ise oran olduğu için ($k\\sigma / k\\mu$) değişmez."
}

5. Maliye
Instruction (Talimat):
1. Vergi yansıması ve insidans analizini arz/talep esneklikleriyle ilişkilendirerek kurgula.
2. Vergi hukukundaki zamanaşımı türleri (tahakkuk vs. tahsil) ve zıt mali görüşleri (Pigou vs. Coase) çeldirici yap.
3. Esneklik ile vergi yükü arasındaki ters orantı kuralını ekstrem durumlar (tam esnek/tam inelastik) üzerinden sorgula.
Few-Shot Example (JSON):
JSON

{
  "q": "Talebin tam esnek ($e_d = \\infty$) olduğu bir piyasada, birim başına alınan spesifik bir verginin yükü hakkında hangisi doğrudur?",
  "o": [
    "Verginin tamamı tüketiciye yansıtılır.",
    "Verginin tamamı üretici üzerinde kalır; fiyat değişmez.",
    "Vergi yükü tüketici ve üretici arasında eşit paylaşılır.",
    "Fiyat, vergi miktarından daha fazla artar.",
    "Talep esnek olduğu için vergi devlet tarafından sübvansiyonla karşılanır."
  ],
  "a": 1,
  "exp": "Dalton-Musgrave kuralına göre vergi yükü, esnekliği düşük olan tarafta kalır. Talep tam esnekse tüketici fiyat artışına sonsuz tepki verir, bu yüzden üretici fiyatı artıramaz ve verginin tamamını üstlenir."
}

6. Medeni Hukuk
Instruction (Talimat):
1. Tanım sorma; kısıtlılık, vesayet ve fiil ehliyeti sınırlarını içeren olay örgüleri (vaka) kurgula.
2. Miras hukukunda derece (zümre) sistemi ve saklı pay (mahfuz hisse) hesaplamalarına odaklan.
3. Çeldiricilerde "Yokluk", "Mutlak Butlan" ve "Nisbi Butlan" farklarını teknik tuzak olarak kullan.
4. Miras payı hesaplamalarında mutlaka LaTeX (1/2,1/4) formatını kullan.
Few-Shot Example (JSON):
JSON

{
  "q": "Miras bırakan (M), geride eşi (E) ile annesi (A) ve babası (B) hayatta iken vefat etmiştir. (M) mirasının tamamını bir vakfa bağışlamıştır. Tereke değeri net 1.200.000 TL olduğuna göre, sağ kalan eş (E) ve babanın (B) 'Saklı Pay' miktarları nedir?",
  "o": [
    "(E): 600.000 TL, (B): 100.000 TL",
    "(E): 300.000 TL, (B): 75.000 TL",
    "(E): 600.000 TL, (B): 150.000 TL",
    "(E): 300.000 TL, (B): 50.000 TL",
    "(E): 600.000 TL, (B): Saklı payı yoktur."
  ],
  "a": 2,
  "exp": "Eş 2. zümre ile mirasçı olduğunda yasal payı $1/2$'dir ve saklı payı yasal payının tamamıdır ($600.000$ TL). Ana-babanın yasal payı kalan $1/2$'nin yarısı ($1/4$) olup saklı payları yasal paylarının yarısıdır ($1/4 \\times 1/2 = 1/8$). $1.200.000 \\times 1/8 = 150.000$ TL bulunur."
}

7. Medeni Usul Hukuku
Instruction (Talimat):
1. Yargılama sürecinin teknik akışına, süre yönetimine ve "Görev/Yetki" kavramlarına odaklan.
2. Yetki kuralının "kesin" olup olmamasının (dava şartı vs. ilk itiraz) sonuçlarını vaka üzerinden sorgula.
3. İstinaf ve temyiz süreçlerinde kesinleşme anı ve süre başlangıçlarını çeldirici olarak kullan.
4. Analiz kısmında mutlaka HMK madde numaralarına (m.12, m.114 vb.) atıf yap.
Few-Shot Example (JSON):
JSON

{
  "q": "Davacı (A), Ankara’daki taşınmazına yönelik müdahalenin men'i davasını, davalı (B)’nin ikametgahı olan İstanbul'da açmıştır. (B) yetki itirazında bulunmamıştır. Bu durumda mahkemenin yapması gereken işlem nedir?",
  "o": [
    "Yetki itirazı yapılmadığı için İstanbul mahkemesi yetkili hale gelmiştir.",
    "Taşınmazın aynına ilişkin davalarda yetki kesin olduğundan, mahkeme yetkisizliği re'sen gözetmelidir.",
    "Yetki kuralı kamu düzenine ilişkin olmadığından mahkeme davaya bakmaya devam eder.",
    "Bu bir dava şartı değil, ilk itirazdır; hakim dikkate alamaz.",
    "Dosya doğrudan Ankara Nöbetçi İcra Müdürlüğü'ne gönderilmelidir."
  ],
  "a": 1,
  "exp": "HMK m.12 uyarınca taşınmazın aynına ilişkin davalarda yetki kesindir. HMK m.114 gereği kesin yetki bir dava şartıdır ve hakim tarafından davanın her aşamasında kendiliğinden (re'sen) gözetilmesi gerekir."
}

8. Bankacılık Hukuku
Instruction (Talimat):
1. 5411 Sayılı Kanun kapsamındaki düzenleyici mekanizmalara (BDDK, TMSF) ve bankacılık suçlarına odaklan.
2. "Zimmet" suçunun bankacılık hukukuna özgü nitelikli hallerini genel ceza hukukundan ayırarak sorgula.
3. Sır saklama yükümlülüğü ve faaliyet izinlerinin iptali süreçlerini vaka kurgusu içinde kullan.
4. Analiz kısmında 5411 Sayılı Kanun'un ilgili maddelerini belirt.
Few-Shot Example (JSON):
JSON

{
  "q": "Mevduat bankası genel müdürü (G), banka kaynaklarını teminatsız kredi olarak paravan şirketlere aktarmış ve takip imkansız hale gelmiştir. Bu eylemin 5411 Sayılı Kanun kapsamındaki niteliği nedir?",
  "o": [
    "Genel ceza hukukundaki 'Güveni Kötüye Kullanma' suçudur.",
    "'Zimmet' suçunun nitelikli hali oluşmuştur; adli ceza ve bankacılık yasağı uygulanır.",
    "Fiil 'İrtikap' suçuna girer ve TMSF onayı gerekir.",
    "Sadece idari para cezası gerektiren usulsüz kredi işlemidir.",
    "Banka sırrını açıklama suçu ile birleşen bir dolandırıcılık vakasıdır."
  ],
  "a": 1,
  "exp": "Banka kaynaklarının, banka zararına olacak şekilde şahsi veya başkası lehine mal edinilmesi 5411 Sayılı Kanun m.160 uyarınca 'Zimmet' suçunu oluşturur. Bu suçun cezası hapis ve adli para cezasının yanı sıra bankacılık yapma yasağını da içerir."
}

9. Pazarlama Yönetimi
Instruction (Talimat):
1. Tanım sorma; BCG Matrisi, Ürün Yaşam Eğrisi (PLC) ve Ansoff Matrisi gibi modelleri pazar senaryolarıyla birleştir.
2. Fiyat liderliği, farklılaştırma ve ürün konumlandırma kararları arasındaki stratejik farkları test et.
3. Ürünün PLC (Olgunluk, Büyüme vb.) dönemine göre uygulanması gereken pazarlama karması (4P) kararlarını sorgula.
Few-Shot Example (JSON):
JSON

{
  "q": "Pazar büyüme hızının düşük, ancak firmanın pazar payının çok yüksek olduğu bir segmentteki 'X' ürünü, PLC bazında 'Olgunluk' dönemindedir. BCG Matrisi'ne göre bu ürünün stratejik konumu nedir?",
  "o": [
    "Yıldız (Star); yoğun Ar-Ge yatırımı yapılmalıdır.",
    "Soru İşareti (Question Mark); hemen pazardan çekilmelidir.",
    "Nakit İneği (Cash Cow); elde edilen fonlar diğer adaylara aktarılmalıdır.",
    "Köpek (Dog); hasat stratejisi ile tasfiye edilmelidir.",
    "Nakit İneği; fiyatlar artırılarak büyüme hızı tetiklenmelidir."
  ],
  "a": 2,
  "exp": "Düşük büyüme hızı ve yüksek pazar payı kombinasyonu 'Nakit İneği'ni tanımlar. Bu aşamadaki ürünler olgunluk dönemindedir ve minimum yatırımla sağladıkları yüksek nakit akışı firmanın diğer birimlerini fonlamak için kullanılır."
}

10. Para, Banka ve Kredi
Instruction (Talimat):
1. TCMB araçlarının (APİ, reeskont, zorunlu karşılık) likidite üzerindeki transmisyon mekanizmasını test et.
2. Para çarpanı ve kaydi para yaratma süreçlerini içeren sayısal hesaplama soruları kurgula.
3. Fisher Etkisi (i=r+πe) ve para arzı değişkenleri arasındaki korelasyonu kullan.
4. Tüm matematiksel formülleri ve çarpan hesaplamalarını LaTeX ile göster.
Few-Shot Example (JSON):
JSON

{
  "q": "Zorunlu karşılık oranının ($rr$) 0,20, nakit tercihi oranının ($c$) 0,10 ve aşırı rezerv oranının ($e$) 0,05 olduğu bir ekonomide; MB'nin 500 Milyon TL'lik tahvil alması (APİ) para arzını ($M1$) ne kadar artırır?",
  "o": [
    "1.250 Milyon TL",
    "2.000 Milyon TL",
    "1.571 Milyon TL",
    "2.500 Milyon TL",
    "500 Milyon TL"
  ],
  "a": 2,
  "exp": "Para çarpanı formülü: $m = \\frac{1 + c}{rr + e + c}$. Değerler yerine konulduğunda: $m = \\frac{1 + 0.10}{0.20 + 0.05 + 0.10} = \\frac{1.10}{0.35} \\approx 3.142$. Nihai artış: $500 \\times 3.142 = 1.571$ Milyon TL olur."
}

11. Banka Muhasebesi
Instruction (Talimat):
1. Mevduatın Pasif (Borç), kredilerin Aktif (Varlık) olduğu bankacılık "ters mantığını" esas al.
2. Nazım Hesaplar (Bilanço dışı) ile Bilanço içi hesapların farkını, özellikle teminat mektubu senaryolarında çeldirici olarak kullan.
3. Donuk alacaklar (NPL) ve karşılık ayırma işlemlerinin net aktif ve öz kaynaklar üzerindeki etkisini sorgula.
4. Tüm hesap kodlarını ve tutarları LaTeX (100.000 TL, %20) formatında belirt.
Few-Shot Example (JSON):
JSON

{
  "q": "Bir banka, vadesinde ödenmeyen $100.000$ TL tutarındaki kredisini 'Donuk Alacaklar' statüsüne almış ve ihtiyatlılık gereği $\%20$ oranında 'Özel Karşılık' ayırmıştır. Bu işlemin mali tablolara etkisi nedir?",
  "o": [
    "Aktif toplamı $20.000$ TL azalır, Öz Kaynaklar $20.000$ TL azalır.",
    "Aktif toplamı değişmez, sadece hesaplar arası transfer gerçekleşir.",
    "Pasif toplamı $20.000$ TL artar, kâr $20.000$ TL artar.",
    "Nazım hesaplarda $100.000$ TL'lik azalış meydana gelir.",
    "Aktif toplamı $100.000$ TL azalır, Karşılık Giderleri alacaklandırılır."
  ],
  "a": 0,
  "exp": "Karşılık ayırma bir giderdir ve kârı (Öz Kaynakları) düşürür. Aktifte ise 'Eksi' karakterli bir düzenleyici hesap olan 'Özel Karşılıklar' hesabı artacağı için Net Aktif toplamı da ayrılan tutar ($20.000$ TL) kadar azalır."
}

12. İcra ve İflas Hukuku
Instruction (Talimat):
1. Şekli hukukun katı kurallarına bağlı kalarak; takip yolları, itiraz ve şikayet sürelerini (3, 7, 15 gün) vaka üzerinden sorgula.
2. Alacaklının elindeki belgenin niteliğinin (adi senet vs. resmi belge) görevli mahkemeyi (İcra Mahk. vs. Genel Mahk.) nasıl belirlediğini test et.
3. "İtirazın Kaldırılması" ile "İtirazın İptali" arasındaki usuli farkları temel çeldirici olarak kullan.
4. Analiz kısmında mutlaka İİK madde numaralarına (m.66, m.67 vb.) atıf yap.
Few-Shot Example (JSON):
JSON

{
  "q": "Genel haciz yoluyla takipte borçlu, ödeme emrine 5 gün içinde icra dairesinde itiraz etmiştir. Alacaklının elinde İİK m.68 kapsamında olmayan bir 'adi senet' varsa, takibin devamı için hangi yola başvurmalıdır?",
  "o": [
    "6 ay içinde İcra Mahkemesi’nden 'İtirazın Kaldırılması' talep edilmelidir.",
    "1 yıl içinde Genel Mahkemelerde 'İtirazın İptali' davası açılmalıdır.",
    "7 gün içinde İcra Mahkemesi’nden 'Takibin Devamı' kararı alınmalıdır.",
    "15 gün içinde borçluya karşı 'Menfi Tespit Davası' açılmalıdır.",
    "İtiraz 5. günde yapıldığı için süresiz şikayet yoluna gidilmelidir."
  ],
  "a": 1,
  "exp": "Alacaklının elindeki belge İİK m.68 anlamında kesin bir belge değilse, dar yetkili İcra Mahkemesi'nden kaldırma talep edemez. Bu durumda İİK m.67 uyarınca 1 yıl içinde genel mahkemelerde 'İtirazın İptali' davası açması gerekir."
}

13. Uluslararası Ticaret
Instruction (Talimat):
1. Mutlak Üstünlük ve Karşılaştırmalı Üstünlük farklarını, fırsat maliyetleri üzerinden üretim kararlarını sorgulayarak test et.
2. Gümrük tarifelerinin ve kotaların yerli üretici/tüketici refahı ve 'Dara Kaybı' (Deadweight Loss) üzerindeki etkilerini kurgula.
3. Dış ticaret hadleri hesaplamalarını N=(Px /Pm )×100 formülü üzerinden kurguya dahil et.
4. Ticaret haddi aralıklarını ve verimlilik tablolarını LaTeX formatında sun.
Few-Shot Example (JSON):
JSON

{
  "q": "A ülkesi 1 birim emekle 10 Şarap veya 5 Kumaş; B ülkesi ise 2 Şarap veya 4 Kumaş üretebilmektedir. Ricardo'ya göre, dış ticaretin kârlı olması için 1 Kumaş karşılığındaki Şarap fiyatı (ticaret haddi) hangi aralıkta olmalıdır?",
  "o": [
    "$0,5 < Kumaş < 2$",
    "$1 < Kumaş < 4$",
    "$0,5 < Kumaş < 0,8$",
    "$2 < Kumaş < 5$",
    "A ülkesi her iki malda da üstün olduğu için ticaret gerçekleşmez."
  ],
  "a": 0,
  "exp": "Fırsat maliyetleri hesaplandığında; A ülkesinde $1 Kumaş = 2 Şarap$, B ülkesinde $1 Kumaş = 0,5 Şarap$ etmektedir. Karşılaştırmalı üstünlükler teorisine göre ticaret haddi, bu iki iç fiyat oranı ($0,5$ ve $2$) arasında gerçekleşmelidir."
}

14. Matematik & Sayısal Mantık
Instruction (Talimat):
1. "Denklem çözme" yerine "Denklem kurma" ve modelleme becerisini test et. Sorular şıklardan giderek çözülemeyecek yapısal kurguda olmalı.
2. Sayısal Mantık kurgularında birbirini kısıtlayan öncüller kullan ve "Kesinlikle doğrudur" veya "Hangisi olamaz?" kökleriyle tüm olasılıkları sorgulat.
3. Çeldiricilerde; "x tam sayı" gibi kısıtların unutulması veya ara basamak sonuçlarının şıkka konulması stratejisini izle.
4. Tüm matematiksel ifadeleri, denklemleri ve çözüm basamaklarını mutlaka LaTeX (S+40D=4800, △) formatında yaz.
Few-Shot Example (JSON):
JSON

{
  "q": "Bir tekstil atölyesinde sabit bir kesim maliyeti ($S$) ve değişken bir dikim maliyeti ($D$) bulunmaktadır. 40 gömlek üretildiğinde gömlek başına toplam maliyet $120$ TL, 100 gömlek üretildiğinde ise $102$ TL'dir. Buna göre 200 gömlek üretilmesi durumunda gömlek başına toplam maliyet kaç TL olur?",
  "o": [
    "90",
    "93",
    "96",
    "98",
    "99"
  ],
  "a": 2,
  "exp": "Denklemler: $S + 40D = 4800$ ve $S + 100D = 10200$. İki denklem farkından $60D = 5400 \\Rightarrow D = 90$ ve $S = 1200$ bulunur. 200 gömlek için toplam maliyet: $1200 + (200 \\times 90) = 19200$. Birim maliyet ise $19200 / 200 = 96$ TL olur."
}

15. İngilizce
Instruction (Talimat):
1. Kelime bilgisini bağlamsal ipucu (collocation) odaklı, dilbilgisini ise işlevsel kullanım üzerinden test et.
2. "Restatement" sorularında modal fiillerin (must,may,highly probable) ve miktar belirteçlerinin (most,some,few) kesinlik/olasılık düzeylerine odaklan.
3. Çeviri ve anlam sorularında "anlam kayması" yaratan zarf/sıfat değişimlerini temel çeldirici olarak kullan.
4. Diyalog ve paragraf kurgularında resmiyet düzeyini (academic register) ve mantıksal geçiş ifadelerini (however, therefore) sorgulat.
Few-Shot Example (JSON):
JSON

{
  "q": "Which of the following sentences provides the closest meaning to: 'It is highly probable that the central bank will implement a tighter monetary policy next month, given the sharp increase in current inflation rates.'?",
  "o": [
    "The central bank must adopt a tighter monetary policy next month because inflation rates have risen sharply.",
    "There is a slight possibility that the central bank might consider changing its policy if inflation continues to rise.",
    "The central bank is expected to tighten its monetary policy next month in response to the rapid rise in inflation.",
    "Unless the inflation rates drop, the central bank will definitely not change its current monetary policy.",
    "The central bank has already decided to implement a tighter policy to control the inflation rates."
  ],
  "a": 2,
  "exp": "Orijinal cümledeki 'highly probable' (yüksek olasılık) ifadesini en iyi 'is expected to' (beklenmektedir) karşılar. 'In response to' yapısı ise 'given the...' (göz önüne alındığında) ifadesinin neden-sonuç karşılığıdır. 'Must' (zorunluluk) ve 'already decided' (geçmiş kararlılık) orijinal anlamı bozar."
}

16. İş Hukuku
Instruction (Talimat):
1. 4857 Sayılı Kanun ekseninde; haklı/geçerli neden ayrımı ve fesih usulü (savunma alma zorunluluğu) üzerine vaka kurgula.
2. Kıdem/ihbar tazminatı hesaplama şartları ve işe iade davası öncesi "arabuluculuk" zorunluluğunu teknik çeldirici olarak kullan.
3. "İş güvencesi" kapsamındaki 6 aylık kıdem ve 30 işçi şartı gibi kısıtları vaka detaylarına yerleştir.
4. Analiz kısmında İş Kanunu madde numaralarına (m.18, m.19, m.25 vb.) atıf yap.
Few-Shot Example (JSON):
JSON

{
  "q": "3 yıl kıdemi olan İşçi (A), performans düşüklüğü gerekçesiyle savunması alınmadan, ihbar tazminatı peşin ödenerek işten çıkarılmıştır. (A), feshin geçersiz olduğunu iddia etmektedir. Bu durumdaki hukuki süreç için hangisi doğrudur?",
  "o": [
    "Fesih haklı nedenle yapıldığı için işçi hiçbir tazminata hak kazanamaz.",
    "Savunma alınmadığı için fesih geçersizdir; işçi doğrudan İş Mahkemesinde dava açabilir.",
    "İşçi kıdem tazminatı alır ancak ihbar tazminatı alamaz; arabulucuya başvurmalıdır.",
    "Savunma alınmaması fesihi usulden geçersiz kılar; işçi arabuluculuk sonrası işe iade davası açabilir.",
    "İşçi 6 aylık kıdem şartını sağlamadığı için iş güvencesinden yararlanamaz."
  ],
  "a": 3,
  "exp": "İş K. m.19 uyarınca, işçinin davranışı veya verimiyle ilgili fesihlerde savunma alınması şarttır. Savunma alınmaması feshin geçersizliğine yol açar. Ayrıca işe iade davası açmadan önce arabuluculuğa başvurmak zorunlu dava şartıdır."
}

17. Borçlar Hukuku
Instruction (Talimat):
1. İrade sakatlıkları (hata, hile, korkutma) ve "Yetkisiz Temsil" gibi borç ilişkisinin doğumundaki kritik süreçlere odaklan.
2. "Askıda geçersizlik" sürecinde temsil olunanın "onay (icazet)" yetkisi ve karşı tarafın haklarını vaka üzerinden sorgula.
3. Def'i (zamanaşımı vb.) ve İtiraz (hak düşürücü süre vb.) ayrımını çeldiricilerde teknik tuzak olarak kullan.
Few-Shot Example (JSON):
JSON

{
  "q": "(A), temsil yetkisi olmadığı halde (B)'nin temsilcisiymiş gibi (B)'ye ait antikayı (C)'ye satmış ve teslim etmiştir. (B) durumu öğrenince sessiz kalmış, (C) ise onay beklemektedir. Bu vakada sözleşmenin akıbeti nedir?",
  "o": [
    "Sözleşme yapıldığı andan itibaren kesin hükümsüzdür.",
    "Sözleşme askıda geçersizdir; (C) onay gelene kadar her an sözleşmeden dönebilir.",
    "(B) onay verirse sözleşme baştan itibaren geçerli olur; onay vermezse (A) menfi zararı tazmin eder.",
    "(C) iyiniyetli ise mülkiyeti taşınır rehni hükümleriyle kendiliğinden kazanır.",
    "(B)'nin sessiz kalması zımni icazet sayılır ve sözleşme kesinleşir."
  ],
  "a": 2,
  "exp": "TBK m.46 uyarınca yetkisiz temsilcinin işlemi askıda geçersizdir. Temsil olunan onay (icazet) verirse işlem geçmişe etkili olarak geçerli olur. Onay verilmezse işlem geçersiz kalır ve temsilci karşı tarafın uğradığı menfi zararı gidermekle yükümlüdür."
}

18. İşletme Yönetimi
Instruction (Talimat):
1. Tanım sorma; yönetim fonksiyonlarını (planlama, organizasyon vb.) ve organizasyon yapılarını (Matris, Şebeke vb.) yönetici davranışları üzerinden sorgula.
2. Matris organizasyon yapısındaki "çift amirlik" ve "komuta birliği ilkesinin ihlali" riskine odaklan.
3. Klasik, Neoklasik ve Modern teoriler arasındaki temel felsefe farklarını (Örn: Ekonomik insan vs. Sosyal insan) çeldirici yap.
Few-Shot Example (JSON):
JSON

{
  "q": "Bir işletmede mühendisler hem fonksiyonel müdürlerine hem de proje yöneticilerine raporlama yapmaktadır. Bu yapının temel riski ve yönetim teorisindeki karşılığı nedir?",
  "o": [
    "Komuta birliği ilkesinin ihlali nedeniyle yetki karmaşası; Matris Yapı.",
    "Uzmanlaşmanın azalması; Fonksiyonel Yapı.",
    "Yatay hiyerarşi nedeniyle karar alma sürecinin durması; Şebeke Yapı.",
    "Bölümleme hatası; Bölümsel (Divisional) Yapı.",
    "Stratejik zirvenin kontrolü kaybetmesi; Adokrasi."
  ],
  "a": 0,
  "exp": "Matris yapı, fonksiyonel ve ürün/proje temelli yapının birleşimidir. En büyük dezavantajı 'çift amirlik' (dual command) durumudur ve Fayol'un yönetim ilkelerinden olan 'komuta birliği' ilkesinin ihlal edilmesine yol açar."
}

19. Makro İktisat
Instruction (Talimat):
1. Toplam arz-talep dengesini IS-LM ve AS-AD modelleri üzerinden matematiksel/grafiksel mekanizmalarla ölç.
2. "Likidite Tuzağı" veya "Dışlama Etkisi (Crowding-out)" gibi uç durumların politika etkinliği (Para vs. Maliye) üzerindeki etkisini sorgula.
3. Klasik dikotomi (paranın tarafsızlığı) ve çarpan hesaplamalarındaki sızıntıları (vergi, ithalat) çeldirici olarak kullan.
4. Tüm değişkenleri ve esneklik değerlerini LaTeX (emi =∞,IS,LM) formatında yaz.
Few-Shot Example (JSON):
JSON

{
  "q": "Para talebinin faiz esnekliğinin sonsuz ($e_{mi} = \\infty$) olduğu bir 'Likidite Tuzağı' ortamında, otonom kamu harcamalarının ($G$) artırılmasının hasıla ($Y$) üzerindeki etkisi nedir?",
  "o": [
    "LM eğrisi yatay olduğu için 'tam dışlama' yaratır; hasıla değişmez.",
    "Para arzı artışı faizi düşüremeyeceği için maliye politikası etkisizdir.",
    "IS eğrisi sağa kayar, faizler değişmez ve hasıla maksimum çarpan etkisiyle artar.",
    "Yatırımın faiz esnekliği sıfır olduğu için sadece para politikası etkilidir.",
    "Fiyatlar genel düzeyi düşer ve ekonomi kendiliğinden tam istihdama döner."
  ],
  "a": 2,
  "exp": "Likidite tuzağında LM eğrisi yataydır. Kamu harcaması artışı IS eğrisini sağa kaydırır. Faiz oranları yükselmediği için yatırımların dışlanması (crowding-out) söz konusu olmaz ve maliye politikası en yüksek etkinlikte çalışır."
}

20. Türkiye Ekonomisi
Instruction (Talimat):
1. Tarihsel kırılma noktalarını (1923, 1980, 2001) ve bu dönemlerdeki sanayileşme stratejilerini (İthal ikameci vs. Dışa açık) test et.
2. 24 Ocak 1980 Kararları, 5 Nisan 1994 ve 2001 Güçlü Ekonomiye Geçiş Programı'nın karakteristik özelliklerini sorgula.
3. Ekonomik gösterge trendlerini (Cari açık, Enflasyon, GSYH) dönemlerle ilişkilendirerek çeldirici kurgula.
Few-Shot Example (JSON):
JSON

{
  "q": "Türkiye ekonomisinde 'İthal ikameci sanayileşmeden vazgeçilmesi' ve 'Dışa açık büyüme modeline geçilmesi' gibi radikal dönüşümler hangi kararlarla başlamıştır?",
  "o": [
    "1923 İzmir İktisat Kongresi Kararları",
    "1958 Devalüasyonu ve İstikrar Tedbirleri",
    "24 Ocak 1980 Kararları",
    "5 Nisan 1994 Ekonomik Önlemler Paketi",
    "2001 Güçlü Ekonomiye Geçiş Programı"
  ],
  "a": 2,
  "exp": "24 Ocak 1980 kararları, Türkiye'nin korumacı ve içe dönük ithal ikameci modelden vazgeçip, serbest piyasa ekonomisini ve dışa açık büyüme stratejisini benimsediği temel kırılma noktasıdır."
}

21. Ticaret Hukuku
Instruction (Talimat):
1. Ticari işletme, şirketler ve kıymetli evrak disiplinlerinde soyut hüküm yerine somut vaka (Genel Kurul kararı, çek/bono eksikliği) kurgula.
2. Limited ve Anonim şirketlerdeki asgari sermaye, pay devri şekil şartları ve ortak sorumluluğu farklarını çeldirici olarak kullan.
3. Kambiyo senetlerinde ciro zinciri sürekliliği, beyaz/tam ciro farkları ve protesto sürelerine odaklan.
4. Analiz kısmında mutlaka TTK madde numaralarına (m.683, m.686 vb.) atıf yap.
Few-Shot Example (JSON):
JSON

{
  "q": "(A), lehine düzenlenmiş $100.000$ TL değerindeki bir bonoyu imzalayarak (B)’ye teslim etmiş; (B) ise hiçbir ibare yazmadan senedi (C)’ye devretmiştir. Düzenleyen (D), (C)'nin isminin zincirde geçmediğini belirterek ödemeden kaçınmıştır. Hukuki durum nedir?",
  "o": [
    "Ciro zinciri (B)’nin isminin yazılmaması nedeniyle kopmuştur; (C) meşru hamil sayılmaz.",
    "(A)’nın yaptığı işlem 'Tam Ciro', (B)’nin yaptığı işlem 'Beyaz Ciro'dur; zincir kopmamıştır.",
    "(A) beyaz ciro yapmıştır; beyaz ciro ile alan (B), senedi sadece teslimle (C)’ye devredebilir ve (C) meşru hamil olur.",
    "Bono emre yazılı olduğu için ismen belirtilmeyen devirler geçersizdir.",
    "(C), cirantaların imza geçerliliğini ispat etmekle yükümlüdür."
  ],
  "a": 2,
  "exp": "TTK m.683 uyarınca beyaz ciro (sadece imza), senedi hamiline yazılı senede yaklaştırır. Beyaz ciro ile senedi devralan kişi, ismini yazmadan sadece teslimle senedi başkasına devredebilir. Bu durum TTK m.686 kapsamında ciro zincirini koparmaz."
}

22. Finans Matematiği
Instruction (Talimat):
1. Paranın Zaman Değerini (TVM) nominal/efektif faiz geçişleri ve anüite (taksitli ödeme) senaryoları üzerinden test et.
2. Bileşiklendirme sıklığı hatalarını (yıllık faiz/dönemlik hesaplama uyumsuzluğu) temel çeldirici yap.
3. Peşin ödemeli (Annuity Due) ve dönem sonu (Ordinary Annuity) farklarını kurguya dahil et.
4. Tüm formülleri ve hesaplamaları LaTeX (PV=∑(1+r)tCt ) formatında sun.
Few-Shot Example (JSON):
JSON

{
  "q": "Bir yatırımcı, 5 yıl boyunca her 3 ayda bir dönem sonlarında $20.000$ TL'yi yıllık $\%16$ nominal faizle fon hesabına yatıracaktır. Gelecek değer hesabı için gerekli olan efektif dönem faizi ($i$) ve toplam dönem sayısı ($n$) nedir?",
  "o": [
    "$i=0.16; n=5$",
    "$i=0.04; n=5$",
    "$i=0.04; n=20$",
    "$i=0.0133; n=60$",
    "$i=0.16; n=20$"
  ],
  "a": 2,
  "exp": "Üçer aylık periyotlar için yıllık nominal faiz $(\\%16)$ dörde bölünmelidir: $16 / 4 = 4$ yani $i=0.04$. Toplam dönem sayısı ise yıl sayısı ile yıldaki periyot sayısının çarpımıdır: $5 \\times 4 = 20$. Formül: $FV = A \\times \\frac{(1+i)^n - 1}{i}$."
}

23. Finansal Yönetim
Instruction (Talimat):
1. Oran analizi (Ratio Analysis) ve sermaye maliyeti (WACC) hesaplamalarını işletme kararlarıyla ilişkilendir.
2. Finansal kaldıracın Öz Kaynak Karlılığı (ROE) üzerindeki pozitif/negatif etkilerini ve risk dengesini sorgula.
3. Sermaye bütçelemesinde NPV, IRR ve Geri Ödeme Süresi (Payback) kriterleri üzerinden proje karşılaştırma senaryoları kurgula.
4. Analiz kısmında Du-Pont Analizi veya Kaldıraç Derecesi (DFL) mantığına atıf yap.
Few-Shot Example (JSON):
JSON

{
  "q": "Toplam varlıkları $1.000.000$ TL, borç/öz kaynak oranı 1, borç maliyeti $\%10$, vergi oranı $\%20$ ve FVÖK tutarı $200.000$ TL olan bir firmanın Öz Kaynak Karlılığı (ROE) nedir?",
  "o": [
    "ROE $\%15$’tir; kaldıraç pozitiftir.",
    "ROE $\%12$’dir; kaldıraç olumludur.",
    "ROE $\%24$’tür; kaldıraç karlılığı artırmıştır.",
    "ROE $\%10$’dur; kaldıraç etkisi nötrdür.",
    "ROE $\%20$’dir; öz kaynak karlılığı faiz öncesidir."
  ],
  "a": 2,
  "exp": "Öz Kaynak = $500.000$ TL, Borç = $500.000$ TL. Faiz Gideri = $500.000 \\times 0.10 = 50.000$ TL. Vergi Öncesi Kâr = $200.000 - 50.000 = 150.000$ TL. Net Kâr = $150.000 \\times 0.80 = 120.000$ TL. $ROE = 120.000 / 500.000 = \\%24$."
}

24. Sözel Mantık
Instruction (Talimat):
1. Hikaye kurgusundan önce mutlaka bir "Sayısal Dağılım Denklemi" (2+2+3=7 gibi) kur ve kısıtları bu matematiksel dağılıma göre yerleştir.
2. "Sadece X ve Y aynı gruptadır" gibi dışlayıcı kısıtları, o grubu diğer tüm değişkenlere kapatan aşılması imkansız birer "duvar" olarak kullan.
3. "Kesinlikle Doğrudur" veya "Kesinlikle Yanlıştır" soru köklerini kullanarak adayı; tüm olasılık tablolarını (olasılık ağacı) kurmaya ve değişkenleri sabitlemeye zorla.
4. Olasılık dahilinde olan ancak her senaryoda doğrulanmayan durumları en güçlü çeldiriciler olarak seçeneklere yerleştir.
Few-Shot Example (JSON):
JSON

{
  "q": "Teftiş, Risk ve Kredi bölümlerine atanacak A, B, C, D, E, F ve G isimli yedi uzman yardımcısı için:\n- Her bölüme en az iki, en fazla üç kişi atanmıştır.\n- A ve B aynı bölümdedir.\n- C, sadece G ile aynı bölümdedir.\n- D ve E farklı bölümlere atanmıştır.\n- F, Teftiş bölümüne atanmıştır.\nBu bilgilere göre, 'Kredi' bölümüne aşağıdakilerden hangisi kesinlikle atanmıştır?",
  "o": [
    "A",
    "C",
    "D",
    "E",
    "G"
  ],
  "a": 1,
  "exp": "Toplam 7 kişi $2+2+3$ şeklinde dağılmalıdır. 'C ve G sadece aynı bölümdedir' ifadesi, bu ikilinin 2 kişilik bir grubu kapattığını ve yanlarına kimsenin gelemeyeceğini gösterir. F Teftiş'teyse ve A-B birlikteyse, dağılımın bozulmaması için C ve G'nin 'Kredi' veya 'Risk'ten birini tamamen kapatması gerekir. Ancak kesinlik sorulduğunda, C ve G'nin kendi içindeki bölünmezliği onları meşru hamil yapar."
}
