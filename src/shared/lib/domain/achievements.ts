"use client";

// Guild Types
export type GuildType =
    | "HUKUK"
    | "EKONOMI"
    | "MUHASEBE_MALIYE"
    | "GENEL_YETENEK"
    | "HYBRID"
    | "SPECIAL"
    | "MASTERY";

export interface GuildInfo {
    id: GuildType;
    name: string;
    description: string;
    color: string;
    topicMasteryBadge?: string;
}

export const GUILDS: Record<GuildType, GuildInfo> = {
    HUKUK: {
        id: "HUKUK",
        name: "Kadim Yasalar ve Yazıtlar Meclisi",
        description: "Hukuk ve Adalet Doktrinleri",
        color: "oklch(0.7 0.15 250)", // Deep Indigo
    },
    EKONOMI: {
        id: "EKONOMI",
        name: "Altın Akış ve Simya Konseyi",
        description: "Ekonomi ve Kaynak Yönetimi",
        color: "oklch(0.75 0.15 85)", // Rich Amber
    },
    MUHASEBE_MALIYE: {
        id: "MUHASEBE_MALIYE",
        name: "Hazine ve Kusursuz Mizân Muhafızları",
        description: "Muhasebe ve Maliye Bilimi",
        color: "oklch(0.65 0.15 145)", // Emerald Balance
    },
    GENEL_YETENEK: {
        id: "GENEL_YETENEK",
        name: "Yedi Diyar ve Diplomasi Okulu",
        description: "Mantık, Lisan ve Genel Bilgelik",
        color: "oklch(0.7 0.15 300)", // Regal Amethyst
    },
    HYBRID: {
        id: "HYBRID",
        name: "Kadim Birleşimler ve İlimler",
        description: "Çapraz disiplinlerde ustalık nişanları",
        color: "oklch(0.7 0.12 200)", // Buz Mavisi/Gümüş
    },
    SPECIAL: {
        id: "SPECIAL",
        name: "Yüce Disiplin ve Adanmışlık",
        description: "Zihinsel dayanıklılık ve süreklilik mühürleri",
        color: "oklch(0.8 0.18 50)", // Eternal Flame
    },
    MASTERY: {
        id: "MASTERY",
        name: "Kadim İmtihanlar ve Hakikat Meclisi",
        description: "Quiz Ustalık Nişanları",
        color: "oklch(0.6 0.25 320)", // Parlak Büyücü Moru
    },
};

export type RequirementType =
    | { type: "category_progress"; category: string; percentage: number }
    | {
        type: "multi_category_progress";
        categories: { category: string; percentage: number }[];
    }
    | { type: "all_progress"; percentage: number }
    | { type: "streak"; days: number }
    | { type: "daily_progress"; count: number }
    | { type: "total_active_days"; days: number }
    // New RPG Requirements
    | { type: "quiz_honesty"; count: number } // Simyacı
    | { type: "first_time_perfect" } // Kusursuz Hamle
    | { type: "clear_debt" } // Mana Arınması (borç sıfırlama)
    | { type: "consecutive_correct"; count: number } // Odaklanma Kristali
    | { type: "weekly_review_streak"; days: number } // Demir İrade
    | { type: "topic_mastery_count"; count: number }; // Kadim Hafıza

export interface Achievement {
    id: string;
    title: string;
    motto: string;
    imagePath: string;
    guild: GuildType;
    requirement: RequirementType;
    order: number;
}

export const ACHIEVEMENTS: Achievement[] = [
    // --- LONCA 1: HUKUK (Tireli: hukuk-10.webp) ---
    {
        id: "hukuk_10",
        title: "Yasa Tozu",
        motto:
            "Kadim tabletlerdeki ilk çatlakları ve tozlu yasaları fark ettin.",
        imagePath: "/badges/hukuk-10.webp",
        guild: "HUKUK",
        requirement: {
            type: "category_progress",
            category: "HUKUK",
            percentage: 10,
        },
        order: 1,
    },
    {
        id: "hukuk_25",
        title: "Demir Mühürdar",
        motto: "Sarsılmaz kuralların anahtarını sıkıca kavrıyorsun.",
        imagePath: "/badges/hukuk-25.webp",
        guild: "HUKUK",
        requirement: {
            type: "category_progress",
            category: "HUKUK",
            percentage: 25,
        },
        order: 2,
    },
    {
        id: "hukuk_50",
        title: "Rün Mürekkebi",
        motto:
            "Karmaşık yazıtların arasındaki gizli rünleri deşifre etmeye başladın.",
        imagePath: "/badges/hukuk-50.webp",
        guild: "HUKUK",
        requirement: {
            type: "category_progress",
            category: "HUKUK",
            percentage: 50,
        },
        order: 3,
    },
    {
        id: "hukuk_100",
        title: "Adalet Asası",
        motto:
            "Kadim yasaların mutlak koruyucusu; adaletin keskin ve parlayan kılıcı.",
        imagePath: "/badges/hukuk-100.webp",
        guild: "HUKUK",
        requirement: {
            type: "category_progress",
            category: "HUKUK",
            percentage: 100,
        },
        order: 4,
    },

    // --- LONCA 2: EKONOMİ (Tireli: ekonomi-10.webp) ---
    {
        id: "eko_10",
        title: "Bakır Yol",
        motto:
            "Ticaret kervanlarının geçtiği tozlu yollarda ilk adımını attın.",
        imagePath: "/badges/ekonomi-10.webp",
        guild: "EKONOMI",
        requirement: {
            type: "category_progress",
            category: "EKONOMİ",
            percentage: 10,
        },
        order: 5,
    },
    {
        id: "eko_25",
        title: "Kervan Katibi",
        motto: "Altın sikkelerin sesini ve servetin yönünü anlamaya başladın.",
        imagePath: "/badges/ekonomi-25.webp",
        guild: "EKONOMI",
        requirement: {
            type: "category_progress",
            category: "EKONOMİ",
            percentage: 25,
        },
        order: 6,
    },
    {
        id: "eko_50",
        title: "Denge Gözetmeni",
        motto:
            "Arz ve talebin fırtınalı denizinde, sükuneti ve düzeni görebiliyorsun.",
        imagePath: "/badges/ekonomi-50.webp",
        guild: "EKONOMI",
        requirement: {
            type: "category_progress",
            category: "EKONOMİ",
            percentage: 50,
        },
        order: 7,
    },
    {
        id: "eko_100",
        title: "Altın Dokunuş Üstadı",
        motto:
            "Altın akışının sırrına erdin; görünmez eller artık senin iradene boyun eğiyor.",
        imagePath: "/badges/ekonomi-100.webp",
        guild: "EKONOMI",
        requirement: {
            type: "category_progress",
            category: "EKONOMİ",
            percentage: 100,
        },
        order: 8,
    },

    // --- LONCA 3: MUHASEBE (Karışık: 10 tireli, 50/100 alt tireli) ---
    {
        id: "muh_10",
        title: "Düğüm Çözücü",
        motto: "Sayıların karmaşık düğümlerini teker teker çözmeye başladın.",
        imagePath: "/badges/muhasebe-10.webp",
        guild: "MUHASEBE_MALIYE",
        requirement: {
            type: "category_progress",
            category: "MUHASEBE VE MALİYE",
            percentage: 10,
        },
        order: 9,
    },
    {
        id: "muh_25",
        title: "Hazine Muhafızı",
        motto: "Hazine kapısındaki ağır kilidin mekanizmasını çözüyorsun.",
        imagePath: "/badges/muhasebe-25.webp",
        guild: "MUHASEBE_MALIYE",
        requirement: {
            type: "category_progress",
            category: "MUHASEBE VE MALİYE",
            percentage: 25,
        },
        order: 10,
    },
    {
        id: "muh_50",
        title: "Gümüş Sayacı",
        motto:
            "Krallığın sandığını koruyan, her sikkenin fısıltısını duyan keskin göz.",
        imagePath: "/badges/muhasebe-50.webp", // UNDERSCORE
        guild: "MUHASEBE_MALIYE",
        requirement: {
            type: "category_progress",
            category: "MUHASEBE VE MALİYE",
            percentage: 50,
        },
        order: 11,
    },
    {
        id: "muh_100",
        title: "Kusursuz Mizân Üstadı",
        motto:
            "Sayıların kaosunu ilahi bir düzene sokan, mutlak dengenin mimarı.",
        imagePath: "/badges/muhasebe-100.webp", // UNDERSCORE
        guild: "MUHASEBE_MALIYE",
        requirement: {
            type: "category_progress",
            category: "MUHASEBE VE MALİYE",
            percentage: 100,
        },
        order: 12,
    },

    // --- LONCA 4: GENEL (Tireli: genel-10.webp) ---
    {
        id: "genel_10",
        title: "Yolcu Meşalesi",
        motto: "Zihnin karanlık koridorlarında ilk meşaleyi sen yaktın.",
        imagePath: "/badges/genel-10.webp",
        guild: "GENEL_YETENEK",
        requirement: {
            type: "category_progress",
            category: "GENEL YETENEK VE İNGİLİZCE",
            percentage: 10,
        },
        order: 13,
    },
    {
        id: "genel_25",
        title: "Elçi Kuzgunu",
        motto: "Bilgi uçsuz bucaksız diyarlardan sana doğru kanat çırpıyor.",
        imagePath: "/badges/genel-25.webp",
        guild: "GENEL_YETENEK",
        requirement: {
            type: "category_progress",
            category: "GENEL YETENEK VE İNGİLİZCE",
            percentage: 25,
        },
        order: 14,
    },
    {
        id: "genel_50",
        title: "Yedi Dilin Elçisi",
        motto:
            "Uzak diyarların kadim dillerini konuşan, halklar arasındaki köprü.",
        imagePath: "/badges/genel-50.webp",
        guild: "GENEL_YETENEK",
        requirement: {
            type: "category_progress",
            category: "GENEL YETENEK VE İNGİLİZCE",
            percentage: 50,
        },
        order: 15,
    },
    {
        id: "genel_100",
        title: "Hakikat Arayıcısı",
        motto:
            "Zihninle en karanlık labirentleri aydınlatan, bilmeceleri parçalayan bilge.",
        imagePath: "/badges/genel-100.webp",
        guild: "GENEL_YETENEK",
        requirement: {
            type: "category_progress",
            category: "GENEL YETENEK VE İNGİLİZCE",
            percentage: 100,
        },
        order: 16,
    },

    // --- HİBRİT BAŞARIMLAR (Alt Tireli: hybrid_01.webp - HYBRID Loncası) ---
    {
        id: "hybrid_01",
        title: "Ticaret Valisi",
        motto:
            "Hukuk ve Ekonomi: Altının akışını yasaların gücüyle dizginliyorsun.",
        imagePath: "/badges/hybrid-01.webp",
        guild: "HYBRID",
        requirement: {
            type: "multi_category_progress",
            categories: [{ category: "HUKUK", percentage: 25 }, {
                category: "EKONOMİ",
                percentage: 25,
            }],
        },
        order: 17,
    },
    {
        id: "hybrid_02",
        title: "İmparatorluk Nazırı",
        motto:
            "Ekonomi ve Muhasebe: Hem serveti yönetiyor hem de tartabiliyorsun.",
        imagePath: "/badges/hybrid-02.webp",
        guild: "HYBRID",
        requirement: {
            type: "multi_category_progress",
            categories: [{ category: "EKONOMİ", percentage: 50 }, {
                category: "MUHASEBE VE MALİYE",
                percentage: 50,
            }],
        },
        order: 18,
    },
    {
        id: "hybrid_03",
        title: "Bilge Diplomat",
        motto:
            "Hukuk ve Genel Yetenek: Keskin bir zeka ve sarsılmaz bir adalet.",
        imagePath: "/badges/hybrid-03.webp",
        guild: "HYBRID",
        requirement: {
            type: "multi_category_progress",
            categories: [{ category: "HUKUK", percentage: 50 }, {
                category: "GENEL YETENEK VE İNGİLİZCE",
                percentage: 50,
            }],
        },
        order: 19,
    },
    {
        id: "hybrid_04",
        title: "Strateji Mimarı",
        motto: "Muhasebe ve Genel Yetenek: Mantığın ve sayıların gücü.",
        imagePath: "/badges/hybrid-04.webp",
        guild: "HYBRID",
        requirement: {
            type: "multi_category_progress",
            categories: [{ category: "MUHASEBE VE MALİYE", percentage: 25 }, {
                category: "GENEL YETENEK VE İNGİLİZCE",
                percentage: 25,
            }],
        },
        order: 20,
    },
    {
        id: "hybrid_05",
        title: "Büyük Konsey Üyesi",
        motto:
            "Beş disiplin tek zihinde: Tüm loncaların saygısını kazanan bir bilge.",
        imagePath: "/badges/hybrid-05.webp",
        guild: "HYBRID",
        requirement: { type: "all_progress", percentage: 50 },
        order: 21,
    },

    // --- ÖZEL (SPECIAL) & SERİ (Alt Tireli: special-01.webp - SPECIAL Loncası) ---
    {
        id: "special-01",
        title: "Gece Nöbetçisi",
        motto: "Tek bir tefekkür oturumunda tam 5 parşömen bitirdin.",
        imagePath: "/badges/special-01.webp",
        guild: "SPECIAL",
        requirement: { type: "daily_progress", count: 5 },
        order: 22,
    },
    {
        id: "special-02",
        title: "Zihinsel Maraton",
        motto: "Zihnin sınırlarını zorlayan 10 videoluk devasa bir adım.",
        imagePath: "/badges/special-02.webp",
        guild: "SPECIAL",
        requirement: { type: "daily_progress", count: 10 },
        order: 23,
    },
    {
        id: "special-03",
        title: "Sönmeyen Meşale",
        motto:
            "Yedi gün boyunca karanlığı ilminle dağıttın; meşalen hiç sönmedi.",
        imagePath: "/badges/special-03.webp",
        guild: "SPECIAL",
        requirement: { type: "streak", days: 7 },
        order: 24,
    },
    {
        id: "special-04",
        title: "Kutsal Adanmışlık",
        motto: "Bilgelik yolunda tam bir ay boyunca her gün yürüdün.",
        imagePath: "/badges/special-04.webp",
        guild: "SPECIAL",
        requirement: { type: "streak", days: 30 },
        order: 25,
    },
    {
        id: "special-05",
        title: "Zamanın Yolcusu",
        motto:
            "Bilgelik koridorlarında toplam 60 gün geçirdin; artık burası senin evin.",
        imagePath: "/badges/special-05.webp",
        guild: "SPECIAL",
        requirement: { type: "total_active_days", days: 60 },
        order: 26,
    },
    {
        id: "special-06",
        title: "Uyanmış Ruh",
        motto:
            "Yolun yarısını aştın; artık tüm disiplinler senin varlığınla uyumlu.",
        imagePath: "/badges/special-06.webp",
        guild: "SPECIAL",
        requirement: { type: "all_progress", percentage: 50 },
        order: 27,
    },
    {
        id: "special-07",
        title: "Yüce Üstad (Archmage)",
        motto:
            "Tüm mühürler toplandı, tüm isimler öğrenildi. Sen artık yaşayan bir efsanesin.",
        imagePath: "/badges/special-07.webp",
        guild: "SPECIAL",
        requirement: { type: "all_progress", percentage: 100 },
        order: 28,
    },

    // --- LONCA 7: MASTERY (Kadim İmtihanlar ve Hakikat Meclisi) ---
    {
        id: "mastery_01",
        title: "Simyacı",
        motto: "Cehaletin kurşununu dürüstlüğün iksiriyle altına dönüştür.",
        imagePath: "/badges/mastery-01.webp",
        guild: "MASTERY",
        requirement: { type: "quiz_honesty", count: 5 },
        order: 29,
    },
    {
        id: "mastery_02",
        title: "Kusursuz Hamle",
        motto: "İlk tılsım, tek bir hata barındırmaz.",
        imagePath: "/badges/mastery-02.webp",
        guild: "MASTERY",
        requirement: { type: "first_time_perfect" },
        order: 30,
    },
    {
        id: "mastery_03",
        title: "Mana Arınması",
        motto: "Zihnindeki karanlık tortuları dağıt, mana akışını saflaştır.",
        imagePath: "/badges/mastery-03.webp",
        guild: "MASTERY",
        requirement: { type: "clear_debt" },
        order: 31,
    },
    {
        id: "mastery_04",
        title: "Fildişi Kule Muhafızı",
        motto: "Bilgeliğin kalesi, sabır taşlarıyla örülür.",
        imagePath: "/badges/mastery-04.webp",
        guild: "MASTERY",
        requirement: { type: "streak", days: 5 },
        order: 32,
    },
    {
        id: "mastery_05",
        title: "Odaklanma Kristali",
        motto: "İrade bir kez odaklandığında, ışık karanlığı parçalar.",
        imagePath: "/badges/mastery-05.webp",
        guild: "MASTERY",
        requirement: { type: "consecutive_correct", count: 20 },
        order: 33,
    },
    {
        id: "mastery_06",
        title: "Demir İrade",
        motto: "Altı gün süren ayini bozma, zihnini demirle mühürle.",
        imagePath: "/badges/mastery-06.webp",
        guild: "MASTERY",
        requirement: { type: "weekly_review_streak", days: 6 },
        order: 34,
    },
    {
        id: "mastery_07",
        title: "Kadim Hafıza",
        motto: "Ruhuna mühürlenen her ilim, sonsuzlukta yankılanır.",
        imagePath: "/badges/mastery-07.webp",
        guild: "MASTERY",
        requirement: { type: "topic_mastery_count", count: 10 },
        order: 35,
    },
];

// Helper Functions
export function getAchievementsByGuild(): Map<GuildType, Achievement[]> {
    const grouped = new Map<GuildType, Achievement[]>();
    for (const achievement of ACHIEVEMENTS) {
        const existing = grouped.get(achievement.guild) || [];
        existing.push(achievement);
        grouped.set(achievement.guild, existing);
    }
    for (const [guild, achievements] of grouped) {
        grouped.set(guild, achievements.sort((a, b) => a.order - b.order));
    }
    return grouped;
}

interface CategoryProgress {
    completedVideos: number;
    totalVideos: number;
}

interface ProgressStats {
    completedVideos: number;
    totalVideos: number;
    categoryProgress: Record<string, CategoryProgress>;
}

interface ActivityLog {
    currentStreak: number;
    totalActiveDays: number;
    dailyVideosCompleted: number;
    // New RPG Stats
    honestyUsageCount: number; // For 'Simyacı'
    firstTimePerfectCount: number; // For 'Kusursuz Hamle' (using count to be safe, though req says first time perfect)
    debtClearedInSession: boolean; // For 'Mana Arınması'
    consecutiveCorrectStreak: number; // For 'Odaklanma Kristali'
    weeklyStudyDays: number; // For 'Demir İrade' (days with reviews in current week)
    masteredTopicsCount: number; // For 'Kadim Hafıza'
}

// Topic Mastery Stats for badge unlocking
export interface TopicMasteryStats {
    topicId: string;
    courseId: string;
    totalQuestions: number;
    masteredQuestions: number; // Level 5 questions
    isMastered: boolean; // All questions at Level 5
}

/**
 * Check if a topic has full mastery (all questions at Level 5)
 * This is used to unlock topic-specific badges
 */
export function checkTopicMastery(
    topicStats: TopicMasteryStats[],
    topicId: string,
    courseId: string,
): boolean {
    const topic = topicStats.find(
        (t) => t.topicId === topicId && t.courseId === courseId,
    );
    return topic?.isMastered ?? false;
}

export function calculateAchievements(
    stats: ProgressStats,
    log: ActivityLog,
    alreadyUnlockedIds: Set<string> = new Set(),
): string[] {
    return ACHIEVEMENTS.filter((acc) => isAchievementUnlocked(acc, stats, log, alreadyUnlockedIds))
        .map((acc) => acc.id);
}

function isAchievementUnlocked(
    achievement: Achievement,
    stats: ProgressStats,
    log: ActivityLog,
    alreadyUnlockedIds: Set<string> = new Set(),
): boolean {
    const req = achievement.requirement;
    const isAlreadyUnlocked = alreadyUnlockedIds.has(achievement.id);
    switch (req.type) {
        case "category_progress": {
            const cat = stats.categoryProgress[req.category];
            return cat && cat.totalVideos > 0
                ? (cat.completedVideos / cat.totalVideos) * 100 >=
                    req.percentage
                : false;
        }
        case "multi_category_progress": {
            return req.categories.every((c) => {
                const p = stats.categoryProgress[c.category];
                return p && p.totalVideos > 0
                    ? (p.completedVideos / p.totalVideos) * 100 >= c.percentage
                    : false;
            });
        }
        case "all_progress": {
            return stats.totalVideos > 0
                ? (stats.completedVideos / stats.totalVideos) * 100 >=
                    req.percentage
                : false;
        }
        case "streak":
            return log.currentStreak >= req.days;
        case "daily_progress":
            // Tek seferlik başarımlar için sadece ilk günde kazanılabilir
            return log.dailyVideosCompleted >= req.count && !isAlreadyUnlocked;
        case "total_active_days":
            return log.totalActiveDays >= req.days;
        // New RPG Requirements Logic
        case "quiz_honesty":
            return log.honestyUsageCount >= req.count;
        case "first_time_perfect":
            return log.firstTimePerfectCount >= (1); // Assuming req for single event, or count if needed
        case "clear_debt":
            return log.debtClearedInSession;
        case "consecutive_correct":
            return log.consecutiveCorrectStreak >= req.count;
        case "weekly_review_streak":
            return log.weeklyStudyDays >= req.days;
        case "topic_mastery_count":
            return log.masteredTopicsCount >= req.count;
        default:
            return false;
    }
}

export function getRequirementDescription(
    requirement: RequirementType,
): string {
    switch (requirement.type) {
        case "category_progress":
            return `${requirement.category} öğretilerinde %${requirement.percentage} aydınlanma`;
        case "multi_category_progress":
            return requirement.categories.map((c) =>
                `${c.category} %${c.percentage}`
            ).join(" + ");
        case "all_progress":
            return `Tüm ilimlerde %${requirement.percentage} ilerleme`;
        case "streak":
            return `${requirement.days} gün kesintisiz çalışma`;
        case "daily_progress":
            return `Bugün ${requirement.count}+ video tamamla`;
        case "total_active_days":
            return `Toplam ${requirement.days} gün aktif bilgelik`;
        // New RPG Requirements Descriptions
        case "quiz_honesty":
            return `${requirement.count} kez dürüstlük göstergesi`;
        case "first_time_perfect":
            return "İlk denemede kusursuz başarı";
        case "clear_debt":
            return "Tüm borçları tek seferde temizle";
        case "consecutive_correct":
            return `${requirement.count} ardışık doğru cevap`;
        case "weekly_review_streak":
            return `Haftada ${requirement.days} gün tekrar`;
        case "topic_mastery_count":
            return `${requirement.count} konuda tam ustalık`;
        default:
            return "Gizli gereksinim";
    }
}
