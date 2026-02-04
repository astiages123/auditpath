export type CourseCategory = "SKILL_BASED" | "SCENARIO_BASED" | "THEORY_BASED";

export interface BloomStrategy {
    bloomLevel: "knowledge" | "application" | "analysis";
    baseInstruction: string;
}

const CATEGORY_MAPPINGS: Record<string, CourseCategory> = {
    // SKILL_BASED
    "İngilizce": "SKILL_BASED",
    "Sözel Mantık": "SKILL_BASED",
    "Matematik": "SKILL_BASED",
    "Sayısal Mantık": "SKILL_BASED",
    "İstatistik": "SKILL_BASED",

    // SCENARIO_BASED
    "Medeni Hukuk": "SCENARIO_BASED",
    "Borçlar Hukuku": "SCENARIO_BASED",
    "Ticaret Hukuku": "SCENARIO_BASED",
    "Bankacılık Hukuku": "SCENARIO_BASED",
    "İcra ve İflas Hukuku": "SCENARIO_BASED",
    "Türk Ceza Kanunu": "SCENARIO_BASED",
    "İş Hukuku": "SCENARIO_BASED",
    "Medeni Usul Hukuku": "SCENARIO_BASED",
    "Genel Muhasebe": "SCENARIO_BASED",
    "Banka Muhasebesi": "SCENARIO_BASED",
    "Finans Matematiği": "SCENARIO_BASED",
    "Finansal Yönetim": "SCENARIO_BASED",

    // THEORY_BASED
    "Mikro İktisat": "THEORY_BASED",
    "Makro İktisat": "THEORY_BASED",
    "Para, Banka ve Kredi": "THEORY_BASED",
    "Uluslararası Ticaret": "THEORY_BASED",
    "Türkiye Ekonomisi": "THEORY_BASED",
    "Maliye Teorisi": "THEORY_BASED",
    "İşletme Yönetimi": "THEORY_BASED",
    "Pazarlama Yönetimi": "THEORY_BASED",
};

// Fallback for unknown courses
const DEFAULT_CATEGORY: CourseCategory = "THEORY_BASED";

export function getCourseCategory(courseName: string): CourseCategory {
    // Case-insensitive lookup if needed, but given inputs seem exact.
    // Using direct lookup for now, can improve if needed.
    return CATEGORY_MAPPINGS[courseName] || DEFAULT_CATEGORY;
}

// Bloom level distributions (Modulo 10)
// The array index corresponds to (questionIndex % 10)
export const CATEGORY_DISTRIBUTIONS: Record<
    CourseCategory,
    ("knowledge" | "application" | "analysis")[]
> = {
    // SKILL_BASED: %10 Bilgi (0), %60 Uygulama (1-6), %30 Analiz (7-9)
    SKILL_BASED: [
        "knowledge", // 0
        "application", // 1
        "application", // 2
        "application", // 3
        "application", // 4
        "application", // 5
        "application", // 6
        "analysis", // 7
        "analysis", // 8
        "analysis", // 9
    ],

    // SCENARIO_BASED: %20 Bilgi (0-1), %60 Uygulama (2-7), %20 Analiz (8-9)
    SCENARIO_BASED: [
        "knowledge", // 0
        "knowledge", // 1
        "application", // 2
        "application", // 3
        "application", // 4
        "application", // 5
        "application", // 6
        "application", // 7
        "analysis", // 8
        "analysis", // 9
    ],

    // THEORY_BASED: %20 Bilgi (0-1), %60 Uygulama (2-7), %20 Analiz (8-9) - STRATEGY 5: REDUCED KNOWLEDGE
    THEORY_BASED: [
        "knowledge", // 0
        "knowledge", // 1
        "application", // 2
        "application", // 3
        "application", // 4
        "application", // 5
        "application", // 6
        "application", // 7
        "analysis", // 8
        "analysis", // 9
    ],
};

// Instruction templates based on Bloom Level
export const BLOOM_INSTRUCTIONS = {
    knowledge:
        "Temel bilgi ve kavrama düzeyinde, akademik bir dille hazırlanmış öğretici bir soru üret. Tanım, ilke veya kavramsal özelliklere odaklan.",
    application:
        "Kuru tanım sorma. Kullanıcının günlük hayatta karşılaşabileceği, isimler ve olaylar içeren spesifik bir 'vaka/senaryo' (vignette) kurgula.",
    analysis:
        "Metindeki iki farklı kavramı karşılaştıran veya bir kuralın istisnasını sorgulayan 'muhakeme' odaklı bir soru üret. Soru, 'X olursa Y nasıl etkilenir?' gibi neden-sonuç zinciri kurdurmalıdır.",
};
