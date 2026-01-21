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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "Fail (A), elindeki silahla (B)'ye ateş etmiş ve onu öldürmüştür. Türk Ceza Kanunu'na göre bir insanı kasten öldürmenin cezası nedir?",
  "o": [
    "Müebbet hapis cezası verilir.",
    "Failin eline sağlık denir.",
    "B'nin ailesine çiçek gönderilir.",
    "Fail, tatile gönderilerek ödüllendirilir.",
    "Olay yerinde dondurma dağıtılır."
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) Olay örgüsü analiz gerektirmez, sadece kanun metnini ezbere dayalı sorar. 2) Çeldiriciler tamamen ciddiyetten uzak ve mantık dışıdır, bu da doğru cevabı aşırı belirgin kılar. 3) Hukuki bir tartışma veya 'iştirak/hata' gibi karmaşık bir yapı içermez."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "Bir firmanın toplam maliyeti $TC$ ve toplam geliri $TR$ ise, firma kâr etmek için ne yapmalıdır?",
  "o": [
    "Gelirini maliyetinden büyük tutmalıdır ($TR > TC$).",
    "Dükkanı kapatıp sinemaya gitmelidir.",
    "Fiyatları bedava yapmalıdır.",
    "Tüm çalışanları işten çıkarıp tek başına çalışmalıdır.",
    "Üretimi durdurup sadece dua etmelidir."
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) Analitik bir türev işlemi veya $MC = MR$ dengesi sorgulanmamıştır. 2) Çeldiriciler iktisadi mantıkla bağdaşmayan absürt seçeneklerdir. 3) Cevap, iktisat bilmeyen birinin bile genel kültürle bulabileceği kadar yüzeyseldir."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "Bir işletme kasasına 10.000 TL nakit para girdiğinde, muhasebe mantığına göre bu parayı nereye yazarsınız?",
  "o": [
    "Kasa hesabının borç tarafına.",
    "Cebimdeki gizli bölmeye.",
    "Masanın sağ çekmecesine.",
    "Bakkal defterinin arkasına.",
    "Hatıra defterine 'Bugün çok para kazandık' diye not düşülür."
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) Bütüncül bir bilanço etkisi veya dönemsellik ilkesi sorgulanmaz. 2) Çeldiriciler profesyonel muhasebe terimlerinden (Alacak, Aktif, Pasif vb.) tamamen uzaktır. 3) Banka muhasebesinin teknik detaylarını veya mevduatın pasif niteliğini test etmez."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "Bir veri setindeki tüm sayılar 5 ise, bu veri setinin aritmetik ortalaması ($\mu$) kaçtır?",
  "o": [
    "5",
    "Sayıları toplamak çok zordur.",
    "Tahmin edilemez bir sayıdır.",
    "Hava durumuna göre değişir.",
    "Sıfırdır çünkü 5 uğursuz bir sayıdır."
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) Herhangi bir veri manipülasyonunun parametreler üzerindeki etkisini ölçmez. 2) Varyans ve standart sapma arasındaki ilişkiyi test etmez. 3) Doğru cevap sorunun içinde gizlidir ve çeldiriciler sayısal bir mantık gütmez."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "Devletin vergi toplamasının temel sebebi aşağıdakilerden hangisidir?",
  "o": [
    "Kamu hizmetlerini finanse etmek.",
    "Vatandaşın cebindeki parayı kıskanmak.",
    "Daha büyük bir kumbaraya sahip olmak.",
    "Vergi dairesindeki memurların canı sıkıldığı için.",
    "Rengarenk vergi makbuzları basmak için."
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) Vergi yansıması, esneklik veya insidans gibi maliye teorilerine girilmemiştir. 2) Çeldiriciler akademik ciddiyetten yoksundur ve ayırt ediciliği yoktur. 3) Dalton-Musgrave kuralı gibi teknik analizler yerine çok basit bir 'niçin' sorusudur."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "Miras hukukuna göre, bir kişi öldüğünde mallarının mirasçılarına paylaştırılması işlemine ne ad verilir ve mirasın yarısı ($1/2$) neyi ifade eder?",
  "o": [
    "Miras paylaşımı denir; yarısı ise terekenin tam ortadan ikiye bölünmesidir.",
    "Piknik yapmak denir; yarısı ise sandviçin yarısıdır.",
    "Saklambaç denir; yarısı ise ebenin saklandığı yerdir.",
    "Alışveriş denir; yarısı ise %50 indirimdir.",
    "Uyumak denir; yarısı ise öğle uykusudur."
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) Zümre sistemi veya saklı pay hesaplaması gibi teknik detaylara girilmemiş, sorunun içinde cevap (paylaşım) verilmiştir. 2) Çeldiriciler hukuk diliyle tamamen ilgisiz ve absürttür. 3) LaTeX kullanımı sadece yüzeysel bir rakam belirtmekten öteye geçmemiştir."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "Elinizde bir dava dilekçesi varsa, bu dilekçeyi davanın görülmesi için nereye götürmeniz gerekir?",
  "o": [
    "Adliyedeki ilgili mahkemeye.",
    "En yakın mahalle bakkalına.",
    "Şehir stadındaki hakem odasına.",
    "Belediyenin fen işleri müdürlüğüne.",
    "Postaneye pul yapıştırmak için."
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) Kesin yetki, dava şartı veya HMK madde atıfları gibi hukuki süreçler tamamen göz ardı edilmiştir. 2) Görev ve yetki kuralları arasındaki teknik fark test edilmemiştir. 3) Seçenekler bir hukuk öğrencisi için ayırt edici olmaktan uzaktır."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "Bir banka çalışanının, bankadaki paraları kendi hesabına geçirmesi kötü bir davranış mıdır?",
  "o": [
    "Evet, buna zimmet denir ve suçtur.",
    "Hayır, banka çok zengin olduğu için sorun olmaz.",
    "Sadece hafta sonları yaparsa suç değildir.",
    "Paraları geri getirirse ödül verilmelidir.",
    "Banka müdürü görmediği sürece serbesttir."
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) 5411 Sayılı Kanun'un m.160 gibi spesifik düzenlemelerine atıf yapmamaktadır. 2) Zimmetin nitelikli halleri yerine ahlaki bir yargı sorgulanmıştır. 3) Çeldiriciler hukuki bir dayanağı olmayan, ciddiyetsiz ifadelerdir."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "BCG Matrisi'nde kullanılan 'Nakit İneği' (Cash Cow) ifadesindeki hayvan aşağıdakilerden hangisidir?",
  "o": [
    "İnek",
    "Zürafa",
    "Penguen",
    "Uçan fil",
    "Ejderha"
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) Stratejik bir analiz (pazar payı, büyüme hızı vb.) veya PLC aşaması sorgulanmamıştır. 2) Pazarlama terminolojisindeki metaforun sadece kelime anlamı üzerinden soru kurgulanmıştır. 3) Öğrencinin pazarlama yetkinliğini ölçmek yerine sadece okuma becerisini test eder."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "Eğer cebinizde 100 TL varsa ve Merkez Bankası para arzını artırırsa, elinizdeki kağıt parçasına ne ad verilir?",
  "o": [
    "Para",
    "Resim kağıdı",
    "Uçak yapmak için kullanılan materyal",
    "Peçete",
    "Gazete kupürü"
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) Para çarpanı, zorunlu karşılıklar veya Fisher Etkisi gibi hiçbir makro değişken kullanılmamıştır. 2) Sayısal bir hesaplama veya likidite analizi içermez. 3) Çeldiriciler tamamen konu dışıdır."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "Bir müşteri bankadaki hesabına 100.000 TL nakit para yatırdığında, banka bu parayı ne yapar?",
  "o": [
    "Parayı kasaya koyar ve sevinir.",
    "Parayı hemen harcar.",
    "Parayı müşteriye geri verir.",
    "Parayı gömer.",
    "Parayı bankanın bahçesine saklar."
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) Bankacılık muhasebesindeki 'mevduatın pasif karakterli olması' mantığını hiç kullanmaz. 2) Nazım hesaplar veya karşılık ayırma gibi teknik bir derinlik içermez. 3) Çeldiriciler tamamen gerçek dışı ve gayri ciddidir, ölçme değeri yoktur."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "Borçlu, kendisine gelen ödeme emrine 7 gün içinde itiraz etmelidir. Eğer borçlu itiraz etmek istiyorsa ne kadar süresi vardır?",
  "o": [
    "7 gün",
    "100 yıl",
    "5 dakika",
    "Canı ne zaman isterse",
    "Mavi bir günde"
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) Cevap zaten soru kökünde ('7 gün içinde') verilmiştir. 2) Takip yollarının niteliği veya İİK m.67-68 gibi usuli farklar sorgulanmamıştır. 3) Çeldiriciler bir hukuk öğrencisinin bilgisini test etmekten uzaktır."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "Dış ticaret haddi formülü $N = (P_x / P_m) \\times 100$ şeklindedir. Eğer ihraç fiyat endeksi ($P_x$) 100 ve ithal fiyat endeksi ($P_m$) de 100 ise sonuç kaç çıkar?",
  "o": [
    "100",
    "Sıfır",
    "Gökkuşağı",
    "Çok büyük bir sayı",
    "Hesaplanamaz"
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) Karşılaştırmalı üstünlükler veya fırsat maliyeti gibi analitik bir kurgu yoktur. 2) Dara kaybı veya tüketici refahı gibi ticaret politikası etkileri test edilmez. 3) Soru sadece basit bir çarpma işlemidir, ekonomik çıkarım gerektirmez."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "Bir bakkal tanesi 5 TL'den 2 elma alırsa toplam kaç TL öder? (İpucu: $2 \\times 5$ işlemini yapınız)",
  "o": [
    "10",
    "-500",
    "Bir milyon",
    "Elmanın rengi",
    "Bakkalın ismi"
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) Denklem kurma becerisini değil, ilkokul seviyesinde işlem becerisini ölçer. 2) Şıklardan giderek çözülmeyi bırakın, soru içinde çözüm yolu dahi verilmiştir. 3) Sayısal mantık kısıtları ve 'kesinlikle' gibi olasılık sorguları içermez."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "Aşağıdaki cümledeki boşluğa hangisi gelmelidir: 'I ___ a student.'",
  "o": [
    "am",
    "apple",
    "run",
    "yellow",
    "quickly"
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) Akademik bir register (resmiyet düzeyi) veya bağlamsal ipucu barındırmaz. 2) Restatement sorularındaki o ince modal farklarını (must/may) test etmez. 3) Çeldiriciler dilbilgisi kurallarıyla bile örtüşmeyen, alakasız kelime türleridir (sıfat, zarf, meyve ismi)."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "Bir işçi işten çıkarıldığında, çalıştığı yıllar karşılığında kendisine ödenen paraya genel olarak ne ad verilir?",
  "o": [
    "Tazminat",
    "Haftalık harçlık",
    "Bayram şekeri parası",
    "Yol yardımı mahiyetinde bir çikolata",
    "Kayıp eşya bedeli"
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) İş güvencesi kapsamındaki 6 aylık kıdem veya 30 işçi şartı gibi teknik kısıtları içermez. 2) Haklı ve geçerli neden ayrımını veya savunma alma zorunluluğunu (m.19) test etmez. 3) Çeldiriciler ciddiyetten tamamen uzaktır."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "İki kişi bir konuda anlaşıp el sıkışırsa veya kağıda imza atarsa, aralarında oluşan bu hukuki bağa ne denir?",
  "o": [
    "Sözleşme",
    "Resim çalışması",
    "İsim-şehir oyunu",
    "Karalama defteri etkinliği",
    "Akşam yemeği randevusu"
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) İrade sakatlıkları (hata, hile, korkutma) veya yetkisiz temsil gibi borcun doğumuna dair kritik süreçleri sorgulamaz. 2) Def'i ve itiraz ayrımı gibi teknik tuzaklar barındırmaz. 3) Cevap, hiçbir hukuk bilgisi gerektirmeyecek kadar yüzeyseldir."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "Bir şirketin başında duran ve her şeye karar veren kişiye ne ad verilir?",
  "o": [
    "Yönetici",
    "Yolcu",
    "Seyirci",
    "Top toplayıcı",
    "Kantin görevlisi"
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) Matris veya şebeke gibi modern organizasyon yapılarını sorgulamaz. 2) Yönetim teorileri (Klasik, Neoklasik) arasındaki felsefi farkları test etmez. 3) 'Yönetici' kavramını stratejik bir fonksiyon olarak değil, sadece bir isim olarak sorar."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "Piyasadaki tüm ürünlerin fiyatları sürekli olarak artıyorsa, bu ekonomik duruma ne ad verilir?",
  "o": [
    "Enflasyon",
    "Bedava",
    "Büyük indirim",
    "Hediye çeki",
    "Gökten para yağması"
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) IS-LM veya AS-AD modelleri gibi denge analizlerini içermez. 2) Likidite tuzağı veya dışlama etkisi gibi makro kurguları test etmez. 3) Çeldiriciler ekonomik mantıkla tamamen bağdaşmayan absürt seçeneklerdir."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "Türkiye'nin resmi para birimi aşağıdakilerden hangisidir?",
  "o": [
    "Türk Lirası",
    "Altın külçesi",
    "Puan",
    "Oyun parası",
    "Takas jetonu"
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) 1980 veya 2001 gibi kritik ekonomik dönüm noktalarını sorgulamaz. 2) Sanayileşme stratejileri (ithal ikameci vs. dışa açık) üzerine bir analiz içermez. 3) Cari açık veya GSYH trendleri gibi göstergeleri dönemlerle ilişkilendirmez."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "Türk Ticaret Kanunu'na göre, üzerinde 'ÇEK' ibaresi bulunan ve bankaya ödeme emri veren kıymetli evraka genel olarak ne ad verilir?",
  "o": [
    "Çek",
    "Uçak bileti",
    "Market fişi",
    "Doğum günü kartı",
    "Vesikalık fotoğraf"
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) Ciro zinciri, beyaz/tam ciro veya TTK m.683 gibi hiçbir teknik detayı sorgulamaz. 2) Cevap soru kökünde açıkça verilmiştir. 3) Çeldiriciler hukuk disipliniyle tamamen ilgisizdir."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "Bir yatırımcı bugünkü $1$ TL'sini hiçbir faiz ($r=0$) işletilmeyen bir kumbaraya koyarsa, 100 yıl sonra kumbarada kaç TL olur?",
  "o": [
    "$1$ TL",
    "Sonsuz para",
    "Sıfır TL çünkü kumbara acıkmıştır.",
    "Bütün dünya parası",
    "Hesap makinesi bozulur."
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) Nominal/efektif faiz geçişi veya anüite hesaplaması içermez. 2) Bileşiklendirme sıklığı gibi temel bir finansal mantığı test etmez. 3) Matematiksel bir işlem gerektirmeyecek kadar basittir."
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



Bad Few-Shot Example (JSON):
JSON

{
  "q": "Bir işletmenin finansal kararlarını yöneten ve 'Finansal Yönetici' olarak adlandırılan kişi, temel olarak neyi yönetir?",
  "o": [
    "Parayı",
    "Hava durumunu",
    "Ofis bitkilerini",
    "Çalışanların rüyalarını",
    "Öğle yemeği menüsünü"
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) WACC, ROE veya NPV gibi hiçbir finansal rasyoyu veya bütçeleme kriterini sorgulamaz. 2) Du-Pont analizi veya kaldıraç derecesi gibi teknik bir altyapı barındırmaz. 3) Çeldiriciler mesleki ciddiyetten uzaktır."
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

Bad Few-Shot Example (JSON):
JSON

{
  "q": "Ayşe ve Fatma aynı odaya girmiştir. Bu bilgilere göre, Ayşe ile aynı odada olan kişi kesinlikle kimdir?",
  "o": [
    "Fatma",
    "Görünmez bir dev",
    "Kimse yoktur",
    "Bütün mahalle",
    "Uzaylılar"
  ],
  "a": 0,
  "exp": "Bu soru 'kötü' bir örnektir çünkü; 1) Bir sayısal dağılım denklemi veya karmaşık kısıtlar içermez. 2) Olasılık tablosu kurmayı gerektirecek bir derinliği yoktur. 3) 'Kesinlikle' kökü, hiçbir analiz gerektirmeden doğrudan metinden okunabilmektedir."
}
