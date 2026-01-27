-- Migration to update subject_guidelines instructions based on subject_instructions.md

-- 1. Sözel Mantık
UPDATE subject_guidelines
SET instruction = $$1. Değişkenlerin sayısal dağılım dengesini ve kısıtların matematiksel sağlamasını temel alan bir kurgu oluştur.
2. Gruplandırma ve sıralama kısıtlarını, diğer tüm olasılıkları net şekilde eleyen keskin ve aşılması imkansız sınırlar olarak kurgula.
3. "Kesinlik" bildiren soru köklerini kullanarak adayı; tüm ihtimal tablolarını ve olasılık ağaçlarını eksiksiz kurmaya zorla.
4. Olası görünen ancak her senaryoda doğrulanmayan durumları, Bloom’un analiz düzeyine uygun en güçlü çeldiriciler olarak kullan.$$
WHERE subject_name = 'Sözel Mantık';

-- 2. Finansal Yönetim
UPDATE subject_guidelines
SET instruction = $$1. Finansal analiz tekniklerini ve maliyet hesaplamalarını, stratejik işletme kararlarıyla ve nakit akışıyla bütüncül şekilde ilişkilendir.
2. Sermaye yapısı, karlılık göstergeleri ve risk yönetimi arasındaki dinamik dengeyi ve kaldıraç etkilerini sorgulayan vakalar oluştur.
3. Yatırım kararlarının değerlendirilmesinde kullanılan sayısal kriterleri, projeler arası karşılaştırma ve seçim senaryolarına dök.
4. Analiz kısmında performans analizi yaklaşımlarını ve finansal kaldıraç mantığını temel alan teorik çıkarımlara yer ver.$$
WHERE subject_name = 'Finansal Yönetim';

-- 3. Muhasebe
UPDATE subject_guidelines
SET instruction = $$1. Münferit yevmiye kayıtları yerine, işlemlerin mali tabloların bütününe ve öz kaynak yapısına olan etkisini sorgulayan kurgular yap.
2. Muhasebenin temel kavramlarını, dönem sonu envanter işlemlerini ve değerleme esaslarını kapsayan bir yapı oluştur.
3. Hesapların niteliğini ve işleyiş kurallarını, adaydaki kavramsal yanılgıları hedef alan güçlü ve teknik çeldiricilerle destekle.
4. Analiz kısmında genel kabul görmüş ilkeleri ve güncel finansal raporlama standartlarının kavramsal çerçevesini temel al.$$
WHERE subject_name = 'Muhasebe';

-- 4. Maliye
UPDATE subject_guidelines
SET instruction = $$1. Kamu gelirleri ve harcamalarının ekonomik etkilerini, piyasa dengesi ve arz/talep esneklik kavramlarıyla ilişkilendirerek kurgula.
2. Mali hukuk süreçlerini, zamanaşımı türlerini ve farklı mali ekollerin kuramsal yaklaşımlarını içeren mukayeseli senaryolar oluştur.
3. Vergi yükü dağılımını ve maliye politikası araçlarını, farklı piyasa koşulları ve ekstrem ekonomik durumlar üzerinden sorgula.
4. Analiz kısmında bütçe ilkelerini ve kamu maliyesi teorilerini Bloom’un değerlendirme basamağına uygun şekilde işleyerek sun.$$
WHERE subject_name = 'Maliye';

-- 5. Medeni Usul Hukuku
UPDATE subject_guidelines
SET instruction = $$1. Yargılama hukukunun usul kurallarını, hak düşürücü süreleri ve usul ekonomisi ilkesini merkeze alan teknik kurgular yap.
2. Dava şartları ve ilk itirazlar arasındaki hukuki ayrımı, yargılamanın her aşaması için somut vaka örnekleri üzerinden sorgula.
3. Kanun yolları, kesinleşme süreçleri ve süre başlangıçlarını adayda mantıksal kafa karışıklığı yaratacak çeldiricilerle kurgula.
4. Analiz kısmında güncel mevzuat hükümlerine ve yargılama hukukunun temel prensiplerine dayalı teknik ve net çıkarımlar yap.$$
WHERE subject_name = 'Medeni Usul Hukuku';

-- 6. Banka Muhasebesi
UPDATE subject_guidelines
SET instruction = $$1. Bankacılığın kendine özgü bilanço yapısını (mevduat-pasif, kredi-aktif ilişkisi) ve bu yapının operasyonel yansımalarını temel alan kurgular oluştur.
2. Nazım hesaplar ile bilanço içi hesaplar arasındaki işleyiş farkını ve özellikle teminat işlemlerindeki muhasebe kayıtlarını ayırt edici birer çeldirici olarak kullan.
3. Aktif kalitesini belirleyen donuk alacak süreçlerini ve karşılık işlemlerinin bankanın net aktif değeri ile öz kaynakları üzerindeki etkilerini sorgula.
4. Tüm hesap kodlarını, tutarları ve oranları teknik tutarlılık adına 100.000 TL, %20 gibi net ve belirgin formatlarda belirtilmesini sağla.$$
WHERE subject_name = 'Banka Muhasebesi';

-- 7. Uluslararası Ticaret
UPDATE subject_guidelines
SET instruction = $$1. Uluslararası uzmanlaşma teorilerini, alternatif maliyetler ve üretim avantajları üzerinden stratejik karar verme süreçleriyle ilişkilendirerek test et.
2. Dış ticaret politikası araçlarının ve kısıtlamaların piyasa refahı, yerli üretici/tüketici dengesi ve ekonomik kayıplar üzerindeki etkilerini kurgula.
3. Ticaret hadlerinin hesaplanması ve değişim analizlerini, $N = (P_x / P_m) \times 100$ gibi temel matematiksel modelleri kurguya dahil ederek sorgula.
4. Verimlilik tablolarını, ticaret haddi aralıklarını ve ilgili tüm formülleri sistematik bir görsel düzen ve netlikle sun.$$
WHERE subject_name = 'Uluslararası Ticaret';

-- 8. İngilizce
UPDATE subject_guidelines
SET instruction = $$1. Kelime bilgisini bağlamsal birliktelikler (collocations) odaklı, dil bilgisini ise iletişimsel ve işlevsel kullanım yetkinliği üzerinden ölçen kurgular oluştur.
2. Yakın anlam sorularında kipliklerin (modals) ve miktar belirleyicilerin (quantifiers) cümleye kattığı kesinlik veya olasılık derecelerine odaklan.
3. Anlam ve çeviri odaklı sorularda, niteleyicilerin (zarf/sıfat) yarattığı anlam nüanslarını ve kavram kaymalarını temel çeldirici unsur olarak kullan.
4. Metin bütünlüğünü ve diyalog akışını, akademik dil düzeyine (academic register) ve mantıksal geçiş ifadelerinin doğru kullanımına göre sorgulat.$$
WHERE subject_name = 'İngilizce';

-- 9. Borçlar Hukuku
UPDATE subject_guidelines
SET instruction = $$1. Sözleşme özgürlüğünün sınırları, irade sakatlıkları ve yetkisiz temsil gibi borç ilişkisinin doğumundaki kritik süreçlere ve kurucu unsurlara odaklan.
2. Hukuki işlemlerin geçerlilik şartlarını, onay (icazet) mekanizmalarını ve tarafların bu süreçteki haklarını somut vaka analizleri üzerinden sorgula.
3. Hakların kullanılmasını engelleyen "def'i" ve hakları doğrudan sona erdiren "itiraz" ayrımını, teknik derinliği olan güçlü çeldiriciler olarak kurgula.
4. Borçlar hukukunun temel prensiplerini ve borcun sona erme hallerini, adayı hukuki muhakeme yapmaya zorlayacak senaryolara dök.$$
WHERE subject_name = 'Borçlar Hukuku';

-- 10. İşletme Yönetimi
UPDATE subject_guidelines
SET instruction = $$1. Yönetim fonksiyonlarını ve organizasyonel yapılanma modellerini, tanımlardan ziyade somut yönetici davranışları ve karar alma süreçleri üzerinden sorgula.
2. Karmaşık organizasyon yapılarındaki yetki-sorumluluk dengesini, komuta birliği ilkesine yönelik riskleri ve olası yönetim çatışmalarını temel al.
3. Yönetim düşüncesinin tarihsel gelişimini ve farklı ekoller arasındaki felsefi yaklaşım farklarını, adayda kavramsal çıkarım yaptıracak şekilde çeldirici yap.
4. Analiz kısmında modern işletme modellerini ve stratejik yönetim yaklaşımlarını, güncel yönetsel paradigmalarla ilişkilendirerek sun.$$
WHERE subject_name = 'İşletme Yönetimi';

-- 11. Ceza Hukuku
UPDATE subject_guidelines
SET instruction = $$1. Soyut tanımlardan kaçınarak; suçun maddi ve manevi unsurları ile illiyet bağını irdeleyen somut olay (vaka) analizleri kurgula.
2. Suça iştirak biçimlerinin ve icra hareketlerinin (teşebbüs) iç içe geçtiği, çoklu fail içeren karmaşık senaryolara odaklan.
3. Çeldiricilerde kanundaki birbirine yakın (sınırdaş) hukuki kurumları ve sorumluluğu kaldıran halleri teknik birer tuzak olarak kullan.
4. Analiz kısmında mutlaka ilgili kanun maddelerine ve temel ceza hukuku ilkelerine dayalı hukuki gerekçelendirmeler yap.$$
WHERE subject_name = 'Ceza Hukuku';

-- 12. Türkiye Ekonomisi
UPDATE subject_guidelines
SET instruction = $$1. Ekonomi tarihindeki temel dönüşüm evrelerini ve bu dönemlerde uygulanan kalkınma/sanayileşme stratejilerini mukayeseli şekilde test et.
2. Yapısal değişimleri tetikleyen majör istikrar programlarının karakteristik özelliklerini ve sektörel etkilerini sorgulayan kurgular oluştur.
3. Temel makroekonomik göstergelerin (büyüme, enflasyon, dış denge vb.) tarihsel trendlerini dönemlerin ekonomik ruhuyla ilişkilendirerek çeldirici kurgula.
4. Soruları sadece bilgi düzeyinde bırakmayıp, dönemler arası sebep-sonuç ilişkilerini kuran analiz düzeyinde kurgula.$$
WHERE subject_name = 'Türkiye Ekonomisi';

-- 13. Finans Matematiği
UPDATE subject_guidelines
SET instruction = $$1. Paranın zaman değeri kavramını; farklı faiz türleri, ödeme planları ve taksitli nakit akışı senaryoları üzerinden bütüncül şekilde test et.
2. Zaman birimi ve faiz oranı arasındaki uyumsuzlukları (dönemsellik hataları) adayda işlem hatası yaratacak temel çeldiriciler olarak kullan.
3. Ödeme zamanlamasındaki farkların (dönem başı/sonu) bugünkü ve gelecekteki değer üzerindeki matematiksel etkilerini kurguya dahil et.
4. Tüm matematiksel modelleri, anüite formüllerini ve hesaplama süreçlerini $PV = \sum \frac{C_t}{(1+r)^t}$ gibi net LaTeX formatında sun.$$
WHERE subject_name = 'Finans Matematiği';

-- 14. Mikro İktisat
UPDATE subject_guidelines
SET instruction = $$1. Analitik düşünmeyi zorlayan değişken etkileşimlerini ve piyasa dengesi değişimlerini (fiyat ve miktar etkileri) temel alan kurgular yap.
2. Marjinal analiz yöntemlerini, optimizasyon koşullarını ve üretim/tüketim dengesi hesaplamalarını içeren sayısal veya grafiksel senaryolar oluştur.
3. Arz ve talep modellerinde "eğri üzerindeki hareket" ile "eğrinin kayması" arasındaki kavramsal farkı temel yanıltıcı unsur olarak kullan.
4. Tüm iktisadi fonksiyonları, kısıtları ve sembolleri teknik doğruluk adına $STC$, $Q^2$, $P=10$ gibi LaTeX formatında belirt.$$
WHERE subject_name = 'Mikro İktisat';

-- 15. İstatistik
UPDATE subject_guidelines
SET instruction = $$1. Salt işlem yerine; veri setindeki değişimlerin ve manipülasyonların merkezi eğilim ve yayılım ölçüleri üzerindeki istatistiksel etkisini sorgula.
2. Değişkenlik ölçüleri arasındaki matematiksel ilişkileri ve birimden arındırılmış karşılaştırma tekniklerini ayırt edici özellik olarak kullan.
3. Aykırı değerlerin (outliers) veri dağılımını nasıl saptırdığını ve hangi parametreleri ne yönde etkilediğini analiz düzeyinde test et.
4. Tüm istatistiksel parametreleri, test istatistiklerini ve sembolleri $\mu, \sigma^2, \bar{x}$ gibi standart LaTeX formatında yaz.$$
WHERE subject_name = 'İstatistik';

-- 16. Medeni Hukuk
UPDATE subject_guidelines
SET instruction = $$1. Hak ve fiil ehliyeti, kısıtlılık halleri ve vesayet rejimini içeren somut hayat olayları (vaka) üzerinden hukuki muhakeme yaptır.
2. Miras hukukunun temel prensiplerini; zümre sistemi, yasal mirasçılık ve saklı pay dengeleri üzerinden analiz düzeyinde sorgula.
3. Hukuki işlemlerin geçersizlik halleri (yokluk ve butlan türleri) arasındaki teknik ve sonuç odaklı farkları ayırt edici çeldiriciler olarak kurgula.
4. Miras payı oranlarını ve matematiksel paylaşımları $1/2$ veya $1/4$ gibi net LaTeX formatında sunulmasını sağla.$$
WHERE subject_name = 'Medeni Hukuk';

-- 17. Bankacılık Hukuku
UPDATE subject_guidelines
SET instruction = $$1. Bankacılık Kanunu kapsamındaki denetim ve gözetim mekanizmalarını, düzenleyici kurumların yetki alanlarını ve müdahale süreçlerini temel al.
2. Bankacılık hukukuna özgü suç tiplerini, özellikle zimmet suçunun nitelikli hallerini genel ceza hukukundan ayıran teknik nüanslarla sorgula.
3. Bankaların faaliyet izinleri, kurumsal yönetim ilkeleri ve sır saklama yükümlülüğü gibi sektörel dinamikleri vaka kurgularına dök.
4. Analiz kısmında güncel mevzuat hükümlerine ve bankacılık hukukunun temel disiplinlerine dayalı teknik çıkarımlara yer ver.$$
WHERE subject_name = 'Bankacılık Hukuku';

-- 18. Pazarlama Yönetimi
UPDATE subject_guidelines
SET instruction = $$1. Stratejik pazarlama modellerini ve analiz araçlarını, salt teorik bilgi yerine somut pazar senaryoları ve işletme kararlarıyla birleştirerek test et.
2. Rekabet stratejileri, ürün konumlandırma ve marka yönetimi arasındaki dinamik etkileşimi sorgulayan kurgular oluştur.
3. Ürün yaşam eğrisinin farklı evrelerinde uygulanması gereken pazarlama karması (4P) stratejilerini ve bütçe dağılım kararlarını analiz et.
4. Analiz kısmında pazar bölümlendirme ve hedefleme yaklaşımlarını, Bloom’un değerlendirme basamağına uygun seçimler üzerinden kurgula.$$
WHERE subject_name = 'Pazarlama Yönetimi';

-- 19. Para, Banka ve Kredi
UPDATE subject_guidelines
SET instruction = $$1. Merkez bankası politika araçlarının ve para politikası kanallarının piyasa likiditesi ile reel ekonomi üzerindeki etkileşimini test et.
2. Kaydi para yaratma süreçlerini ve para çarpanı mekanizmasını, matematiksel hesaplamalar ve bankacılık sistemi dinamikleri üzerinden kurgula.
3. Nominal ve reel değişkenler arasındaki korelasyonu, enflasyon beklentilerini ve Fisher etkisini $i = r + \pi^e$ kurguya dahil et.
4. Tüm para arzı değişkenlerini, çarpan hesaplamalarını ve iktisadi formülleri sistematik bir düzenle LaTeX formatında sun.$$
WHERE subject_name = 'Para, Banka ve Kredi';

-- 20. İcra ve İflas Hukuku
UPDATE subject_guidelines
SET instruction = $$1. İcra ve iflas hukukunun şekli yapısına bağlı kalarak; takip yolları, itiraz süreçleri ve hak düşürücü süreleri vaka analizleri üzerinden sorgula.
2. Takibin dayanağı olan belgelerin hukuki niteliğinin; görevli yargı merciini ve takip yöntemini nasıl değiştirdiğini test et.
3. İcra hukukundaki farklı itiraz ve şikayet mekanizmalarını, bunların usuli sonuçlarını ve kesin hüküm etkilerini temel çeldirici olarak kullan.
4. Analiz kısmında mutlaka ilgili kanun maddelerine ve usul hukukunun temel prensiplerine dayalı teknik gerekçelendirmeler yap.$$
WHERE subject_name = 'İcra ve İflas Hukuku';

-- 21. Matematik
UPDATE subject_guidelines
SET instruction = $$1. İşlemsel çözümleme yerine, problem senaryolarını matematiksel modellere dönüştürme ve denklem kurma becerilerini test et.
2. Sayısal mantık kurgularında, birbirini kısıtlayan öncüller kullanarak adayı tüm olasılıkları ve ekstrem durumları değerlendirmeye zorla.
3. Çeldiricilerde; sayı kümelerinin sınırlarını (tam sayı, doğal sayı vb.) veya ara işlem sonuçlarını kullanarak kavramsal dikkati ölç.
4. Tüm matematiksel ifadeleri, denklemleri ve çözüm basamaklarını sistematik bir netlikte $S + 40D = 4800, \Delta$ gibi LaTeX formatında yaz.$$
WHERE subject_name = 'Matematik';

-- 22. İş Hukuku
UPDATE subject_guidelines
SET instruction = $$1. İş Kanunu ekseninde; feshin hukuki niteliği, geçerlilik şartları ve usulüne uygunluk süreçlerini içeren somut vaka analizleri kurgula.
2. Tazminat haklarının kazanılma koşullarını ve dava şartı olan arabuluculuk gibi usuli mekanizmaları teknik birer çeldirici olarak kullan.
3. İş güvencesi kapsamını belirleyen yasal eşikleri ve çalışma sürelerine dair hukuki kısıtları, olay örgüsünün belirleyici detayları haline getir.
4. Analiz kısmında İş Kanunu’nun ilgili maddelerine ve yargı kararlarıyla şekillenmiş temel iş hukuku prensiplerine mutlaka atıf yap.$$
WHERE subject_name = 'İş Hukuku';

-- 23. Makro İktisat
UPDATE subject_guidelines
SET instruction = $$1. Ekonomik denge mekanizmalarını ve piyasa etkileşimlerini, temel makroekonomik modeller üzerinden analitik bir derinlikle sorgula.
2. İktisat politikalarının etkinliğini; uç durumlar, likidite tercihleri ve dışlama etkileri gibi teorik paradigmalar çerçevesinde test et.
3. Temel iktisadi varsayımları, çarpan mekanizmasındaki sızıntıları ve değişkenler arası korelasyonları güçlü çeldiriciler olarak kurgula.
4. Tüm makroekonomik değişkenleri, esneklik katsayılarını ve model göstergelerini $e_{mi} = \infty$, $IS$, $LM$ gibi LaTeX formatında belirt.$$
WHERE subject_name = 'Makro İktisat';

-- 24. Ticaret Hukuku
UPDATE subject_guidelines
SET instruction = $$1. Ticari işletme, şirketler ve kıymetli evrak hukuku disiplinlerinde; soyut hükümler yerine somut olaylara dayalı hukuki uyuşmazlıklar kurgula.
2. Farklı şirket yapılarındaki sorumluluk rejimlerini, sermaye şartlarını ve devir usullerini mukayeseli birer çeldirici unsur olarak kullan.
3. Kambiyo senetlerinin niteliklerini, ciro silsilesinin geçerliliğini ve hak düşürücü süreleri adayı teknik muhakemeye zorlayacak şekilde sorgula.
4. Analiz kısmında Türk Ticaret Kanunu’nun ilgili maddelerine ve ticari hayatın temel güven ilkelerine dayalı net çıkarımlar yap.$$
WHERE subject_name = 'Ticaret Hukuku';
