import {
  BadgePercent,
  BadgeTurkishLira,
  Banknote,
  BookOpen,
  Brain,
  Briefcase,
  BriefcaseConveyorBelt,
  Calculator,
  ChartColumnStacked,
  ChartNoAxesCombined,
  ClipboardList,
  Coins,
  Container,
  Earth,
  Gavel,
  Globe,
  Hammer,
  Handshake,
  HardHat,
  Landmark,
  Languages,
  LucideIcon,
  Megaphone,
  PiggyBank,
  Presentation,
  Puzzle,
  Receipt,
  Scale,
  ShieldUser,
  Sigma,
  TrendingUp,
  Users,
  Vault,
  Wallet,
} from 'lucide-react';

// --- Types ---

export interface WeeklyScheduleItem {
  id: number;
  dayIndex: number; // 0 = Sunday, 1 = Monday, etc.
  dayName: string;
  subject: string;
  icon: LucideIcon;
  theme: CourseTheme; // Refers to a key in COURSE_THEMES
  matchDays: number[]; // Days index that this schedule item applies to
}

export type CourseTheme =
  | 'emerald'
  | 'amber'
  | 'blue'
  | 'purple'
  | 'rose'
  | 'orange'
  | 'primary';

// --- Constants ---

export const COURSE_THEME_CONFIG: Record<
  CourseTheme,
  {
    bg: string; // Tailwind class
    text: string; // Tailwind class
    border: string; // Tailwind class
    variable: string; // CSS variable name prefix
    hoverBg: string; // Tailwind class
    gradient: string; // Dark gradient for cards
    hoverGradient: string; // Intensified gradient on hover
  }
> = {
  emerald: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-500',
    border: 'border-emerald-500/20',
    variable: '--course-color-emerald',
    hoverBg: 'hover:bg-emerald-500/30',
    gradient: 'bg-linear-to-br from-emerald-500/25 via-zinc-900/95 to-zinc-950',
    hoverGradient:
      'hover:from-emerald-500/40 hover:via-zinc-900/90 hover:to-zinc-900',
  },
  amber: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-500',
    border: 'border-amber-500/20',
    variable: '--course-color-amber',
    hoverBg: 'hover:bg-amber-500/30',
    gradient: 'bg-linear-to-br from-amber-500/25 via-zinc-900/95 to-zinc-950',
    hoverGradient:
      'hover:from-amber-500/40 hover:via-zinc-900/90 hover:to-zinc-900',
  },
  blue: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-500',
    border: 'border-blue-500/20',
    variable: '--course-color-blue',
    hoverBg: 'hover:bg-blue-500/30',
    gradient: 'bg-linear-to-br from-blue-500/25 via-zinc-900/95 to-zinc-950',
    hoverGradient:
      'hover:from-blue-500/40 hover:via-zinc-900/90 hover:to-zinc-900',
  },
  purple: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-500',
    border: 'border-purple-500/20',
    variable: '--course-color-purple',
    hoverBg: 'hover:bg-purple-500/30',
    gradient: 'bg-linear-to-br from-purple-500/25 via-zinc-900/95 to-zinc-950',
    hoverGradient:
      'hover:from-purple-500/40 hover:via-zinc-900/90 hover:to-zinc-900',
  },
  rose: {
    bg: 'bg-rose-500/20',
    text: 'text-rose-500',
    border: 'border-rose-500/20',
    variable: '--course-color-rose',
    hoverBg: 'hover:bg-rose-500/30',
    gradient: 'bg-linear-to-br from-rose-500/25 via-zinc-900/95 to-zinc-950',
    hoverGradient:
      'hover:from-rose-500/40 hover:via-zinc-900/90 hover:to-zinc-900',
  },
  orange: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-500',
    border: 'border-orange-500/20',
    variable: '--course-color-orange',
    hoverBg: 'hover:bg-orange-500/30',
    gradient: 'bg-linear-to-br from-orange-500/25 via-zinc-900/95 to-zinc-950',
    hoverGradient:
      'hover:from-orange-500/40 hover:via-zinc-900/90 hover:to-zinc-900',
  },
  primary: {
    bg: 'bg-primary/20',
    text: 'text-primary',
    border: 'border-primary/20',
    variable: '--course-color-primary',
    hoverBg: 'hover:bg-primary/30',
    gradient: 'bg-linear-to-br from-primary/25 via-zinc-900/95 to-zinc-950',
    hoverGradient:
      'hover:from-primary/40 hover:via-zinc-900/90 hover:to-zinc-900',
  },
};

export const WEEKLY_SCHEDULE: WeeklyScheduleItem[] = [
  {
    id: 1,
    dayIndex: 1,
    dayName: 'Pazartesi',
    subject: 'Ekonomi',
    icon: BookOpen,
    theme: 'emerald',
    matchDays: [1],
  },
  {
    id: 2,
    dayIndex: 2,
    dayName: 'Salı',
    subject: 'Hukuk',
    icon: BookOpen,
    theme: 'rose',
    matchDays: [2],
  },
  {
    id: 3,
    dayIndex: 3,
    dayName: 'Çarşamba',
    subject: 'Ekonomi',
    icon: BookOpen,
    theme: 'emerald',
    matchDays: [3],
  },
  {
    id: 4,
    dayIndex: 4,
    dayName: 'Perşembe',
    subject: 'Hukuk',
    icon: BookOpen,
    theme: 'rose',
    matchDays: [4],
  },
  {
    id: 5,
    dayIndex: 5,
    dayName: 'Cuma',
    subject: 'Genel Yetenek - İngilizce',
    icon: BookOpen,
    theme: 'purple',
    matchDays: [5],
  },
  {
    id: 6,
    dayIndex: 6,
    dayName: 'Cumartesi / Pazar',
    subject: 'Muhasebe ve Maliye',
    icon: BookOpen,
    theme: 'blue',
    matchDays: [6, 0],
  },
];

export const CATEGORY_THEMES: Record<
  string,
  {
    Icon: LucideIcon;
    theme: CourseTheme;
  }
> = {
  EKONOMİ: {
    Icon: TrendingUp,
    theme: 'emerald',
  },
  HUKUK: {
    Icon: Scale,
    theme: 'rose',
  },
  'MUHASEBE VE MALİYE': {
    Icon: Calculator,
    theme: 'purple',
  },
  'GENEL YETENEK VE İNGİLİZCE': {
    Icon: Brain,
    theme: 'orange',
  },
};

// Map old color names to our themes if needed, or just use the config directly.
// In CategoryCard, it used 'orange' for GY-GK. Let's add 'orange' to CourseTheme if strictly needed,
// but for now I'll map it to 'amber' or 'primary' or add 'orange' to config.
// The original code had 'orange' for Genelyetenek. 'amber' is close.
// Let's stick to existing themes in config or add 'orange' if valid.
// COURSE_THEME_CONFIG doesn't have orange. It has amber.
// I will use 'amber' for General Talent to keep it consistent with 'amber' definition if it exists,
// or I can add 'orange' to COURSE_THEME_CONFIG.
// Current COURSE_THEME_CONFIG: emerald, amber, blue, purple, rose, primary.
// Hukuk was 'blue' in CategoryCard (weird, usually Hukuk is associated with scales/red/brown, but ok).
// Wait, in CategoryCard:
// EKONOMI -> Emerald
// HUKUK -> Blue
// MUHASEBE -> Purple
// GENEL -> Orange
//
// In courses.logic (getCourseColor):
// Hukuk -> Amber
// Muhasebe -> Blue
// Maliye -> Purple
//
// There is a mismatch between generic course logic and category card logic!
// "Hukuk" courses were Amber in `courses-logic.ts` (legacy) but Blue in `CategoryCard`.
// "Muhasebe" courses were Blue in `courses-logic` but Purple in `CategoryCard` (paired with Maliye).
//
// I should standardize this.
// I will trust `CategoryCard` grouping more for the "Subject" level, but `courses-logic` is for individual items.
// Let's update `CATEGORY_THEMES` to be the source of truth and update `COURSE_THEME_CONFIG` to include 'orange' if needed.

// Mappings for course keywords to themes and icons
export const COURSE_KEYWORD_MAPPINGS: Array<{
  keywords: string[];
  theme: CourseTheme;
  icon: LucideIcon;
}> = [
  {
    keywords: ['mikro', 'makro', 'iktisat', 'ekonomi'],
    theme: 'emerald',
    icon: TrendingUp,
  },
  {
    keywords: [
      'hukuk',
      'anayasa',
      'ceza',
      'idare',
      'borçlar',
      'eşya',
      'ticaret',
    ],
    theme: 'rose',
    icon: Gavel,
  },
  {
    keywords: ['muhasebe', 'hesap', 'finans'],
    theme: 'blue', // Muhasebe -> Blue
    icon: Calculator,
  },
  {
    keywords: ['maliye', 'vergi', 'bütçe'],
    theme: 'purple', // Maliye -> Purple
    icon: PiggyBank,
  },
  {
    keywords: ['ingilizce', 'english', 'dil'],
    theme: 'orange',
    icon: Globe,
  },
  {
    keywords: ['genel yetenek', 'türkçe', 'matematik', 'tarih', 'coğrafya'],
    theme: 'orange',
    icon: Brain,
  },
  // Fallbacks or specific overrides
  {
    keywords: ['devlet'],
    theme: 'rose',
    icon: Briefcase,
  },
];

// Special case overrides for icons - specific course to icon mapping
export const ICON_OVERRIDES: Array<{ keyword: string; icon: LucideIcon }> = [
  // EKONOMİ
  { keyword: 'mikro-iktisat', icon: ChartNoAxesCombined },
  { keyword: 'makro-iktisat', icon: Earth },
  { keyword: 'para-banka-ve-kredi', icon: Banknote },
  { keyword: 'uluslararasi-ticaret', icon: Container },
  { keyword: 'turkiye-ekonomisi', icon: BadgeTurkishLira },
  // HUKUK
  { keyword: 'medeni-hukuk', icon: Users },
  { keyword: 'borclar-hukuku', icon: Handshake },
  { keyword: 'ticaret-hukuku', icon: BriefcaseConveyorBelt },
  { keyword: 'bankacilik-hukuku', icon: Landmark },
  { keyword: 'icra-ve-iflas-hukuku', icon: Hammer },
  { keyword: 'turk-ceza-kanunu', icon: ShieldUser },
  { keyword: 'is-hukuku', icon: HardHat },
  { keyword: 'medeni-usul-hukuku', icon: ClipboardList },
  // MUHASEBE VE MALİYE
  { keyword: 'muhasebe', icon: Receipt },
  { keyword: 'maliye', icon: Coins },
  { keyword: 'banka-muhasebesi', icon: Vault },
  { keyword: 'isletme-yonetimi', icon: Presentation },
  { keyword: 'pazarlama-yonetimi', icon: Megaphone },
  { keyword: 'finansal-yonetim', icon: Wallet },
  // GENEL YETENEK VE İNGİLİZCE
  { keyword: 'finans-matematigi', icon: BadgePercent },
  { keyword: 'matematik', icon: Sigma },
  { keyword: 'istatistik', icon: ChartColumnStacked },
  { keyword: 'sozel-mantik', icon: Puzzle },
  { keyword: 'ingilizce', icon: Languages },
];
