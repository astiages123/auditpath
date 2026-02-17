import { type Achievement } from "../../types/achievementsTypes";

export const GENERAL_ACHIEVEMENTS: Achievement[] = [
    {
        id: "genel_10",
        title: "Yolcu Meşalesi",
        motto: "Zihnin karanlık koridorlarında ilk meşaleyi sen yaktın.",
        imagePath: "/badges/genel-10.webp",
        guild: "GENEL_YETENEK",
        requirement: {
            type: "category_progress",
            category: "GENEL_YETENEK",
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
            category: "GENEL_YETENEK",
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
            category: "GENEL_YETENEK",
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
            category: "GENEL_YETENEK",
            percentage: 100,
        },
        order: 16,
    },
];
