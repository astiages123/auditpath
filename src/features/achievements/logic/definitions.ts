import {
  type Achievement,
  type GuildInfo,
  type GuildType,
} from '../types/achievementsTypes';

export const GUILDS: Record<GuildType, GuildInfo> = {
  HUKUK: {
    id: 'HUKUK',
    name: 'Kadim Yasalar ve Yazıtlar Meclisi',
    description: 'Hukuk ve Adalet Doktrinleri',
    color: 'oklch(0.7 0.15 250)',
  },
  IKTISAT: {
    id: 'IKTISAT',
    name: 'Altın Akış ve Simya Konseyi',
    description: 'İktisat ve Kaynak Yönetimi',
    color: 'oklch(0.75 0.15 85)',
  },
  MUHASEBE_MALIYE: {
    id: 'MUHASEBE_MALIYE',
    name: 'Hazine ve Kusursuz Mizân Muhafızları',
    description: 'Muhasebe ve Maliye Bilimi',
    color: 'oklch(0.65 0.15 145)',
  },
  GY_GK: {
    id: 'GY_GK',
    name: 'Yedi Diyar ve Diplomasi Okulu',
    description: 'Genel Yetenek ve Genel Kültür',
    color: 'oklch(0.7 0.15 300)',
  },
  KAMU_YONETIMI: {
    id: 'KAMU_YONETIMI',
    name: 'Büyük İdare ve Yönetim Konseyi',
    description: 'Kamu ve Devlet Yönetimi Doktrinleri',
    color: 'oklch(0.65 0.15 280)',
  },
  ULUSLARARASI_ILISKILER: {
    id: 'ULUSLARARASI_ILISKILER',
    name: 'Küresel Satranç ve Elçiler Meclisi',
    description: 'Uluslararası İlişkiler ve Strateji',
    color: 'oklch(0.7 0.18 40)',
  },
  ATA_584: {
    id: 'ATA_584',
    name: 'Cumhuriyet Ateşi ve Tarih Muhafızları',
    description: 'Cumhuriyet Tarihi ve İnkılaplar',
    color: 'oklch(0.6 0.20 20)',
  },
  HYBRID: {
    id: 'HYBRID',
    name: 'Kadim Birleşimler ve İlimler',
    description: 'Çapraz disiplinlerde ustalık nişanları',
    color: 'oklch(0.7 0.12 200)',
  },
  SPECIAL: {
    id: 'SPECIAL',
    name: 'Yüce Disiplin ve Adanmışlık',
    description: 'Zihinsel dayanıklılık ve süreklilik mühürleri',
    color: 'oklch(0.8 0.18 50)',
  },
  MASTERY: {
    id: 'MASTERY',
    name: 'Kadim İmtihanlar ve Hakikat Meclisi',
    description: 'Quiz Ustalık Nişanları',
    color: 'oklch(0.6 0.25 320)',
  },
  TITLES: {
    id: 'TITLES',
    name: 'Unvanlar',
    description:
      'Yüce Disiplin ve Adanmışlık Zihinsel dayanıklılık ve süreklilik mühürleri',
    color: 'oklch(0.75 0.18 120)',
  },
};

export const LAW_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'hukuk_10',
    title: 'Yasa Tozu',
    motto: 'Kadim tabletlerdeki ilk çatlakları ve tozlu yasaları fark ettin.',
    imagePath: '/badges/hukuk-10.webp',
    guild: 'HUKUK',
    requirement: {
      type: 'category_progress',
      category: 'HUKUK',
      percentage: 10,
    },
    order: 1,
  },
  {
    id: 'hukuk_25',
    title: 'Demir Mühürdar',
    motto: 'Sarsılmaz kuralların anahtarını sıkıca kavrıyorsun.',
    imagePath: '/badges/hukuk-25.webp',
    guild: 'HUKUK',
    requirement: {
      type: 'category_progress',
      category: 'HUKUK',
      percentage: 25,
    },
    order: 2,
  },
  {
    id: 'hukuk_50',
    title: 'Rün Mürekkebi',
    motto:
      'Karmaşık yazıtların arasındaki gizli rünleri deşifre etmeye başladın.',
    imagePath: '/badges/hukuk-50.webp',
    guild: 'HUKUK',
    requirement: {
      type: 'category_progress',
      category: 'HUKUK',
      percentage: 50,
    },
    order: 3,
  },
  {
    id: 'hukuk_100',
    title: 'Adalet Asası',
    motto:
      'Kadim yasaların mutlak koruyucusu; adaletin keskin ve parlayan kılıcı.',
    imagePath: '/badges/hukuk-100.webp',
    guild: 'HUKUK',
    requirement: {
      type: 'category_progress',
      category: 'HUKUK',
      percentage: 100,
    },
    order: 4,
  },
];

export const ECONOMY_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'eko_10',
    title: 'Bakır Yol',
    motto: 'Ticaret kervanlarının geçtiği tozlu yollarda ilk adımını attın.',
    imagePath: '/badges/ekonomi-10.webp',
    guild: 'IKTISAT',
    requirement: {
      type: 'category_progress',
      category: 'IKTISAT',
      percentage: 10,
    },
    order: 5,
  },
  {
    id: 'eko_25',
    title: 'Kervan Katibi',
    motto: 'Altın sikkelerin sesini ve servetin yönünü anlamaya başladın.',
    imagePath: '/badges/ekonomi-25.webp',
    guild: 'IKTISAT',
    requirement: {
      type: 'category_progress',
      category: 'IKTISAT',
      percentage: 25,
    },
    order: 6,
  },
  {
    id: 'eko_50',
    title: 'Denge Gözetmeni',
    motto:
      'Arz ve talebin fırtınalı denizinde, sükuneti ve düzeni görebiliyorsun.',
    imagePath: '/badges/ekonomi-50.webp',
    guild: 'IKTISAT',
    requirement: {
      type: 'category_progress',
      category: 'IKTISAT',
      percentage: 50,
    },
    order: 7,
  },
  {
    id: 'eko_100',
    title: 'Altın Dokunuş Üstadı',
    motto:
      'Altın akışının sırrına erdin; görünmez eller artık senin iradene boyun eğiyor.',
    imagePath: '/badges/ekonomi-100.webp',
    guild: 'IKTISAT',
    requirement: {
      type: 'category_progress',
      category: 'IKTISAT',
      percentage: 100,
    },
    order: 8,
  },
];

export const ACCOUNTING_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'mu_10',
    title: 'Düğüm Çözücü',
    motto: 'Sayıların karmaşık düğümlerini teker teker çözmeye başladın.',
    imagePath: '/badges/muhasebe-10.webp',
    guild: 'MUHASEBE_MALIYE',
    requirement: {
      type: 'category_progress',
      category: 'MUHASEBE_MALIYE',
      percentage: 10,
    },
    order: 9,
  },
  {
    id: 'muh_25',
    title: 'Hazine Muhafızı',
    motto: 'Hazine kapısındaki ağır kilidin mekanizmasını çözüyorsun.',
    imagePath: '/badges/muhasebe-25.webp',
    guild: 'MUHASEBE_MALIYE',
    requirement: {
      type: 'category_progress',
      category: 'MUHASEBE_MALIYE',
      percentage: 25,
    },
    order: 10,
  },
  {
    id: 'muh_50',
    title: 'Gümüş Sayacı',
    motto:
      'Krallığın sandığını koruyan, her sikkenin fısıltısını duyan keskin göz.',
    imagePath: '/badges/muhasebe-50.webp',
    guild: 'MUHASEBE_MALIYE',
    requirement: {
      type: 'category_progress',
      category: 'MUHASEBE_MALIYE',
      percentage: 50,
    },
    order: 11,
  },
  {
    id: 'muh_100',
    title: 'Kusursuz Mizân Üstadı',
    motto: 'Sayıların kaosunu ilahi bir düzene sokan, mutlak dengenin mimarı.',
    imagePath: '/badges/muhasebe-100.webp',
    guild: 'MUHASEBE_MALIYE',
    requirement: {
      type: 'category_progress',
      category: 'MUHASEBE_MALIYE',
      percentage: 100,
    },
    order: 12,
  },
];

export const GENERAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'genel_10',
    title: 'Yolcu Meşalesi',
    motto: 'Zihnin karanlık koridorlarında ilk meşaleyi sen yaktın.',
    imagePath: '/badges/genel-10.webp',
    guild: 'GY_GK',
    requirement: {
      type: 'category_progress',
      category: 'GY_GK',
      percentage: 10,
    },
    order: 13,
  },
  {
    id: 'genel_25',
    title: 'Elçi Kuzgunu',
    motto: 'Bilgi uçsuz bucaksız diyarlardan sana doğru kanat çırpıyor.',
    imagePath: '/badges/genel-25.webp',
    guild: 'GY_GK',
    requirement: {
      type: 'category_progress',
      category: 'GY_GK',
      percentage: 25,
    },
    order: 14,
  },
  {
    id: 'genel_50',
    title: 'Yedi Dilin Elçisi',
    motto: 'Uzak diyarların kadim dillerini konuşan, halklar arasındaki köprü.',
    imagePath: '/badges/genel-50.webp',
    guild: 'GY_GK',
    requirement: {
      type: 'category_progress',
      category: 'GY_GK',
      percentage: 50,
    },
    order: 15,
  },
  {
    id: 'genel_100',
    title: 'Hakikat Arayıcısı',
    motto:
      'Zihninle en karanlık labirentleri aydınlatan, bilmeceleri parçalayan bilge.',
    imagePath: '/badges/genel-100.webp',
    guild: 'GY_GK',
    requirement: {
      type: 'category_progress',
      category: 'GY_GK',
      percentage: 100,
    },
    order: 16,
  },
];

export const KAMU_YONETIMI_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'kamu_10',
    title: 'Siyaset Meydanı',
    motto: 'Siyasi kavramlara ve kuramlara ilk adımı attın.',
    imagePath: '/ranks/rank1.webp', // Resim yoksa ranklardan kullanılabilir geçici olarak
    guild: 'KAMU_YONETIMI',
    requirement: {
      type: 'category_progress',
      category: 'KAMU_YONETIMI',
      percentage: 10,
    },
    order: 17,
  },
  {
    id: 'kamu_25',
    title: 'Bürokrasi Çarkı',
    motto: 'Kamu düzenini ve idari yapıyı anlamaya başladın.',
    imagePath: '/ranks/rank2.webp',
    guild: 'KAMU_YONETIMI',
    requirement: {
      type: 'category_progress',
      category: 'KAMU_YONETIMI',
      percentage: 25,
    },
    order: 18,
  },
  {
    id: 'kamu_50',
    title: 'Devlet Aklı',
    motto:
      'Yönetim mekanizmalarında uzmanlaşıyor, çarkları ustaca döndürüyorsun.',
    imagePath: '/ranks/rank3.webp',
    guild: 'KAMU_YONETIMI',
    requirement: {
      type: 'category_progress',
      category: 'KAMU_YONETIMI',
      percentage: 50,
    },
    order: 19,
  },
  {
    id: 'kamu_100',
    title: 'Başvezir',
    motto:
      'Kamu yönetiminde mutlak hakimiyet sağladın; sistemin zirvesi sensin.',
    imagePath: '/ranks/rank4.webp',
    guild: 'KAMU_YONETIMI',
    requirement: {
      type: 'category_progress',
      category: 'KAMU_YONETIMI',
      percentage: 100,
    },
    order: 20,
  },
];

export const ULUSLARARASI_ILISKILER_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ui_10',
    title: 'Hudut Gözcüsü',
    motto: 'Uzak diyarların politikalarını ve niyetlerini anlamaya başladın.',
    imagePath: '/ranks/rank1.webp',
    guild: 'ULUSLARARASI_ILISKILER',
    requirement: {
      type: 'category_progress',
      category: 'ULUSLARARASI_ILISKILER',
      percentage: 10,
    },
    order: 21,
  },
  {
    id: 'ui_25',
    title: 'Elçilik Katibi',
    motto: 'Diplomatik bağları ve karmaşık anlaşmaları çözmeye başladın.',
    imagePath: '/ranks/rank2.webp',
    guild: 'ULUSLARARASI_ILISKILER',
    requirement: {
      type: 'category_progress',
      category: 'ULUSLARARASI_ILISKILER',
      percentage: 25,
    },
    order: 22,
  },
  {
    id: 'ui_50',
    title: 'Stratejik Müzakereci',
    motto: 'Küresel satranç tahtasını ustalıkla okuma yetisi kazandın.',
    imagePath: '/ranks/rank3.webp',
    guild: 'ULUSLARARASI_ILISKILER',
    requirement: {
      type: 'category_progress',
      category: 'ULUSLARARASI_ILISKILER',
      percentage: 50,
    },
    order: 23,
  },
  {
    id: 'ui_100',
    title: 'Dünya Elçisi',
    motto:
      'Kıtalararası tam siyasi bilgeliğe ulaştın; dünya artık sözünü dinliyor.',
    imagePath: '/ranks/rank4.webp',
    guild: 'ULUSLARARASI_ILISKILER',
    requirement: {
      type: 'category_progress',
      category: 'ULUSLARARASI_ILISKILER',
      percentage: 100,
    },
    order: 24,
  },
];

export const ATA_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ata_10',
    title: 'Geçmişin Ayak İzleri',
    motto: 'Tarihsel okumalara ve kadim metinlere başlangıç yaptın.',
    imagePath: '/ranks/rank1.webp',
    guild: 'ATA_584',
    requirement: {
      type: 'category_progress',
      category: 'ATA_584',
      percentage: 10,
    },
    order: 25,
  },
  {
    id: 'ata_25',
    title: 'Devrim Şövalyesi',
    motto:
      'İnkılapların derinliğine iniyor, değişimin rüzgarını hissediyorsun.',
    imagePath: '/ranks/rank2.webp',
    guild: 'ATA_584',
    requirement: {
      type: 'category_progress',
      category: 'ATA_584',
      percentage: 25,
    },
    order: 26,
  },
  {
    id: 'ata_50',
    title: 'Cumhuriyet Meşalesi',
    motto: 'Kuruluş ilkelerini ve ruhunu layıkıyla kavramaya başladın.',
    imagePath: '/ranks/rank3.webp',
    guild: 'ATA_584',
    requirement: {
      type: 'category_progress',
      category: 'ATA_584',
      percentage: 50,
    },
    order: 27,
  },
  {
    id: 'ata_100',
    title: 'Tarih Muhafızı',
    motto:
      'Geçmişin tüm ışığını geleceğe taşıyacak kadim metinlerde tam yetkinlik.',
    imagePath: '/ranks/rank4.webp',
    guild: 'ATA_584',
    requirement: {
      type: 'category_progress',
      category: 'ATA_584',
      percentage: 100,
    },
    order: 28,
  },
];

export const HYBRID_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'hybrid_01',
    title: 'Ticaret Valisi',
    motto:
      'Hukuk ve İktisat: Altının akışını yasaların gücüyle dizginliyorsun.',
    imagePath: '/badges/hybrid-01.webp',
    guild: 'HYBRID',
    requirement: {
      type: 'multi_category_progress',
      categories: [
        { category: 'HUKUK', percentage: 25 },
        { category: 'IKTISAT', percentage: 25 },
      ],
    },
    order: 29,
  },
  {
    id: 'hybrid_02',
    title: 'İmparatorluk Nazırı',
    motto: 'İktisat ve Muhasebe: Hem serveti yönetiyor hem de tartabiliyorsun.',
    imagePath: '/badges/hybrid-02.webp',
    guild: 'HYBRID',
    requirement: {
      type: 'multi_category_progress',
      categories: [
        { category: 'IKTISAT', percentage: 50 },
        { category: 'MUHASEBE_MALIYE', percentage: 50 },
      ],
    },
    order: 30,
  },
  {
    id: 'hybrid_03',
    title: 'Bilge Diplomat',
    motto:
      'Hukuk ve Uluslararası İlişkiler: Keskin bir zeka ve sarsılmaz bir adalet.',
    imagePath: '/badges/hybrid-03.webp',
    guild: 'HYBRID',
    requirement: {
      type: 'multi_category_progress',
      categories: [
        { category: 'HUKUK', percentage: 50 },
        { category: 'ULUSLARARASI_ILISKILER', percentage: 50 },
      ],
    },
    order: 31,
  },
  {
    id: 'hybrid_04',
    title: 'Strateji Mimarı',
    motto: 'Kamu Yönetimi ve GY-GK: Yönetimsel aklın ve zekanın birleşimi.',
    imagePath: '/badges/hybrid-04.webp',
    guild: 'HYBRID',
    requirement: {
      type: 'multi_category_progress',
      categories: [
        { category: 'KAMU_YONETIMI', percentage: 25 },
        { category: 'GY_GK', percentage: 25 },
      ],
    },
    order: 32,
  },
  {
    id: 'hybrid_05',
    title: 'Büyük Konsey Üyesi',
    motto: 'Hükmü geçen tüm alanlarda sarsılmaz bir başarı ve bilgelik.',
    imagePath: '/badges/hybrid-05.webp',
    guild: 'HYBRID',
    requirement: { type: 'all_progress', percentage: 50 },
    order: 33,
  },
];

export const SPECIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'special-01',
    title: 'Odak Uzmanı',
    motto: 'Tek bir tefekkür oturumunda tam 5 parşömen bitirdin.',
    imagePath: '/badges/special-01.webp',
    guild: 'SPECIAL',
    requirement: { type: 'daily_progress', count: 5 },
    order: 34,
    isPermanent: true,
  },
  {
    id: 'special-02',
    title: 'Zihinsel Maraton',
    motto: 'Zihnin sınırlarını zorlayan 10 videoluk devasa bir adım.',
    imagePath: '/badges/special-02.webp',
    guild: 'SPECIAL',
    requirement: { type: 'daily_progress', count: 10 },
    order: 35,
    isPermanent: true,
  },
  {
    id: 'special-03',
    title: 'Sönmeyen Meşale',
    motto: 'Yedi gün boyunca karanlığı ilminle dağıttın; meşalen hiç sönmedi.',
    imagePath: '/badges/special-03.webp',
    guild: 'SPECIAL',
    requirement: { type: 'streak', days: 7 },
    order: 36,
    isPermanent: true,
  },
  {
    id: 'special-04',
    title: 'Kıdemli Gezgin',
    motto: 'Bilgelik yolunda kararlı adımlarla ilerleyen kıdemli yolcu.',
    imagePath: '/badges/special-04.webp',
    guild: 'SPECIAL',
    requirement: { type: 'total_active_days', days: 15 },
    order: 37,
    isPermanent: true,
  },
  {
    id: 'special-05',
    title: 'Kutsal Adanmışlık',
    motto: 'Bilgelik yolunda tam bir ay boyunca her gün yürüdün.',
    imagePath: '/badges/special-05.webp',
    guild: 'SPECIAL',
    requirement: { type: 'streak', days: 30 },
    order: 38,
    isPermanent: true,
  },
  {
    id: 'special-06',
    title: 'Zamanın Yolcusu',
    motto:
      'Bilgelik koridorlarında toplam 60 gün geçirdin; artık burası senin evin.',
    imagePath: '/badges/special-06.webp',
    guild: 'SPECIAL',
    requirement: { type: 'total_active_days', days: 60 },
    order: 39,
    isPermanent: true,
  },
  {
    id: 'special-07',
    title: 'Zamanın Efendisi',
    motto: 'Zamanın kendisini büküp bilgelyiğe dönüştüren mutlak üstad.',
    imagePath: '/badges/special-07.webp',
    guild: 'SPECIAL',
    requirement: { type: 'total_active_days', days: 90 },
    order: 40,
    isPermanent: true,
  },
  {
    id: 'special-08',
    title: 'Uyanmış Ruh',
    motto:
      'Yolun yarısını aştın; artık tüm disiplinler senin varlığınla uyumlu.',
    imagePath: '/badges/special-08.webp',
    guild: 'SPECIAL',
    requirement: { type: 'all_progress', percentage: 50 },
    order: 41,
  },
  {
    id: 'special-09',
    title: 'Yüce Üstad',
    motto:
      'Tüm mühürler toplandı, tüm isimler öğrenildi. Sen artık yaşayan bir efsanesin.',
    imagePath: '/badges/special-09.webp',
    guild: 'SPECIAL',
    requirement: { type: 'all_progress', percentage: 100 },
    order: 42,
  },
];

export const TITLE_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'RANK_UP:1',
    title: 'Sürgün',
    motto: 'Bilginin krallığından uzakta, sislerin içinde yolunu arıyorsun.',
    imagePath: '/ranks/rank1.webp',
    guild: 'TITLES',
    requirement: { type: 'minimum_videos', count: 1 },
    order: 43,
    isPermanent: true,
  },
  {
    id: 'RANK_UP:2',
    title: 'Yazıcı',
    motto: 'Kadim metinleri kopyalayarak bilgeliğin izlerini sürmeye başladın.',
    imagePath: '/ranks/rank2.webp',
    guild: 'TITLES',
    requirement: { type: 'all_progress', percentage: 25 },
    order: 44,
    isPermanent: true,
  },
  {
    id: 'RANK_UP:3',
    title: 'Sınır Muhafızı',
    motto:
      'Bilgi krallığının sınırlarını koruyor, cehaletin gölgeleriyle savaşıyorsun.',
    imagePath: '/ranks/rank3.webp',
    guild: 'TITLES',
    requirement: { type: 'all_progress', percentage: 50 },
    order: 45,
    isPermanent: true,
  },
  {
    id: 'RANK_UP:4',
    title: 'Yüce Bilgin',
    motto:
      'Görünmeyeni görüyor, bilinmeyeni biliyorsun. Hikmetin ışığı sensin.',
    imagePath: '/ranks/rank4.webp',
    guild: 'TITLES',
    requirement: { type: 'all_progress', percentage: 75 },
    order: 46,
    isPermanent: true,
  },
];

export const ACHIEVEMENTS: Achievement[] = [
  ...LAW_ACHIEVEMENTS,
  ...ECONOMY_ACHIEVEMENTS,
  ...ACCOUNTING_ACHIEVEMENTS,
  ...GENERAL_ACHIEVEMENTS,
  ...KAMU_YONETIMI_ACHIEVEMENTS,
  ...ULUSLARARASI_ILISKILER_ACHIEVEMENTS,
  ...ATA_ACHIEVEMENTS,
  ...HYBRID_ACHIEVEMENTS,
  ...SPECIAL_ACHIEVEMENTS,
  ...TITLE_ACHIEVEMENTS,
];
