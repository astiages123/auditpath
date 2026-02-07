import {
    BarChart3,
    BookOpen,
    Briefcase,
    Calculator,
    FileText,
    Gavel,
    Globe,
    Languages,
    LucideIcon,
    PiggyBank,
    Scale,
    TrendingUp,
} from "lucide-react";

/**
 * Returns the appropriate icon for a course based on its name
 */
export function getCourseIcon(courseName: string | null): LucideIcon {
    if (!courseName) return BookOpen;

    const name = courseName.toLowerCase();

    if (name.includes("mikro") || name.includes("iktisat")) return TrendingUp;
    if (name.includes("makro")) return BarChart3;
    if (
        name.includes("hukuk") || name.includes("anayasa") ||
        name.includes("ceza")
    ) return Gavel;
    if (name.includes("muhasebe") || name.includes("hesap")) return Calculator;
    if (name.includes("maliye") || name.includes("vergi")) return PiggyBank;
    if (name.includes("ingilizce") || name.includes("english")) return Globe;
    if (name.includes("yabancı dil") || name.includes("dil")) return Languages;
    if (name.includes("borçlar") || name.includes("eşya")) return Scale;
    if (name.includes("idare") || name.includes("devlet")) return Briefcase;

    return FileText;
}

/**
 * Returns the background color class for a course based on its name
 */
export function getCourseColor(courseName: string | null): string {
    if (!courseName) return "bg-primary/20";

    const name = courseName.toLowerCase();

    if (
        name.includes("mikro") || name.includes("makro") ||
        name.includes("iktisat")
    ) return "bg-emerald-500/20";
    if (
        name.includes("hukuk") || name.includes("anayasa") ||
        name.includes("ceza")
    ) return "bg-amber-500/20";
    if (name.includes("muhasebe")) return "bg-blue-500/20";
    if (name.includes("maliye") || name.includes("vergi")) {
        return "bg-purple-500/20";
    }
    if (
        name.includes("ingilizce") || name.includes("english") ||
        name.includes("dil")
    ) return "bg-rose-500/20";

    return "bg-primary/20";
}

/**
 * Returns the icon color class for a course based on its name
 */
export function getCourseIconColor(courseName: string | null): string {
    if (!courseName) return "text-primary";

    const name = courseName.toLowerCase();

    if (
        name.includes("mikro") || name.includes("makro") ||
        name.includes("iktisat")
    ) return "text-emerald-500";
    if (
        name.includes("hukuk") || name.includes("anayasa") ||
        name.includes("ceza")
    ) return "text-amber-500";
    if (name.includes("muhasebe")) return "text-blue-500";
    if (name.includes("maliye") || name.includes("vergi")) {
        return "text-purple-500";
    }
    if (
        name.includes("ingilizce") || name.includes("english") ||
        name.includes("dil")
    ) return "text-rose-500";

    return "text-primary";
}
