export interface GuidelineDef {
    id: number;
    instruction: string;
    few_shot_example?: any;
    bad_few_shot_example?: any;
}

export const SUBJECT_GUIDELINES: Record<string, GuidelineDef> = {
    "Sözel Mantık": {
        id: 1,
        instruction: "1. Değişkenlerin sayısal dağılım dengesini ve kısıtların matematiksel sağlamasını temel alan bir kurgu oluştur.\n2. Gruplandırma ve sıralama kısıtlarını, diğer tüm olasılıkları net şekilde eleyen keskin ve aşılması imkansız sınırlar olarak kurgula.\n3. \"Kesinlik\" bildiren soru köklerini kullanarak adayı; tüm ihtimal tablolarını ve olasılık ağaçlarını eksiksiz kurmaya zorla.\n4. Olası görünen ancak her senaryoda doğrulanmayan durumları, Bloom’un analiz düzeyine uygun en güçlü çeldiriciler olarak kullan.",
        few_shot_example: {
  "q": "Bir kurumun Teftiş, Risk ve Kredi birimlerine atanacak A, B, C, D, E, F ve G isimli yedi uzman yardımcısının yerleştirmeleriyle ilgili şunlar bilinmektedir:\n* Her bölüme en az iki, en fazla üç kişi atanmıştır.\n* A ve B aynı bölüme atanmışken; D ve E farklı bölümlere atanmıştır.\n* C, sadece G ile aynı bölümdedir.\n* F, Teftiş bölümüne atanmıştır.\nBu bilgilere göre, aşağıdakilerden hangisi kesinlikle doğrudur?",
  "o": [
    "D, Teftiş bölümüne atanmıştır.",
    "A ve B, Kredi bölümüne atanmıştır.",
    "E, Risk bölümüne atanmıştır.",
    "Risk bölümüne toplam iki kişi atanmıştır.",
    "F ve D aynı bölüme atanmıştır."
  ],
  "a": 0,
  "exp": "Toplam 7 kişi 2-2-3 şeklinde dağılmalıdır. \"C, sadece G ile aynı bölümdedir\" ifadesi, bu iki kişinin başka kimsenin bulunmadığı 2 kişilik bir grubu kapattığını kanıtlar (Kritik kısıt). F Teftiş'te ise ve A-B ikilisi beraber hareket etmek zorundaysa; A-B ikilisi ya Teftiş'e (3. kişi olarak) ya da boşta kalan diğer bölüme gider. Ancak C-G ikilisi 2 kişilik kontenjanı doldurduğu için, geriye kalan D ve E'den biri mutlaka F'nin yanına (Teftiş) diğeri ise A-B'nin yanına gitmelidir. Bu durumda C ve G'nin bulunduğu bölüm dışında kalan diğer iki bölümden birinde 3, diğerinde 2 kişi olur. C ve G'nin kapattığı bölüm 2 kişilik olduğundan, Risk veya Kredi'den birinin 2 kişiyle sınırlı kalacağı kesinleşir.",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "Ayşe ve Fatma aynı odaya girmiştir. Bu bilgilere göre, Ayşe ile aynı odada olan kişi kesinlikle kimdir?",
  "o": [
    "Fatma",
    "Görünmez bir dev",
    "Odada kimse yoktur",
    "Bütün mahalle",
    "Uzaylılar"
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) Hiçbir sayısal dağılım dengesi veya değişkenler arası kısıt içermez. 2) \"Kesinlikle\" kökü bir analiz gerektirmemekte, veri doğrudan metinden okunmaktadır. 3) Çeldiriciler akademik ciddiyetten uzak ve mantıksal bir olasılık ağacı sunmamaktadır.",
  "evidence": ""
}
    },
    "Finansal Yönetim": {
        id: 2,
        instruction: "1. Finansal analiz tekniklerini ve maliyet hesaplamalarını, stratejik işletme kararlarıyla ve nakit akışıyla bütüncül şekilde ilişkilendir.\n2. Sermaye yapısı, karlılık göstergeleri ve risk yönetimi arasındaki dinamik dengeyi ve kaldıraç etkilerini sorgulayan vakalar oluştur.\n3. Yatırım kararlarının değerlendirilmesinde kullanılan sayısal kriterleri, projeler arası karşılaştırma ve seçim senaryolarına dök.\n4. Analiz kısmında performans analizi yaklaşımlarını ve finansal kaldıraç mantığını temel alan teorik çıkarımlara yer ver.",
        few_shot_example: {
  "q": "Toplam varlıkları $1.000.000$ TL olan bir işletmenin borç/öz kaynak oranı 1, borçlanma maliyeti $\\%10$, kurumlar vergisi oranı $\\%20$’dir. İşletmenin ilgili dönem sonu Faiz ve Vergi Öncesi Kârı (FVÖK) $200.000$ TL olarak gerçekleşmiştir.\nİşletmenin Öz Kaynak Karlılığı (ROE) ve finansal kaldıraç etkisi hakkında aşağıdakilerden hangisi doğrudur?",
  "o": [
    "ROE $\\%15$’tir; borçlanma maliyeti varlık karlılığından düşük olduğu için kaldıraç negatiftir.",
    "ROE $\\%12$’dir; finansal kaldıraç öz kaynak karlılığını baskılamıştır.",
    "ROE $\\%24$’tür; varlık karlılığı borç maliyetinden yüksek olduğu için kaldıraç olumludur.",
    "ROE $\\%20$’dir; borç kullanımı öz kaynak karlılığı üzerinde nötr bir etki yaratmıştır.",
    "ROE $\\%10$’dur; işletme yabancı kaynak kullanımından dolayı vergi kalkanı avantajını yitirmiştir."
  ],
  "a": 0,
  "exp": "Borç/Öz Kaynak oranı 1 ise: Öz Kaynak=$500.000$ TL, Borç=$500.000$ TL'dir. Faiz Gideri: $500.000 \\times \\%10 = 50.000$ TL. Vergi Öncesi Kâr: $200.000 - 50.000 = 150.000$ TL. Net Kâr: $150.000 \\times (1 - 0.20) = 120.000$ TL. $ROE = 120.000 / 500.000 = \\%24$. Varlık karlılığı (ROA) vergi öncesi $\\%20$ olup borç maliyetinden ($\\%10$) yüksek olduğu için kaldıraç pozitiftir ve ROE'yi yukarı çekmiştir.",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "Bir bakkal tanesi $5$ TL'den $2$ elma alırsa toplam kaç TL öder? (İpucu: $2 \\times 5$ işlemini yapınız)",
  "o": [
    "10",
    "-500",
    "Bir milyon",
    "Elmanın rengi",
    "Bakkalın ismi"
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) Denklem kurma veya matematiksel modelleme becerisini değil, basit aritmetik işlemi ölçer. 2) Soru kökünde çözüm yolu verilerek ayırt edicilik yok edilmiştir. 3) Çeldiriciler tamamen ciddiyetten uzak ve mantıksızdır.",
  "evidence": ""
}
    },
    "Muhasebe": {
        id: 3,
        instruction: "1. Münferit yevmiye kayıtları yerine, işlemlerin mali tabloların bütününe ve öz kaynak yapısına olan etkisini sorgulayan kurgular yap.\n2. Muhasebenin temel kavramlarını, dönem sonu envanter işlemlerini ve değerleme esaslarını kapsayan bir yapı oluştur.\n3. Hesapların niteliğini ve işleyiş kurallarını, adaydaki kavramsal yanılgıları hedef alan güçlü ve teknik çeldiricilerle destekle.\n4. Analiz kısmında genel kabul görmüş ilkeleri ve güncel finansal raporlama standartlarının kavramsal çerçevesini temel al.",
        few_shot_example: {
  "q": "İşletme, gelecek 3 aya ait toplam $90.000$ TL tutarındaki kira bedelini peşin ödemiş ve ödeme anında tamamını \"770 Genel Yönetim Giderleri\" hesabına borç kaydetmiştir. Dönem sonu (1 ay sonra) itibarıyla yapılması gereken düzeltme kaydının mali tablolar üzerindeki etkisi nedir?",
  "o": [
    "Aktif toplamı $60.000$ TL azalırken, dönem kârı değişmez.",
    "Öz kaynaklar $60.000$ TL artarken, aktif toplamı da aynı tutarda artış gösterir.",
    "\"Gelecek Aylara Ait Giderler\" hesabı $30.000$ TL borçlandırılır; bu işlem net kârı azaltır.",
    "\"Kasa\" hesabı $90.000$ TL alacaklandırılır; öz kaynak yapısı güçlenir.",
    "Aktif toplamı ve net kâr üzerinde herhangi bir düzeltme etkisi oluşmaz."
  ],
  "a": 0,
  "exp": "Dönemsellik ilkesi gereği, 3 aylık peşin ödenen kiranın sadece 1 ayı ($\\%30.000$ TL) giderleştirilmelidir. Başlangıçta tamamı gider yazıldığı için, henüz gerçekleşmemiş 2 aylık ($60.000$ TL) kısım giderlerden çıkarılarak \"180 Gelecek Aylara Ait Giderler\" (Aktif) hesabına aktarılmalıdır. Giderlerin azalması dönem kârını (Öz Kaynak) artırırken, \"180\" nolu hesabın borçlandırılması aktif toplamını artırır.",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "Bir işletme kasasına $10.000$ TL nakit para girdiğinde, muhasebe mantığına göre bu parayı nereye yazarsınız?",
  "o": [
    "Kasa hesabının borç tarafına.",
    "Cebimdeki gizli bölmeye.",
    "Masanın sağ çekmecesine.",
    "Bakkal defterinin arkasına.",
    "Hatıra defterine not düşülür."
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) Muhasebenin temel kavramlarını veya mali tablo analizini içermez. 2) Yevmiye kaydı ötesinde bir etki sorgulamaz. 3) Çeldiriciler teknik terminolojiden (Aktif, Alacak, Öz Kaynak) yoksundur.",
  "evidence": ""
}
    },
    "Maliye": {
        id: 4,
        instruction: "1. Kamu gelirleri ve harcamalarının ekonomik etkilerini, piyasa dengesi ve arz/talep esneklik kavramlarıyla ilişkilendirerek kurgula.\n2. Mali hukuk süreçlerini, zamanaşımı türlerini ve farklı mali ekollerin kuramsal yaklaşımlarını içeren mukayeseli senaryolar oluştur.\n3. Vergi yükü dağılımını ve maliye politikası araçlarını, farklı piyasa koşulları ve ekstrem ekonomik durumlar üzerinden sorgula.\n4. Analiz kısmında bütçe ilkelerini ve kamu maliyesi teorilerini Bloom’un değerlendirme basamağına uygun şekilde işleyerek sun.",
        few_shot_example: {
  "q": "Arz esnekliğinin pozitif olduğu bir piyasada, talebin tam esnek ($e_d = \\infty$) olduğu bir mal üzerinden birim başına spesifik bir tüketim vergisi alınması kararlaştırılmıştır.\nDalton-Musgrave kuralı çerçevesinde, bu verginin yansıması ve nihai yükü hakkında aşağıdakilerden hangisi doğrudur?",
  "o": [
    "Verginin tamamı tüketiciye yansıtılır; piyasa fiyatı vergi kadar artar.",
    "Vergi yükü, tüketici ve üretici arasında esneklik oranlarına göre paylaşılır.",
    "Verginin tamamı üretici üzerinde kalır; malın piyasa fiyatı değişmez.",
    "Fiyat, vergi miktarından daha fazla artarak aşırı yük oluşturur.",
    "Talep tam esnek olduğu için devlet vergi gelirinden mahrum kalır."
  ],
  "a": 0,
  "exp": "Maliye teorisine göre vergi yükü, esnekliği düşük olan (fiyata daha az tepki veren) tarafın üzerinde kalır. Talebin tam esnek olması, tüketicilerin fiyat artışına sonsuz tepki vereceğini gösterir. Bu durumda üretici, vergiyi fiyata yansıtamaz; zira en ufak bir fiyat artışında talep sıfıra iner. Dolayısıyla verginin tamamı üretici tarafından karşılanır ve piyasa fiyatı değişmez.",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "Devletin vergi toplamasının temel sebebi aşağıdakilerden hangisidir?",
  "o": [
    "Kamu hizmetlerini finanse etmek.",
    "Vatandaşın cebindeki parayı kıskanmak.",
    "Daha büyük bir kumbaraya sahip olmak.",
    "Vergi dairesindeki memurların canı sıkıldığı için.",
    "Rengarenk vergi makbuzları basmak için."
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) Vergi yansıması, esneklik veya insidans gibi hiçbir akademik teoriyi test etmez. 2) Çeldiriciler ayırt edici değildir ve gülünçtür. 3) Analiz gerektiren bir kurgu sunmaz.",
  "evidence": ""
}
    },
    "Medeni Usul Hukuku": {
        id: 5,
        instruction: "1. Yargılama hukukunun usul kurallarını, hak düşürücü süreleri ve usul ekonomisi ilkesini merkeze alan teknik kurgular yap.\n2. Dava şartları ve ilk itirazlar arasındaki hukuki ayrımı, yargılamanın her aşaması için somut vaka örnekleri üzerinden sorgula.\n3. Kanun yolları, kesinleşme süreçleri ve süre başlangıçlarını adayda mantıksal kafa karışıklığı yaratacak çeldiricilerle kurgula.\n4. Analiz kısmında güncel mevzuat hükümlerine ve yargılama hukukunun temel prensiplerine dayalı teknik ve net çıkarımlar yap.",
        few_shot_example: {
  "q": "Davacı (A), Ankara sınırları içerisinde yer alan taşınmazına yönelik müdahalenin men'i davasını, davalı (B)’nin ikametgah adresi olan İstanbul Asliye Hukuk Mahkemesi'nde açmıştır. Davalı (B) cevap dilekçesinde herhangi bir yetki itirazında bulunmamıştır.\nHukuk Muhakemeleri Kanunu (HMK) hükümleri uyarınca, mahkemenin bu aşamada tesis etmesi gereken işlem aşağıdakilerden hangisidir?",
  "o": [
    "Yetki itirazı süresinde yapılmadığı için davaya bakmaya devam etmelidir.",
    "Yetki itirazı olmasa dahi yetkisizlik kararı vererek dosyayı re'sen Ankara mahkemesine göndermelidir.",
    "Davalının zımni kabulü nedeniyle yetki sözleşmesi kurulmuş saymalıdır.",
    "Dosyayı görevsizlik nedeniyle reddedip sulh hukuk mahkemesine göndermelidir.",
    "Davayı usul ekonomisi ilkesi gereği İstanbul'da sonuçlandırmalıdır."
  ],
  "a": 0,
  "exp": "HMK m.12 uyarınca taşınmazın aynına ilişkin davalarda \"kesin yetki\" kuralı geçerlidir. Kesin yetki, HMK m.114/1-ç uyarınca bir \"dava şartı\"dır. HMK m.115 gereğince mahkeme, dava şartlarının mevcut olup olmadığını davanın her aşamasında kendiliğinden (re'sen) gözetmekle yükümlüdür. Bu nedenle taraflar itiraz etmese dahi mahkeme yetkisizlik kararı vermelidir.",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "Elinizde bir dava dilekçesi varsa, bu dilekçeyi davanın görülmesi için nereye götürmeniz gerekir?",
  "o": [
    "Adliyedeki ilgili mahkemeye.",
    "En yakın mahalle bakkalına.",
    "Şehir stadındaki hakem odasına.",
    "Belediyenin fen işleri müdürlüğüne.",
    "Postaneye pul yapıştırmak için."
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) Kesin yetki ve dava şartı gibi usul hukuku kavramlarını tamamen dışlamaktadır. 2) Mevzuat hükümlerine atıf yapmamaktadır. 3) Çeldiriciler mesleki yeterliliği ölçmekten uzaktır.",
  "evidence": ""
}
    },
    "Banka Muhasebesi": {
        id: 6,
        instruction: "1. Bankacılığın kendine özgü bilanço yapısını (mevduat-pasif, kredi-aktif ilişkisi) ve bu yapının operasyonel yansımalarını temel alan kurgular oluştur.\n2. Nazım hesaplar ile bilanço içi hesaplar arasındaki işleyiş farkını ve özellikle teminat işlemlerindeki muhasebe kayıtlarını ayırt edici birer çeldirici olarak kullan.\n3. Aktif kalitesini belirleyen donuk alacak süreçlerini ve karşılık işlemlerinin bankanın net aktif değeri ile öz kaynakları üzerindeki etkilerini sorgula.\n4. Tüm hesap kodlarını, tutarları ve oranları teknik tutarlılık adına 100.000 TL, %20 gibi net ve belirgin formatlarda belirtilmesini sağla.",
        few_shot_example: {
  "q": "Bir banka, vadesinde tahsil edilemeyen $100.000$ TL tutarındaki ticari kredisini \"Donuk Alacaklar\" (Tahsili Gecikmiş Alacaklar) statüsüne aktarmış ve ihtiyatlılık ilkesi gereği bu alacak için $\\%20$ oranında \"Özel Karşılık\" ayırmıştır.\nSöz konusu muhasebe kaydının ve karşılık işleminin bankanın mali tabloları üzerindeki net etkisi aşağıdakilerden hangisidir?",
  "o": [
    "Aktif toplamı $20.000$ TL azalırken, öz kaynaklar ve dönem kârı aynı tutarda azalış gösterir.",
    "Aktif toplamı değişmez; sadece kredi hesapları ile karşılık hesapları arasında virman gerçekleşir.",
    "Pasif toplamı $20.000$ TL artarken, bankanın öz kaynak karlılığı pozitif etkilenir.",
    "Nazım hesaplarda $100.000$ TL'lik artış meydana gelirken bilanço içi hesaplar etkilenmez.",
    "Aktif toplamı $100.000$ TL azalır ve \"Karşılık Giderleri\" hesabı alacaklandırılarak kapatılır."
  ],
  "a": 0,
  "exp": "Bankacılık muhasebesinde karşılık ayırma işlemi, aktifte yer alan \"Eksi (-)\" karakterli bir düzenleyici hesap (Özel Karşılıklar) aracılığıyla yapılır. $\\%20$ oranındaki karşılık ($20.000$ TL), \"644 Karşılık Giderleri\" hesabına borç kaydedilerek dönem kârını ve dolayısıyla öz kaynakları düşürür. Aktif tarafta ise brüt kredi tutarı değişmese de net aktif değeri (Krediler - Karşılıklar) $20.000$ TL azalır. Çeldiricilerdeki \"Nazım hesap\" vurgusu, teminat ile kredi riski arasındaki farkı ayırt etmek için kullanılmıştır.",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "Bir müşteri bankadaki hesabına $100.000$ TL nakit para yatırdığında, banka bu parayı ne yapar?",
  "o": [
    "Parayı kasaya koyar ve sevinir.",
    "Parayı hemen harcar.",
    "Parayı müşteriye geri verir.",
    "Parayı gömer.",
    "Parayı bankanın bahçesine saklar."
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) Mevduatın banka için \"pasif\" bir yükümlülük, nakdin ise \"aktif\" bir değer olduğu temel muhasebe mantığını sorgulamaz. 2) Sayısal bir rasyo veya teknik bir kayıt (donuk alacak, karşılık vb.) içermez. 3) Çeldiriciler akademik ciddiyetten ve mesleki gerçeklikten tamamen uzaktır.",
  "evidence": ""
}
    },
    "Uluslararası Ticaret": {
        id: 7,
        instruction: "1. Uluslararası uzmanlaşma teorilerini, alternatif maliyetler ve üretim avantajları üzerinden stratejik karar verme süreçleriyle ilişkilendirerek test et.\n2. Dış ticaret politikası araçlarının ve kısıtlamaların piyasa refahı, yerli üretici/tüketici dengesi ve ekonomik kayıplar üzerindeki etkilerini kurgula.\n3. Ticaret hadlerinin hesaplanması ve değişim analizlerini, $N = (P_x / P_m) \\times 100$ gibi temel matematiksel modelleri kurguya dahil ederek sorgula.\n4. Verimlilik tablolarını, ticaret haddi aralıklarını ve ilgili tüm formülleri sistematik bir görsel düzen ve netlikle sun.",
        few_shot_example: {
  "q": "A ülkesi 1 birim emekle 10 birim Şarap veya 5 birim Kumaş; B ülkesi ise aynı emekle 2 birim Şarap veya 4 birim Kumaş üretebilmektedir.\nDavid Ricardo'nun \"Karşılaştırmalı Üstünlükler Teorisi\" uyarınca, dış ticaretin her iki ülke için de kârlı olabilmesi için 1 birim Kumaş karşılığındaki Şarap fiyatını belirleyen \"Ticaret Haddi\" hangi aralıkta gerçekleşmelidir?",
  "o": [
    "$0,5 < Kumaş < 2$",
    "$1 < Kumaş < 4$",
    "$0,5 < Kumaş < 0,8$",
    "$2 < Kumaş < 5$",
    "A ülkesi her iki malda da mutlak üstün olduğu için ticaret gerçekleşmez."
  ],
  "a": 0,
  "exp": "Ülkelerin iç maliyet oranları (fırsat maliyetleri) hesaplanmalıdır. A ülkesinde 1 Kumaşın maliyeti $10/5 = 2$ Şarap'tır. B ülkesinde ise 1 Kumaşın maliyeti $2/4 = 0,5$ Şarap'tır. Ticaretin kârlı olması için uluslararası fiyatın (ticaret haddinin), ülkelerin kendi iç fiyat oranları olan $0,5$ ile $2$ arasında bir değer alması gerekir. Çeldiricilerde yer alan \"mutlak üstünlük\" vurgusu, adayı Ricardo ile Smith arasındaki kuramsal farkı sorgulamaya iter.",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "Dış ticaret haddi formülü $N = (P_x / P_m) \\times 100$ şeklindedir. Eğer ihraç fiyat endeksi ($P_x$) 100 ve ithal fiyat endeksi ($P_m$) de 100 ise sonuç kaç çıkar?",
  "o": [
    "100",
    "Sıfır",
    "Gökkuşağı",
    "Çok büyük bir sayı",
    "Hesaplanamaz"
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) Hiçbir uluslararası uzmanlaşma teorisini veya stratejik kararı test etmez. 2) Sadece basit bir aritmetik işlem olup ekonomik analiz düzeyi \"sıfır\"dır. 3) Çeldiriciler sınav formatına uygun olmayan, mantıksız ifadeler içerir.",
  "evidence": ""
}
    },
    "İngilizce": {
        id: 8,
        instruction: "1. Kelime bilgisini bağlamsal birliktelikler (collocations) odaklı, dil bilgisini ise iletişimsel ve işlevsel kullanım yetkinliği üzerinden ölçen kurgular oluştur.\n2. Yakın anlam sorularında kipliklerin (modals) ve miktar belirleyicilerin (quantifiers) cümleye kattığı kesinlik veya olasılık derecelerine odaklan.\n3. Anlam ve çeviri odaklı sorularda, niteleyicilerin (zarf/sıfat) yarattığı anlam nüanslarını ve kavram kaymalarını temel çeldirici unsur olarak kullan.\n4. Metin bütünlüğünü ve diyalog akışını, akademik dil düzeyine (academic register) ve mantıksal geçiş ifadelerinin doğru kullanımına göre sorgulat.",
        few_shot_example: {
  "q": "Which of the following sentences provides the closest meaning to the statement below?\n\"It is highly probable that the central bank will implement a tighter monetary policy next month, given the sharp increase in current inflation rates.\"",
  "o": [
    "The central bank must adopt a tighter monetary policy next month because inflation rates have risen sharply.",
    "There is a slight possibility that the central bank might consider changing its policy if inflation continues to rise.",
    "The central bank is expected to tighten its monetary policy next month in response to the rapid rise in inflation.",
    "Unless the inflation rates drop, the central bank will definitely not change its current monetary policy.",
    "The central bank has already decided to implement a tighter policy to control the inflation rates."
  ],
  "a": 0,
  "exp": "Orijinal cümledeki \"highly probable\" (yüksek olasılık) ifadesini en iyi karşılayan akademik yapı \"is expected to\" (beklenmektedir) ifadesidir. \"Given the...\" (göz önüne alındığında) bağlacı ise \"in response to\" (yanıt olarak) ile bağlamsal olarak örtüşür. A şıkkındaki \"must\" kesinlik bildirerek olasılık derecesini bozar; E şıkkındaki \"already decided\" ise gerçekleşmiş bir eylemden bahsettiği için hatalıdır.",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "Aşağıdaki cümledeki boşluğa hangisi gelmelidir: \"I ___ a student.\"",
  "o": [
    "am",
    "apple",
    "run",
    "yellow",
    "quickly"
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) Hiçbir akademik register veya bağlamsal derinlik içermez. 2) Kipliklerin (modals) veya belirleyicilerin anlam nüanslarını ölçmez. 3) Çeldiriciler dilbilgisi kurallarıyla bile örtüşmeyen, rastgele seçilmiş kelimelerdir.",
  "evidence": ""
}
    },
    "Borçlar Hukuku": {
        id: 9,
        instruction: "1. Sözleşme özgürlüğünün sınırları, irade sakatlıkları ve yetkisiz temsil gibi borç ilişkisinin doğumundaki kritik süreçlere ve kurucu unsurlara odaklan.\n2. Hukuki işlemlerin geçerlilik şartlarını, onay (icazet) mekanizmalarını ve tarafların bu süreçteki haklarını somut vaka analizleri üzerinden sorgula.\n3. Hakların kullanılmasını engelleyen \"def'i\" ve hakları doğrudan sona erdiren \"itiraz\" ayrımını, teknik derinliği olan güçlü çeldiriciler olarak kurgula.\n4. Borçlar hukukunun temel prensiplerini ve borcun sona erme hallerini, adayı hukuki muhakeme yapmaya zorlayacak senaryolara dök.",
        few_shot_example: {
  "q": "(A), temsil yetkisi olmadığı halde (B)'nin temsilcisiymiş gibi hareket ederek (B)'ye ait antika bir vazoyu iyiniyetli (C)'ye satmış ve teslim etmiştir. (B) durumu öğrendikten sonra uzun süre sessiz kalmış, (C) ise işlemin geçerliliği konusunda (B)'den onay beklemektedir.\nTürk Borçlar Kanunu (TBK) hükümleri uyarınca, bu hukuki işlemin akıbeti hakkında aşağıdakilerden hangisi doğrudur?",
  "o": [
    "Sözleşme yapıldığı andan itibaren kesin hükümsüzdür ve hiçbir şekilde geçerli kılınamaz.",
    "İşlem \"askıda geçersiz\" olup, (B) onay (icazet) vermediği sürece (B)'yi bağlamaz; ancak (C) uygun bir süreyle bağlı kalır.",
    "(B)'nin sessiz kalması \"zımni icazet\" sayılır ve sözleşme kendiliğinden kesinleşir.",
    "(C) iyiniyetli olduğu için mülkiyeti taşınır rehni hükümleri uyarınca kendiliğinden kazanır.",
    "Temsil yetkisi baştan mevcut olmadığı için (A), (C)'nin \"müsbet zararını\" tazmin etmekle yükümlüdür."
  ],
  "a": 0,
  "exp": "TBK m.46 uyarınca yetkisiz temsilcinin yaptığı işlem \"askıda geçersiz\"dir. Temsil olunan (B), açık veya zımni bir onay vermediği sürece işlem geçersiz kalmaya devam eder. Onay verilmezse (A), iyiniyetli (C)'nin \"menfi zararını\" (sözleşmenin geçersizliği nedeniyle uğranılan zarar) tazmin eder. Sessiz kalmanın icazet sayılmaması ve müsbet/menfi zarar ayrımı güçlü çeldiricileri oluşturur.",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "İki kişi bir konuda anlaşıp el sıkışırsa veya kağıda imza atarsa, aralarında oluşan bu hukuki bağa ne denir?",
  "o": [
    "Sözleşme",
    "Resim çalışması",
    "İsim-şehir oyunu",
    "Karalama defteri etkinliği",
    "Akşam yemeği randevusu"
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) Yetkisiz temsil veya irade sakatlıkları gibi teknik süreçleri içermez. 2) Cevap hiçbir hukuki muhakeme gerektirmeyen, genel kültür düzeyinin dahi altındaki bir bilgidir. 3) Çeldiriciler akademik ciddiyetten yoksundur.",
  "evidence": ""
}
    },
    "İşletme Yönetimi": {
        id: 10,
        instruction: "1. Yönetim fonksiyonlarını ve organizasyonel yapılanma modellerini, tanımlardan ziyade somut yönetici davranışları ve karar alma süreçleri üzerinden sorgula.\n2. Karmaşık organizasyon yapılarındaki yetki-sorumluluk dengesini, komuta birliği ilkesine yönelik riskleri ve olası yönetim çatışmalarını temel al.\n3. Yönetim düşüncesinin tarihsel gelişimini ve farklı ekoller arasındaki felsefi yaklaşım farklarını, adayda kavramsal çıkarım yaptıracak şekilde çeldirici yap.\n4. Analiz kısmında modern işletme modellerini ve stratejik yönetim yaklaşımlarını, güncel yönetsel paradigmalarla ilişkilendirerek sun.",
        few_shot_example: {
  "q": "Bir yazılım şirketinde görev yapan mühendisler, hem bağlı bulundukları \"Yazılım Geliştirme Bölüm Başkanı\"na hem de üzerinde çalıştıkları projenin \"Proje Yöneticisi\"ne karşı sorumludur.\nOrganizasyon yapısındaki bu kurgu ve beraberinde getirdiği \"çift amirlik\" durumu, Henri Fayol’un hangi yönetim ilkesinin doğrudan ihlal edilmesine yol açar?",
  "o": [
    "Komuta birliği (Unity of Command) ilkesi; Matris Organizasyon Yapısı.",
    "Yönetim birliği (Unity of Direction) ilkesi; Şebeke Yapı.",
    "Yetki ve Sorumluluk dengesi; Fonksiyonel Yapı.",
    "Hiyerarşi (Scalar Chain) ilkesi; Bölümsel Yapı.",
    "İş bölümü ve Uzmanlaşma ilkesi; Adokrasi."
  ],
  "a": 0,
  "exp": "Matris organizasyon yapısı, fonksiyonel ve proje temelli yapıların kesiştiği bir modeldir. Bu yapının en büyük riski, çalışanın birden fazla üstten emir almasıdır. Bu durum, Fayol'un \"her çalışanın yalnızca bir üstten emir alması gerektiğini\" savunan \"Komuta Birliği\" ilkesini ihlal eder. Çeldiricilerde yer alan \"Yönetim Birliği\" ile karıştırılma ihtimali, adayın teknik bilgisini sorgulayan analiz düzeyinde bir unsurdur.",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
    },
    "Ceza Hukuku": {
        id: 11,
        instruction: "1. Soyut tanımlardan kaçınarak; suçun maddi ve manevi unsurları ile illiyet bağını irdeleyen somut olay (vaka) analizleri kurgula.\n2. Suça iştirak biçimlerinin ve icra hareketlerinin (teşebbüs) iç içe geçtiği, çoklu fail içeren karmaşık senaryolara odaklan.\n3. Çeldiricilerde kanundaki birbirine yakın (sınırdaş) hukuki kurumları ve sorumluluğu kaldıran halleri teknik birer tuzak olarak kullan.\n4. Analiz kısmında mutlaka ilgili kanun maddelerine ve temel ceza hukuku ilkelerine dayalı hukuki gerekçelendirmeler yap.",
        few_shot_example: {
  "q": "Fail (A), aralarında husumet bulunan (B)’yi öldürmesi için (C)’yi azmettirmiştir. (C), (B) zannederek (B)’nin ikiz kardeşi (D)’ye ateş etmiş; mermi (D)’yi sıyırmış, o sırada yoldan geçen (E) ise seken mermiyle hayatını kaybetmiştir.\nTürk Ceza Kanunu (TCK) hükümleri ve doktrindeki \"şahısta hata\" ile \"hedefte sapma\" ilkeleri çerçevesinde, (C)’nin ceza sorumluluğu hakkında aşağıdakilerden hangisi doğrudur?",
  "o": [
    "(C), (D)’ye karşı \"Kasten Öldürmeye Teşebbüs\", (E)’ye karşı \"Olası Kastla Öldürme\"den sorumlu olur.",
    "(C), (D) üzerindeki hatası nedeniyle kasten hareket etmiş sayılmaz; sadece (E) için \"Taksirle Öldürme\"den cezalandırılır.",
    "(C), (D)’ye karşı \"Kasten Öldürmeye Teşebbüs\", (E)’ye karşı ise \"Taksirle Öldürme\"den sorumlu olur ve fikri içtima hükümleri uygulanır.",
    "(C), \"Şahısta Hata\" ve \"Hedefte Sapma\" birleştiği için yalnızca tek bir \"Kasten Öldürme\" suçundan cezalandırılır.",
    "(C)’nin fiili kaza ve tesadüf sayılır; olayda illiyet bağı kesildiği için (C) ve (A) hakkında ceza verilmesine yer olmadığına karar verilir."
  ],
  "a": 0,
  "exp": "Olayda iki farklı hukuki durum iç içedir. (C)’nin (B) yerine (D)’ye ateş etmesi \"şahısta hata\"dır ($TCK \\ m.30/1$) ve bu hata failin kasten öldürme iradesini ortadan kaldırmaz. Ancak merminin sekip (E)’ye isabet etmesi \"hedefte sapma\"dır. Yargıtay uygulaması ve doktrin uyarınca; hedefte sapma durumunda fail, hem hata sonucu hedef aldığı kişiye karşı \"teşebbüs\"ten hem de zarar gören üçüncü kişiye karşı \"taksirle öldürme\"den sorumlu olur. $TCK \\ m.44$ (Fikri İçtima) gereği ise bu iki suçtan en ağır cezayı gerektiren üzerinden tek bir ceza verilir.",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "Fail (A), elindeki silahla (B)'ye ateş etmiş ve onu öldürmüştür. Türk Ceza Kanunu'na göre bir insanı kasten öldürmenin cezası nedir?",
  "o": [
    "Müebbet hapis cezası verilir.",
    "Failin eline sağlık denir.",
    "B'nin ailesine çiçek gönderilir.",
    "Fail, tatile gönderilerek ödüllendirilir.",
    "Olay yerinde dondurma dağıtılır."
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) Hiçbir vaka analizi, iştirak (azmettirme) veya hata türü (hedefte sapma vb.) içermez. 2) Sadece kanun metnini ezbere dayalı sorar, muhakeme yeteneğini ölçmez. 3) Çeldiriciler gayri ciddidir ve doğru cevabı test tekniği açısından aşırı belirgin kılar.",
  "evidence": ""
}
    },
    "Türkiye Ekonomisi": {
        id: 12,
        instruction: "1. Ekonomi tarihindeki temel dönüşüm evrelerini ve bu dönemlerde uygulanan kalkınma/sanayileşme stratejilerini mukayeseli şekilde test et.\n2. Yapısal değişimleri tetikleyen majör istikrar programlarının karakteristik özelliklerini ve sektörel etkilerini sorgulayan kurgular oluştur.\n3. Temel makroekonomik göstergelerin (büyüme, enflasyon, dış denge vb.) tarihsel trendlerini dönemlerin ekonomik ruhuyla ilişkilendirerek çeldirici kurgula.\n4. Soruları sadece bilgi düzeyinde bırakmayıp, dönemler arası sebep-sonuç ilişkilerini kuran analiz düzeyinde kurgula.",
        few_shot_example: {
  "q": "Türkiye ekonomisinde 1960’lı yıllardan itibaren uygulanan \"Planlı Dönem\" ve \"İthal İkameci Sanayileşme\" stratejisinden vazgeçilerek, serbest piyasa ekonomisi ve \"Dışa Açık Büyüme\" modeline geçişin temelleri atılmıştır.\nSöz konusu radikal yapısal dönüşümün başlangıç noktası ve bu dönemin karakteristik özelliği olan \"negatif reel faiz-aşırı değerli TL\" sarmalını kırmayı hedefleyen temel istikrar paketi aşağıdakilerden hangisidir?",
  "o": [
    "1923 İzmir İktisat Kongresi Kararları",
    "1958 Devalüasyonu ve IMF İstikrar Tedbirleri",
    "24 Ocak 1980 Kararları",
    "5 Nisan 1994 Ekonomik Önlemler Paketi",
    "2001 Güçlü Ekonomiye Geçiş Programı"
  ],
  "a": 0,
  "exp": "24 Ocak 1980 kararları, Türkiye ekonomisi için bir \"rejim değişikliği\" niteliğindedir. Bu kararlarla korumacı ithal ikameci modelden vazgeçilmiş; ihracata dayalı sanayileşme, döviz kurunun serbest bırakılması ve piyasa mekanizmasının öncelenmesi hedeflenmiştir. A, B ve D şıkları da önemli dönüm noktaları olsa da \"dışa açılma\" ve \"ithal ikamesinden vazgeçiş\" denince akla gelen tek majör kırılma 1980 kararlarıdır.",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "Türkiye'nin resmi para birimi aşağıdakilerden hangisidir?",
  "o": [
    "Türk Lirası",
    "Altın külçesi",
    "Puan",
    "Oyun parası",
    "Takas jetonu"
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) Türkiye ekonomisinin tarihsel gelişim evrelerini veya kalkınma stratejilerini sorgulamaz. 2) Sebep-sonuç ilişkisi kuran analiz düzeyinde bir kurgu sunmaz. 3) Çeldiriciler sınav ciddiyetinden uzaktır.",
  "evidence": ""
}
    },
    "Finans Matematiği": {
        id: 13,
        instruction: "1. Paranın zaman değeri kavramını; farklı faiz türleri, ödeme planları ve taksitli nakit akışı senaryoları üzerinden bütüncül şekilde test et.\n2. Zaman birimi ve faiz oranı arasındaki uyumsuzlukları (dönemsellik hataları) adayda işlem hatası yaratacak temel çeldiriciler olarak kullan.\n3. Ödeme zamanlamasındaki farkların (dönem başı/sonu) bugünkü ve gelecekteki değer üzerindeki matematiksel etkilerini kurguya dahil et.\n4. Tüm matematiksel modelleri, anüite formüllerini ve hesaplama süreçlerini $PV = \\sum \\frac{C_t}{(1+r)^t}$ gibi net LaTeX formatında sun.",
        few_shot_example: {
  "q": "Bir yatırımcı, 5 yıl boyunca her 3 ayda bir (dönem sonlarında) $20.000$ TL'yi yıllık $\\%16$ nominal faiz uygulanan bir yatırım fonuna yatıracaktır.\nAnüite hesaplamalarında kullanılacak olan \"efektif dönem faizi\" ($i$) ve \"toplam dönem sayısı\" ($n$) değişkenleri aşağıdakilerden hangisinde doğru olarak verilmiştir?",
  "o": [
    "$i=0.16; n=5$",
    "$i=0.04; n=5$",
    "$i=0.04; n=20$",
    "$i=0.0133; n=60$",
    "$i=0.16; n=20$"
  ],
  "a": 0,
  "exp": "Finans matematiğinde faiz oranı ile dönem birimi uyumlu olmalıdır. Yıllık nominal faiz $\\%16$ ise ve ödemeler 3 ayda bir (yılda 4 kez) yapılıyorsa; efektif dönem faizi $i = 0.16 / 4 = 0.04$ olur. Toplam dönem sayısı ise ödeme periyodu ile yılın çarpımıdır: $n = 5 \\times 4 = 20$. Gelecek değer formülü:",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "Bir yatırımcı bugünkü $1$ TL'sini hiçbir faiz ($r=0$) işletilmeyen bir kumbaraya koyarsa, 100 yıl sonra kumbarada kaç TL olur?",
  "o": [
    "$1$ TL",
    "Sonsuz para",
    "Sıfır TL çünkü kumbara acıkmıştır.",
    "Bütün dünya parası",
    "Hesap makinesi bozulur."
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) Paranın zaman değerini veya anüite formüllerini test etmez. 2) Dönemsellik farkları gibi bir teknik tuzak içermez. 3) Finansal bir mantık gerektirmeyecek kadar basittir ve çeldiriciler anlamsızdır.",
  "evidence": ""
}
    },
    "Mikro İktisat": {
        id: 14,
        instruction: "1. Analitik düşünmeyi zorlayan değişken etkileşimlerini ve piyasa dengesi değişimlerini (fiyat ve miktar etkileri) temel alan kurgular yap.\n2. Marjinal analiz yöntemlerini, optimizasyon koşullarını ve üretim/tüketim dengesi hesaplamalarını içeren sayısal veya grafiksel senaryolar oluştur.\n3. Arz ve talep modellerinde \"eğri üzerindeki hareket\" ile \"eğrinin kayması\" arasındaki kavramsal farkı temel yanıltıcı unsur olarak kullan.\n4. Tüm iktisadi fonksiyonları, kısıtları ve sembolleri teknik doğruluk adına $STC$, $Q^2$, $P=10$ gibi LaTeX formatında belirt.",
        few_shot_example: {
  "q": "Tam rekabet piyasasında faaliyet gösteren bir firmanın kısa dönem toplam maliyet fonksiyonu $STC = Q^3 - 4Q^2 + 10Q + 20$ olarak verilmiştir. Piyasa fiyatının $P = 10$ olduğu varsayıldığında;\nFirmanın kârını maksimize eden üretim düzeyi ($Q$) nedir?",
  "o": [
    "$Q=4$ birim üretir ve aşırı kâr elde eder.",
    "$Q=1$ birim üretir ve zarar etmesine rağmen üretime devam eder.",
    "$Q=4$ birim üretir ve sadece normal kâr elde eder.",
    "$Q=2$ birim üretir ve başabaş noktasındadır.",
    "$Q=8/3$ birim üretir; marjinal maliyetin fiyata eşitlendiği noktada dengeye gelir."
  ],
  "a": 0,
  "exp": "Tam rekabette kâr maksimizasyonu için $P = MC$ koşulu sağlanmalıdır. Marjinal maliyet ($MC$), $STC$ fonksiyonunun türevidir:",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "Bir firmanın toplam maliyeti $TC$ ve toplam geliri $TR$ ise, firma kâr etmek için ne yapmalıdır?",
  "o": [
    "Gelirini maliyetinden büyük tutmalıdır ($TR > TC$).",
    "Dükkanı kapatıp sinemaya gitmelidir.",
    "Fiyatları bedava yapmalıdır.",
    "Tüm çalışanları işten çıkarıp tek başına çalışmalıdır.",
    "Üretimi durdurup sadece dua etmelidir."
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) Analitik bir türev veya optimizasyon ($MC=MR$) sorgusu içermez. 2) Çeldiriciler iktisadi terminolojiden yoksundur. 3) Cevap, herhangi bir eğitim almamış birinin bile verebileceği kadar sığdır.",
  "evidence": ""
}
    },
    "İstatistik": {
        id: 15,
        instruction: "1. Salt işlem yerine; veri setindeki değişimlerin ve manipülasyonların merkezi eğilim ve yayılım ölçüleri üzerindeki istatistiksel etkisini sorgula.\n2. Değişkenlik ölçüleri arasındaki matematiksel ilişkileri ve birimden arındırılmış karşılaştırma tekniklerini ayırt edici özellik olarak kullan.\n3. Aykırı değerlerin (outliers) veri dağılımını nasıl saptırdığını ve hangi parametreleri ne yönde etkilediğini analiz düzeyinde test et.\n4. Tüm istatistiksel parametreleri, test istatistiklerini ve sembolleri $\\mu, \\sigma^2, \\bar{x}$ gibi standart LaTeX formatında yaz.",
        few_shot_example: {
  "q": "Bir gözlem setindeki tüm değerlerin $k$ ($k>0$) gibi pozitif bir sabit sayı ile çarpıldığı bir senaryoda;\nVeri setinin aritmetik ortalaması ($\\mu$), varyansı ($\\sigma^2$) ve değişim katsayısı ($DK$) bu işlemden nasıl etkilenir?",
  "o": [
    "$\\mu$ $k$ katına çıkar, $\\sigma^2$ değişmez, $DK$ $k$ katına çıkar.",
    "$\\mu$ $k$ birim artar, $\\sigma^2$ $k^2$ katına çıkar, $DK$ değişmez.",
    "$\\mu$ $k$ katına çıkar, $\\sigma^2$ $k^2$ katına çıkar, $DK$ değişmez.",
    "$\\mu$ $k$ katına çıkar, $\\sigma^2$ $k$ katına çıkar, $DK$ azalır.",
    "Sadece varyans etkilenir, diğer parametreler sabit kalır."
  ],
  "a": 0,
  "exp": "İstatistiksel özellikler gereği; tüm değerler $k$ ile çarpıldığında aritmetik ortalama da $k$ ile çarpılır ($\\mu_{yeni} = k \\cdot \\mu$). Varyans, değerlerin ortalamadan farklarının karesi olduğu için $k^2$ katına çıkar ($\\sigma^2_{yeni} = k^2 \\cdot \\sigma^2$). Değişim katsayısı ise $DK = (\\sigma / \\mu) \\cdot 100$ formülüyle hesaplanır. Hem pay ($\\sigma$) hem payda ($\\mu$) $k$ katına çıktığı için oran değişmez.",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "Bir veri setindeki tüm sayılar $5$ ise, bu veri setinin aritmetik ortalaması ($\\mu$) kaçtır?",
  "o": [
    "5",
    "Sayıları toplamak çok zordur.",
    "Tahmin edilemez bir sayıdır.",
    "Hava durumuna göre değişir.",
    "Sıfırdır çünkü 5 uğursuz bir sayıdır."
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) Veri manipülasyonunun merkezi eğilim ve yayılım ölçüleri üzerindeki etkisini analiz etmez. 2) Aykırı değer veya varyans ilişkisini test etmez. 3) Doğru cevap sorunun metninde verilmiştir ve seçenekler bilimsel değildir.",
  "evidence": ""
}
    },
    "Medeni Hukuk": {
        id: 16,
        instruction: "1. Hak ve fiil ehliyeti, kısıtlılık halleri ve vesayet rejimini içeren somut hayat olayları (vaka) üzerinden hukuki muhakeme yaptır.\n2. Miras hukukunun temel prensiplerini; zümre sistemi, yasal mirasçılık ve saklı pay dengeleri üzerinden analiz düzeyinde sorgula.\n3. Hukuki işlemlerin geçersizlik halleri (yokluk ve butlan türleri) arasındaki teknik ve sonuç odaklı farkları ayırt edici çeldiriciler olarak kurgula.\n4. Miras payı oranlarını ve matematiksel paylaşımları $1/2$ veya $1/4$ gibi net LaTeX formatında sunulmasını sağla.",
        few_shot_example: {
  "q": "Miras bırakan (M), geride sağ kalan eşi (E) ile annesi (A) ve babası (B) hayatta iken vefat etmiştir. (M), sağlığında yaptığı bir ölüme bağlı tasarrufla mirasının tamamını bir vakfa bağışlamıştır.\nNet tereke değeri $1.200.000$ TL olduğuna göre; sağ kalan eş (E) ve babanın (B) \"Saklı Pay\" miktarları aşağıdakilerden hangisinde doğru olarak verilmiştir?",
  "o": [
    "(E): $600.000$ TL, (B): $100.000$ TL",
    "(E): $300.000$ TL, (B): $75.000$ TL",
    "(E): $600.000$ TL, (B): $150.000$ TL",
    "(E): $300.000$ TL, (B): $50.000$ TL",
    "(E): $600.000$ TL, (B): Saklı payı bulunmamaktadır."
  ],
  "a": 0,
  "exp": "Sağ kalan eş, 2. zümre (ana-baba) ile mirasçı olduğunda yasal miras payı $1/2$’dir. Eşin bu durumdaki saklı payı, yasal payının tamamıdır ($1/1$). Dolayısıyla eşin saklı payı: $1.200.000 \\times 1/2 = 600.000$ TL olur. Ana ve babanın her birinin yasal payı ise kalan $1/2$’nin yarısı, yani $1/4$’tür. Ana ve babanın saklı payı, yasal paylarının yarısı ($1/2$) kadardır. Bu durumda babanın saklı payı: $1/4 \\times 1/2 = 1/8$ olup, $1.200.000 / 8 = 150.000$ TL olarak hesaplanır.",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "Miras hukukuna göre, bir kişi öldüğünde mallarının mirasçılarına paylaştırılması işlemine ne ad verilir ve mirasın yarısı ($1/2$) neyi ifade eder?",
  "o": [
    "Miras paylaşımı denir; yarısı ise terekenin tam ortadan ikiye bölünmesidir.",
    "Piknik yapmak denir; yarısı ise sandviçin yarısıdır.",
    "Saklambaç denir; yarısı ise ebenin saklandığı yerdir.",
    "Alışveriş denir; yarısı ise $\\%50$ indirimdir.",
    "Uyumak denir; yarısı ise öğle uykusudur."
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) Zümre sistemi veya saklı pay gibi hukuki analiz gerektiren hiçbir teknik detay içermez. 2) Çeldiriciler akademik ciddiyetten uzak, absürt ve ölçme değeri olmayan ifadelerdir. 3) Soru, cevap anahtarını kendi içinde barındıracak kadar basittir.",
  "evidence": ""
}
    },
    "Bankacılık Hukuku": {
        id: 17,
        instruction: "1. Bankacılık Kanunu kapsamındaki denetim ve gözetim mekanizmalarını, düzenleyici kurumların yetki alanlarını ve müdahale süreçlerini temel al.\n2. Bankacılık hukukuna özgü suç tiplerini, özellikle zimmet suçunun nitelikli hallerini genel ceza hukukundan ayıran teknik nüanslarla sorgula.\n3. Bankaların faaliyet izinleri, kurumsal yönetim ilkeleri ve sır saklama yükümlülüğü gibi sektörel dinamikleri vaka kurgularına dök.\n4. Analiz kısmında güncel mevzuat hükümlerine ve bankacılık hukukunun temel disiplinlerine dayalı teknik çıkarımlara yer ver.",
        few_shot_example: {
  "q": "Bir mevduat bankasının genel müdürü (G), banka kaynaklarını, herhangi bir teminat almaksızın ve kredi sınırlarını kasten aşarak kontrolü altındaki paravan şirketlere aktarmış; yapılan inceleme sonucunda söz konusu tutarların tahsilinin imkansız hale getirildiği saptanmıştır.\nSöz konusu fiilin 5411 Sayılı Bankacılık Kanunu uyarınca hukuki niteliği ve yaptırımı hakkında aşağıdakilerden hangisi doğrudur?",
  "o": [
    "Eylem, genel ceza hukukundaki \"Güveni Kötüye Kullanma\" suçu kapsamında değerlendirilir.",
    "Banka kaynaklarının şahsi veya başkası lehine mal edinilmesiyle \"Zimmet\" suçunun nitelikli hali oluşmuştur.",
    "Fiil \"İrtikap\" suçuna girdiğinden, yargılama sürecinde BDDK yerine TMSF'nin onayı aranır.",
    "Bu durum sadece idari para cezası ve imza yetkisinin geçici olarak kaldırılmasını gerektirir.",
    "Eylem, \"Banka Sırrını Açıklama\" suçu ile \"Dolandırıcılık\" suçunun bileşik bir türüdür."
  ],
  "a": 0,
  "exp": "5411 Sayılı Kanun m.160 uyarınca, görevi nedeniyle zilyetliği kendisine devredilmiş olan veya koruma ve gözetimiyle yükümlü olduğu banka kaynaklarını, banka zararına olacak şekilde kendisinin veya başkasının menfaatine kullanan kişi \"Zimmet\" suçunu işlemiş olur. Paravan şirketler aracılığıyla kaynağın izinin kaybettirilmesi veya hileli işlemlerle gizlenmesi zimmetin nitelikli halini oluşturur ve ağırlaştırılmış hapis cezası ile bankacılık yapma yasağına tabidir.",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "Bir banka çalışanının, bankadaki paraları kendi hesabına geçirmesi kötü bir davranış mıdır?",
  "o": [
    "Evet, buna zimmet denir ve suçtur.",
    "Hayır, banka çok zengin olduğu için sorun olmaz.",
    "Sadece hafta sonları yaparsa suç değildir.",
    "Paraları geri getirirse ödül verilmelidir.",
    "Banka müdürü görmediği sürece serbesttir."
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) Mevzuat (5411 Sayılı Kanun) atıfı ve teknik suç tanımları (zimmet, zimmetin nitelikli hali) bulunmamaktadır. 2) Hukuki bir analizi değil, ahlaki ve yüzeysel bir yargıyı sorgular. 3) Seçenekler bir uzman yardımcılığı sınavı ciddiyetiyle bağdaşmaz.",
  "evidence": ""
}
    },
    "Pazarlama Yönetimi": {
        id: 18,
        instruction: "1. Stratejik pazarlama modellerini ve analiz araçlarını, salt teorik bilgi yerine somut pazar senaryoları ve işletme kararlarıyla birleştirerek test et.\n2. Rekabet stratejileri, ürün konumlandırma ve marka yönetimi arasındaki dinamik etkileşimi sorgulayan kurgular oluştur.\n3. Ürün yaşam eğrisinin farklı evrelerinde uygulanması gereken pazarlama karması (4P) stratejilerini ve bütçe dağılım kararlarını analiz et.\n4. Analiz kısmında pazar bölümlendirme ve hedefleme yaklaşımlarını, Bloom’un değerlendirme basamağına uygun seçimler üzerinden kurgula.",
        few_shot_example: {
  "q": "Firmanın amiral gemisi olan \"X\" ürünü, pazar büyüme hızının yıllık $\\%2$ seviyelerine gerilediği bir sektörde, $\\%65$ gibi domine edici bir pazar payına sahiptir. Ürün Yaşam Eğrisi (PLC) bazında \"Olgunluk\" döneminde olan bu ürün için izlenmesi gereken strateji nedir?\nBCG Matrisi temel alındığında, söz konusu ürünün stratejik konumu ve bütçe yönetimi hakkında hangisi söylenebilir?",
  "o": [
    "Ürün \"Yıldız\" (Star) konumundadır; pazar payını korumak için yoğun Ar-Ge yatırımı sürdürülmelidir.",
    "Ürün \"Soru İşareti\" (Question Mark) konumundadır; pazar payı düşük olduğu için tasfiye edilmelidir.",
    "Ürün \"Nakit İneği\" (Cash Cow) konumundadır; buradan elde edilen fonlar \"Yıldız\" adaylarını desteklemek için kullanılmalıdır.",
    "Ürün \"Köpek\" (Dog) konumundadır; rekabet avantajı kalmadığı için hasat stratejisi uygulanmalıdır.",
    "Ürün \"Nakit İneği\" konumundadır; satış hacmini artırmak için fiyatlar radikal şekilde yükseltilmelidir."
  ],
  "a": 0,
  "exp": "BCG Matrisi'nde düşük büyüme hızı ve yüksek pazar payı kombinasyonu \"Nakit İneği\" (Cash Cow) olarak tanımlanır. Bu ürünler genellikle PLC’nin olgunluk aşamasındadır. Stratejik olarak bu birimler fazla yatırım gerektirmez; sağladıkları yüksek nakit akışı (\"sağılması\"), büyüme potansiyeli olan \"Yıldız\" veya \"Soru İşareti\" konumundaki ürünlerin fonlanması için kullanılır.",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "BCG Matrisi'nde kullanılan \"Nakit İneği\" (Cash Cow) ifadesindeki hayvan aşağıdakilerden hangisidir?",
  "o": [
    "İnek",
    "Zürafa",
    "Penguen",
    "Uçan fil",
    "Ejderha"
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) Pazarlama stratejilerini, pazar payı/büyüme hızı ilişkisini veya ürün yaşam eğrisini sorgulamaz. 2) Sadece terminolojik bir metaforu kelime anlamıyla ele alır. 3) Karar alma sürecine dayalı bir analiz içermez.",
  "evidence": ""
}
    },
    "Para, Banka ve Kredi": {
        id: 19,
        instruction: "1. Merkez bankası politika araçlarının ve para politikası kanallarının piyasa likiditesi ile reel ekonomi üzerindeki etkileşimini test et.\n2. Kaydi para yaratma süreçlerini ve para çarpanı mekanizmasını, matematiksel hesaplamalar ve bankacılık sistemi dinamikleri üzerinden kurgula.\n3. Nominal ve reel değişkenler arasındaki korelasyonu, enflasyon beklentilerini ve Fisher etkisini $i = r + \\pi^e$ kurguya dahil et.\n4. Tüm para arzı değişkenlerini, çarpan hesaplamalarını ve iktisadi formülleri sistematik bir düzenle LaTeX formatında sun.",
        few_shot_example: {
  "q": "Zorunlu karşılık oranının ($rr$) $0,20$, nakit tercihi oranının ($c$) $0,10$ ve bankaların ayırdığı aşırı rezerv oranının ($e$) $0,05$ olduğu bir ekonomi varsayılmaktadır.\nMerkez Bankası’nın piyasadan $500$ Milyon TL’lik tahvil satın alması (Açık Piyasa Alımı) durumunda, para arzındaki ($M1$) nihai değişim miktarı yaklaşık ne kadar olur?",
  "o": [
    "$1.250$ Milyon TL",
    "$2.000$ Milyon TL",
    "$1.571$ Milyon TL",
    "$2.500$ Milyon TL",
    "$500$ Milyon TL"
  ],
  "a": 0,
  "exp": "Para arzındaki değişimi bulmak için para çarpanı ($m$) hesaplanmalıdır. Formül: $$m = \\frac{1 + c}{rr + e + c}$$Değerler yerine konduğunda:",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "Eğer cebinizde $100$ TL varsa ve Merkez Bankası para arzını artırırsa, elinizdeki kağıt parçasına ne ad verilir?",
  "o": [
    "Para",
    "Resim kağıdı",
    "Uçak yapmak için kullanılan materyal",
    "Peçete",
    "Gazete kupürü"
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) Kaydi para yaratma mekanizmasını veya para çarpanı gibi makroekonomik modelleri test etmez. 2) Hiçbir matematiksel hesaplama veya politika aracı (zorunlu karşılık, APİ) içermez. 3) Seçenekler akademik bir sınavın ciddiyetiyle tamamen uyumsuzdur.",
  "evidence": ""
}
    },
    "İcra ve İflas Hukuku": {
        id: 20,
        instruction: "1. İcra ve iflas hukukunun şekli yapısına bağlı kalarak; takip yolları, itiraz süreçleri ve hak düşürücü süreleri vaka analizleri üzerinden sorgula.\n2. Takibin dayanağı olan belgelerin hukuki niteliğinin; görevli yargı merciini ve takip yöntemini nasıl değiştirdiğini test et.\n3. İcra hukukundaki farklı itiraz ve şikayet mekanizmalarını, bunların usuli sonuçlarını ve kesin hüküm etkilerini temel çeldirici olarak kullan.\n4. Analiz kısmında mutlaka ilgili kanun maddelerine ve usul hukukunun temel prensiplerine dayalı teknik gerekçelendirmeler yap.",
        few_shot_example: {
  "q": "Genel haciz yoluyla takipte borçlu, kendisine tebliğ edilen ödeme emrine karşı $5$ gün içinde icra dairesine giderek borcu olmadığını beyan ederek itiraz etmiştir. Alacaklının elinde İcra ve İflas Kanunu (İİK) m.68 kapsamında yer almayan, adi nitelikte bir \"borç ikrarı\" içeren belge bulunmaktadır.\nBu durumda alacaklının, takibin devamını sağlamak adına başvurması gereken hukuki yol ve süre sınırı aşağıdakilerden hangisinde doğru verilmiştir?",
  "o": [
    "$6$ ay içinde İcra Mahkemesi’nden \"İtirazın Kaldırılması\" talep edilmelidir.",
    "$1$ yıl içinde Genel Mahkemelerde \"İtirazın İptali\" davası açılmalıdır.",
    "$7$ gün içinde İcra Mahkemesi’nden \"Takibin Devamı\" kararı alınmalıdır.",
    "$15$ gün içinde borçluya karşı \"Menfi Tespit Davası\" açılmalıdır.",
    "İtiraz süresinden sonra yapıldığı için herhangi bir dava açmaya gerek yoktur."
  ],
  "a": 0,
  "exp": "Alacaklının elindeki belge İİK m.68'de sayılan (imzası ikrar edilmiş adi senet, resmi dairelerin usulüne göre verdiği belgeler vb.) kesin belgelerden biri değilse, dar yetkili İcra Mahkemesi'nden itirazın kaldırılmasını isteyemez. Bu durumda alacaklı, İİK m.67 uyarınca $1$ yıl içinde genel mahkemelerde (Asliye Hukuk vb.) \"İtirazın İptali\" davası açarak alacağını genel hükümlere göre ispat etmelidir.",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "Borçlu, kendisine gelen ödeme emrine $7$ gün içinde itiraz etmelidir. Eğer borçlu itiraz etmek istiyorsa ne kadar süresi vardır?",
  "o": [
    "$7$ gün",
    "$100$ yıl",
    "$5$ dakika",
    "Canı ne zaman isterse",
    "Mavi bir günde"
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) Cevap zaten soru kökünde açıkça verilmiştir (ezber kontrolü bile değildir). 2) İİK m.67 ve m.68 arasındaki o kritik usuli farkı ve belge niteliğini sorgulamaz. 3) Çeldiriciler tamamen mantık dışıdır.",
  "evidence": ""
}
    },
    "Matematik": {
        id: 21,
        instruction: "1. İşlemsel çözümleme yerine, problem senaryolarını matematiksel modellere dönüştürme ve denklem kurma becerilerini test et.\n2. Sayısal mantık kurgularında, birbirini kısıtlayan öncüller kullanarak adayı tüm olasılıkları ve ekstrem durumları değerlendirmeye zorla.\n3. Çeldiricilerde; sayı kümelerinin sınırlarını (tam sayı, doğal sayı vb.) veya ara işlem sonuçlarını kullanarak kavramsal dikkati ölç.\n4. Tüm matematiksel ifadeleri, denklemleri ve çözüm basamaklarını sistematik bir netlikte $S + 40D = 4800, \\Delta$ gibi LaTeX formatında yaz.",
        few_shot_example: {
  "q": "Bir tekstil atölyesinde üretim maliyeti; sabit bir kesim maliyeti ($S$) ve üretilen her bir ürün için değişken bir dikim maliyetinden ($D$) oluşmaktadır. Atölyede $40$ gömlek üretildiğinde gömlek başına düşen ortalama toplam maliyet $120$ TL iken; üretim $100$ gömleğe çıkarıldığında gömlek başına ortalama toplam maliyet $102$ TL’ye gerilemektedir.\nBuna göre, bu atölyede $200$ gömlek üretilmesi durumunda gömlek başına düşen ortalama toplam maliyet kaç TL olur?",
  "o": [
    "90",
    "93",
    "96",
    "98",
    "99"
  ],
  "a": 0,
  "exp": "Verilenleri denkleme dökersek; toplam maliyet fonksiyonu $TC = S + nD$ şeklindedir. Ortalama maliyet ise $(S + nD) / n$’dir.",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
    },
    "İş Hukuku": {
        id: 22,
        instruction: "1. İş Kanunu ekseninde; feshin hukuki niteliği, geçerlilik şartları ve usulüne uygunluk süreçlerini içeren somut vaka analizleri kurgula.\n2. Tazminat haklarının kazanılma koşullarını ve dava şartı olan arabuluculuk gibi usuli mekanizmaları teknik birer çeldirici olarak kullan.\n3. İş güvencesi kapsamını belirleyen yasal eşikleri ve çalışma sürelerine dair hukuki kısıtları, olay örgüsünün belirleyici detayları haline getir.\n4. Analiz kısmında İş Kanunu’nun ilgili maddelerine ve yargı kararlarıyla şekillenmiş temel iş hukuku prensiplerine mutlaka atıf yap.",
        few_shot_example: {
  "q": "3 yıl kıdemi olan İşçi (A), performans düşüklüğü gerekçe gösterilerek savunması alınmaksızın ve ihbar tazminatı peşin ödenerek işten çıkarılmıştır. (A), feshin geçersiz olduğunu ve işe iade edilmek istediğini beyan etmektedir. İş yerinde $50$ işçi çalışmaktadır.\nBu vaka uyarınca, 4857 Sayılı İş Kanunu kapsamında izlenmesi gereken hukuki yol hakkında aşağıdakilerden hangisi doğrudur?",
  "o": [
    "Fesih haklı nedenle yapıldığı için işçi hiçbir tazminata veya işe iade davasına hak kazanamaz.",
    "Savunma alınmadığı için fesih doğrudan geçersizdir; işçi doğrudan İş Mahkemesinde dava açmalıdır.",
    "İşçi kıdem tazminatını aldığı için feshi kabul etmiş sayılır ve sadece arabulucuya başvurabilir.",
    "Savunma alınmaması feshin usulden geçersizliğine yol açar; işçi zorunlu arabuluculuk sürecinin ardından işe iade davası açabilir.",
    "İşçi $6$ aylık kıdem şartını sağlamasına rağmen ihbar tazminatı ödendiği için iş güvencesi hükümlerinden yararlanamaz."
  ],
  "a": 0,
  "exp": "İş Kanunu m.19 uyarınca, işçinin davranışı veya verimiyle ilgili nedenlerle yapılan fesihlerde, işçinin savunmasının alınması bir geçerlilik şartıdır. Savunma alınmaması feshin usulden geçersizliği sonucunu doğurur. Ayrıca, $7036$ Sayılı Kanun gereği işe iade talebiyle açılacak davalarda arabuluculuğa başvurulması bir \"dava şartı\"dır. E şıkkındaki \"tazminat ödenmesi iş güvencesini engeller\" mantığı hatalı bir çeldiricidir.",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "Bir işçi işten çıkarıldığında, çalıştığı yıllar karşılığında kendisine ödenen paraya genel olarak ne ad verilir?",
  "o": [
    "Tazminat",
    "Haftalık harçlık",
    "Bayram şekeri parası",
    "Yol yardımı mahiyetinde bir çikolata",
    "Kayp eşya bedeli"
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) İş Kanunu'nun spesifik maddelerini (m.18, m.19) veya usul kurallarını sorgulamaz. 2) İş güvencesi, arabuluculuk veya savunma zorunluluğu gibi teknik detaylar içermez. 3) Çeldiriciler hukuk terminolojisiyle alakasızdır.",
  "evidence": ""
}
    },
    "Makro İktisat": {
        id: 23,
        instruction: "1. Ekonomik denge mekanizmalarını ve piyasa etkileşimlerini, temel makroekonomik modeller üzerinden analitik bir derinlikle sorgula.\n2. İktisat politikalarının etkinliğini; uç durumlar, likidite tercihleri ve dışlama etkileri gibi teorik paradigmalar çerçevesinde test et.\n3. Temel iktisadi varsayımları, çarpan mekanizmasındaki sızıntıları ve değişkenler arası korelasyonları güçlü çeldiriciler olarak kurgula.\n4. Tüm makroekonomik değişkenleri, esneklik katsayılarını ve model göstergelerini $e_{mi} = \\infty$, $IS$, $LM$ gibi LaTeX formatında belirt.",
        few_shot_example: {
  "q": "Para talebinin faiz esnekliğinin sonsuz ($e_{mi} = \\infty$) olduğu bir \"Likidite Tuzağı\" ortamında, ekonomiyi canlandırmak amacıyla otonom kamu harcamalarının ($G$) artırıldığı varsayılmaktadır.\nIS-LM modeli çerçevesinde, bu maliye politikası hamlesinin hasıla ($Y$) üzerindeki etkisi ve \"Dışlama Etkisi\" (Crowding-out) hakkında aşağıdakilerden hangisi söylenebilir?",
  "o": [
    "LM eğrisi dikey olduğu için \"tam dışlama\" yaratır; hasıla düzeyinde bir değişim meydana gelmez.",
    "Para arzı artışı faizi düşüremeyeceği için maliye politikası tamamen etkisiz kalır.",
    "IS eğrisi sağa kayar; faiz oranları yükselmediği için hasıla maksimum çarpan etkisiyle artar.",
    "Yatırımın faiz esnekliği sıfır olduğu için sadece para politikası araçları etkili olur.",
    "Kamu harcaması artışı LM eğrisini sola kaydırarak stagflasyona neden olur."
  ],
  "a": 0,
  "exp": "Likidite tuzağında LM eğrisi yataydır (faiz esnekliği sonsuzdur). Bu durumda genişlemeci bir maliye politikası ($G \\uparrow$) IS eğrisini sağa kaydırdığında, faiz oranlarında herhangi bir yükselme meydana gelmez. Faizler artmadığı için özel yatırımların azalması (Dışlama Etkisi) sıfıra iner ve maliye politikası en yüksek etkinlik düzeyine ulaşır. A ve B şıkları klasik veya uç durum çeldiricileri olarak kurgulanmıştır.",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "Piyasadaki tüm ürünlerin fiyatları sürekli olarak artıyorsa, bu ekonomik duruma ne ad verilir?",
  "o": [
    "Enflasyon",
    "Bedava",
    "Büyük indirim",
    "Hediye çeki",
    "Gökten para yağması"
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) Hiçbir denge analizi (IS-LM, AS-AD) veya değişkenler arası ilişki (faiz esnekliği vb.) içermez. 2) Tanımsal bir düzeyde olup akademik analiz gerektirmez. 3) Çeldiriciler bilimsel ciddiyetle bağdaşmaz.",
  "evidence": ""
}
    },
    "Ticaret Hukuku": {
        id: 24,
        instruction: "1. Ticari işletme, şirketler ve kıymetli evrak hukuku disiplinlerinde; soyut hükümler yerine somut olaylara dayalı hukuki uyuşmazlıklar kurgula.\n2. Farklı şirket yapılarındaki sorumluluk rejimlerini, sermaye şartlarını ve devir usullerini mukayeseli birer çeldirici unsur olarak kullan.\n3. Kambiyo senetlerinin niteliklerini, ciro silsilesinin geçerliliğini ve hak düşürücü süreleri adayı teknik muhakemeye zorlayacak şekilde sorgula.\n4. Analiz kısmında Türk Ticaret Kanunu’nun ilgili maddelerine ve ticari hayatın temel güven ilkelerine dayalı net çıkarımlar yap.",
        few_shot_example: {
  "q": "Lehtar (A), emrine düzenlenmiş $100.000$ TL değerindeki bir bonoyu arka yüzünü imzalayarak (beyaz ciro) (B)’ye teslim etmiştir. (B) ise senedin arkasına hiçbir ibare yazmadan veya imza atmadan senedi doğrudan (C)’ye devretmiştir. Senedin vadesi geldiğinde düzenleyen (D), (C)’nin isminin ciro zincirinde yer almadığını belirterek ödeme yapmaktan kaçınmıştır.\nTürk Ticaret Kanunu (TTK) hükümleri uyarınca, bu hukuki uyuşmazlığın çözümü için hangisi doğrudur?",
  "o": [
    "Ciro zinciri (B)’nin isminin yazılmaması nedeniyle kopmuştur; (C) meşru hamil sayılmaz.",
    "(A)’nın yaptığı işlem \"Tam Ciro\", (B)’nin yaptığı işlem \"Beyaz Ciro\"dur; bu nedenle zincir geçerlidir.",
    "(A) beyaz ciro yapmıştır; beyaz ciro sonrası senedi devralan (B), ismini yazmadan sadece teslimle devir yapabilir ve (C) meşru hamil olur.",
    "Bono emre yazılı olduğu için ismen belirtilmeyen her türlü devir işlemi TTK m.683 gereği geçersizdir.",
    "(C), senedi devralırken (B)’nin imzasını almadığı için \"iyiniyetli üçüncü kişi\" korumasından yararlanamaz."
  ],
  "a": 0,
  "exp": "TTK m.683 uyarınca beyaz ciro (hamilin isminin belirtilmediği, sadece imza atılan ciro), senedi hamiline yazılı senede yaklaştırır. Beyaz ciro ile senedi devralan kişi, senede kendi ismini yazabileceği gibi, hiçbir işlem yapmadan sadece zilyetliğin devri (teslim) yoluyla senedi üçüncü bir kişiye devredebilir. TTK m.686 kapsamında bu durum ciro zincirini koparmaz; (C) senedin meşru hamilidir.",
  "evidence": "Örnek çözümden çıkarılmıştır."
},
        bad_few_shot_example: {
  "q": "Türk Ticaret Kanunu'na göre, üzerinde \"ÇEK\" ibaresi bulunan ve bankaya ödeme emri veren kıymetli evraka genel olarak ne ad verilir?",
  "o": [
    "Çek",
    "Uçak bileti",
    "Market fişi",
    "Doğum günü kartı",
    "Vesikalık fotoğraf"
  ],
  "a": 0,
  "exp": "Bu soru \"kötü\" bir örnektir çünkü; 1) Ciro silsilesi, beyaz/tam ciro farkı veya TTK madde hükümleri gibi teknik detayları sorgulamaz. 2) Cevap doğrudan soru kökünde verilmiştir. 3) Çeldiriciler konuyla tamamen ilgisizdir.",
  "evidence": ""
}
    },
};
