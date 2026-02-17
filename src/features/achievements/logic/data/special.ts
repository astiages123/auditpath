import { type Achievement } from "../../types/achievementsTypes";

export const SPECIAL_ACHIEVEMENTS: Achievement[] = [
    {
        id: "special-01",
        title: "Gece Nöbetçisi",
        motto: "Tek bir tefekkür oturumunda tam 5 parşömen bitirdin.",
        imagePath: "/badges/special-01.webp",
        guild: "SPECIAL",
        requirement: { type: "daily_progress", count: 5 },
        order: 22,
        isPermanent: true,
    },
    {
        id: "special-02",
        title: "Zihinsel Maraton",
        motto: "Zihnin sınırlarını zorlayan 10 videoluk devasa bir adım.",
        imagePath: "/badges/special-02.webp",
        guild: "SPECIAL",
        requirement: { type: "daily_progress", count: 10 },
        order: 23,
        isPermanent: true,
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
        isPermanent: true,
    },
    {
        id: "special-04",
        title: "Kutsal Adanmışlık",
        motto: "Bilgelik yolunda tam bir ay boyunca her gün yürüdün.",
        imagePath: "/badges/special-04.webp",
        guild: "SPECIAL",
        requirement: { type: "streak", days: 30 },
        order: 25,
        isPermanent: true,
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
        isPermanent: true,
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
        title: "Yüce Üstad",
        motto:
            "Tüm mühürler toplandı, tüm isimler öğrenildi. Sen artık yaşayan bir efsanesin.",
        imagePath: "/badges/special-07.webp",
        guild: "SPECIAL",
        requirement: { type: "all_progress", percentage: 100 },
        order: 28,
    },
];
