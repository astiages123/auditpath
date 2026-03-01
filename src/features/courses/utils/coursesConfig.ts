import {
  BadgeTurkishLira,
  Banknote,
  BookOpen,
  Brain,
  Briefcase,
  BriefcaseConveyorBelt,
  Calculator,
  Calendar,
  ChartColumnStacked,
  ChartNoAxesCombined,
  Code,
  Coffee,
  Coins,
  Earth,
  Gavel,
  Globe,
  GraduationCap,
  Handshake,
  History,
  Landmark,
  Languages,
  LucideIcon,
  Map,
  Puzzle,
  Receipt,
  ReceiptText,
  Scale,
  ScrollText,
  ShieldUser,
  Sigma,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

// --- Types ---

export interface DailyBlock {
  name: string; // "SABAH BLOK", "AKŞAM BLOK", "FİNAL BLOK"
  subject: string;
  icon: LucideIcon;
  theme: CourseTheme;
}

export interface WeeklyScheduleItem {
  id: number;
  dayIndex: number; // 0 = Sunday, 1 = Monday, etc.
  dayName: string;
  matchDays: number[]; // Days index that this schedule item applies to
  blocks: DailyBlock[];
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
    bg: 'bg-emerald-400/12',
    text: 'text-emerald-400',
    border: 'border-emerald-400/20',
    variable: '--course-color-emerald',
    hoverBg: 'hover:bg-emerald-400/20',
    gradient: 'bg-linear-to-br from-emerald-400/15 via-zinc-900/95 to-zinc-950',
    hoverGradient:
      'hover:from-emerald-400/25 hover:via-zinc-900/90 hover:to-zinc-900',
  },
  amber: {
    bg: 'bg-amber-400/12',
    text: 'text-amber-400',
    border: 'border-amber-400/20',
    variable: '--course-color-amber',
    hoverBg: 'hover:bg-amber-400/20',
    gradient: 'bg-linear-to-br from-amber-400/15 via-zinc-900/95 to-zinc-950',
    hoverGradient:
      'hover:from-amber-400/25 hover:via-zinc-900/90 hover:to-zinc-900',
  },
  blue: {
    bg: 'bg-blue-400/12',
    text: 'text-blue-400',
    border: 'border-blue-400/20',
    variable: '--course-color-blue',
    hoverBg: 'hover:bg-blue-400/20',
    gradient: 'bg-linear-to-br from-blue-400/15 via-zinc-900/95 to-zinc-950',
    hoverGradient:
      'hover:from-blue-400/25 hover:via-zinc-900/90 hover:to-zinc-900',
  },
  purple: {
    bg: 'bg-purple-400/12',
    text: 'text-purple-400',
    border: 'border-purple-400/20',
    variable: '--course-color-purple',
    hoverBg: 'hover:bg-purple-400/20',
    gradient: 'bg-linear-to-br from-purple-400/15 via-zinc-900/95 to-zinc-950',
    hoverGradient:
      'hover:from-purple-400/25 hover:via-zinc-900/90 hover:to-zinc-900',
  },
  rose: {
    bg: 'bg-rose-400/12',
    text: 'text-rose-400',
    border: 'border-rose-400/20',
    variable: '--course-color-rose',
    hoverBg: 'hover:bg-rose-400/20',
    gradient: 'bg-linear-to-br from-rose-400/15 via-zinc-900/95 to-zinc-950',
    hoverGradient:
      'hover:from-rose-400/25 hover:via-zinc-900/90 hover:to-zinc-900',
  },
  orange: {
    bg: 'bg-orange-400/12',
    text: 'text-orange-400',
    border: 'border-orange-400/20',
    variable: '--course-color-orange',
    hoverBg: 'hover:bg-orange-400/20',
    gradient: 'bg-linear-to-br from-orange-400/15 via-zinc-900/95 to-zinc-950',
    hoverGradient:
      'hover:from-orange-400/25 hover:via-zinc-900/90 hover:to-zinc-900',
  },
  primary: {
    bg: 'bg-primary/12',
    text: 'text-primary',
    border: 'border-primary/20',
    variable: '--course-color-primary',
    hoverBg: 'hover:bg-primary/20',
    gradient: 'bg-linear-to-br from-primary/15 via-zinc-900/95 to-zinc-950',
    hoverGradient:
      'hover:from-primary/25 hover:via-zinc-900/90 hover:to-zinc-900',
  },
};

export const WEEKLY_SCHEDULE: WeeklyScheduleItem[] = [
  {
    id: 1,
    dayIndex: 1,
    dayName: 'Pazartesi',
    matchDays: [1],
    blocks: [
      {
        name: 'SABAH BLOK',
        subject: 'Muhasebe',
        icon: Calculator,
        theme: 'blue',
      },
      {
        name: 'AKŞAM BLOK',
        subject: 'MA Okuma',
        icon: BookOpen,
        theme: 'purple',
      },
      {
        name: 'FİNAL BLOK',
        subject: 'Vibecoding',
        icon: Code,
        theme: 'primary',
      },
    ],
  },
  {
    id: 2,
    dayIndex: 2,
    dayName: 'Salı',
    matchDays: [2],
    blocks: [
      {
        name: 'SABAH BLOK',
        subject: 'ATA 584',
        icon: GraduationCap,
        theme: 'rose',
      },
      { name: 'AKŞAM BLOK', subject: 'YDS', icon: Globe, theme: 'amber' },
      {
        name: 'FİNAL BLOK',
        subject: 'Vibecoding',
        icon: Code,
        theme: 'primary',
      },
    ],
  },
  {
    id: 3,
    dayIndex: 3,
    dayName: 'Çarşamba',
    matchDays: [3],
    blocks: [
      {
        name: 'SABAH BLOK',
        subject: 'Uluslararası İlişkiler',
        icon: Landmark,
        theme: 'emerald',
      },
      {
        name: 'AKŞAM BLOK',
        subject: 'MA Okuma',
        icon: BookOpen,
        theme: 'purple',
      },
      {
        name: 'FİNAL BLOK',
        subject: 'Vibecoding',
        icon: Code,
        theme: 'primary',
      },
    ],
  },
  {
    id: 4,
    dayIndex: 4,
    dayName: 'Perşembe',
    matchDays: [4],
    blocks: [
      {
        name: 'SABAH BLOK',
        subject: 'Kamu Yönetimi',
        icon: Landmark,
        theme: 'blue',
      },
      {
        name: 'AKŞAM BLOK',
        subject: 'MA Okuma',
        icon: BookOpen,
        theme: 'purple',
      },
      {
        name: 'FİNAL BLOK',
        subject: 'Vibecoding',
        icon: Code,
        theme: 'primary',
      },
    ],
  },
  {
    id: 5,
    dayIndex: 5,
    dayName: 'Cuma',
    matchDays: [5],
    blocks: [
      {
        name: 'SABAH BLOK',
        subject: 'İktisat',
        icon: TrendingUp,
        theme: 'emerald',
      },
      { name: 'AKŞAM BLOK', subject: 'Hukuk', icon: Scale, theme: 'rose' },
      {
        name: 'FİNAL BLOK',
        subject: 'Vibecoding',
        icon: Code,
        theme: 'primary',
      },
    ],
  },
  {
    id: 6,
    dayIndex: 6,
    dayName: 'Cumartesi',
    matchDays: [6],
    blocks: [
      {
        name: 'SABAH BLOK',
        subject: 'Maliye',
        icon: Calculator,
        theme: 'purple',
      },
      { name: 'AKŞAM BLOK', subject: 'YDS', icon: Globe, theme: 'amber' },
      {
        name: 'FİNAL BLOK',
        subject: 'Vibecoding',
        icon: Code,
        theme: 'primary',
      },
    ],
  },
  {
    id: 7,
    dayIndex: 0,
    dayName: 'Pazar',
    matchDays: [0],
    blocks: [
      { name: 'SABAH BLOK', subject: 'TATİL', icon: Coffee, theme: 'rose' },
      { name: 'AKŞAM BLOK', subject: 'TATİL', icon: Coffee, theme: 'rose' },
      {
        name: 'FİNAL BLOK',
        subject: 'PLANLAMA',
        icon: Calendar,
        theme: 'amber',
      },
    ],
  },
];

export const CATEGORY_THEMES: Record<
  string,
  {
    Icon: LucideIcon;
    theme: CourseTheme;
  }
> = {
  'GENEL YETENEK VE GENEL KÜLTÜR': {
    Icon: Brain,
    theme: 'orange',
  },
  HUKUK: {
    Icon: Scale,
    theme: 'rose',
  },
  İKTİSAT: {
    Icon: TrendingUp,
    theme: 'emerald',
  },
  'MUHASEBE VE MALİYE': {
    Icon: Calculator,
    theme: 'blue',
  },
  'YABANCI DİL': {
    Icon: Globe,
    theme: 'amber',
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
    keywords: [
      'iktisat',
      'ekonomi',
      'mikro',
      'makro',
      'büyüme',
      'kalkınma',
      'doktrinler',
    ],
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
      'medeni',
      'ticaret',
    ],
    theme: 'rose',
    icon: Gavel,
  },
  {
    keywords: [
      'muhasebe',
      'hesap',
      'finansal',
      'maliyet',
      'şirketler',
      'bilanço',
      'maliye',
      'vergi',
      'bütçe',
      'borçlanma',
      'kamu maliyesi',
    ],
    theme: 'blue',
    icon: Calculator,
  },
  {
    keywords: [
      'genel kültür',
      'tarih',
      'coğrafya',
      'vatandaşlık',
      'matematik',
      'sözel mantık',
      'geometri',
    ],
    theme: 'orange',
    icon: Brain,
  },
  {
    keywords: ['ingilizce', 'yabancı dil', 'dil'],
    theme: 'amber',
    icon: Globe,
  },
];

// Special case overrides for icons - specific course to icon mapping
export const ICON_OVERRIDES: Array<{ keyword: string; icon: LucideIcon }> = [
  // GENEL YETENEK VE GENEL KÜLTÜR
  { keyword: 'sozel-mantik', icon: Puzzle },
  { keyword: 'matematik-ve-geometri', icon: Sigma },
  { keyword: 'tarih', icon: ScrollText },
  { keyword: 'cografya', icon: Map },
  { keyword: 'vatandaslik', icon: ShieldUser },
  // HUKUK
  { keyword: 'anayasa-hukuku', icon: Scale },
  { keyword: 'i-dare-hukuku', icon: Landmark },
  { keyword: 'ceza-hukuku', icon: Gavel },
  { keyword: 'borclar-hukuku', icon: Handshake },
  { keyword: 'medeni-hukuk', icon: Users },
  { keyword: 'ticaret-hukuku', icon: Briefcase },
  // İKTİSAT
  { keyword: 'mikro-iktisat', icon: ChartNoAxesCombined },
  { keyword: 'makro-iktisat', icon: Earth },
  { keyword: 'iktisadi-doktrinler-tarihi', icon: History },
  { keyword: 'para-banka-ve-kredi', icon: Banknote },
  { keyword: 'uluslararasi-iktisat', icon: Globe },
  { keyword: 'kalkinma-ve-buyume', icon: TrendingUp },
  { keyword: 'turkiye-ekonomisi', icon: BadgeTurkishLira },
  // MUHASEBE VE MALİYE
  { keyword: 'kamu-maliyesi', icon: Landmark },
  { keyword: 'butce', icon: Wallet },
  { keyword: 'devlet-borclanmasi', icon: Handshake },
  { keyword: 'maliye-politikasi', icon: Briefcase },
  { keyword: 'vergi-hukuku', icon: Receipt },
  { keyword: 'turk-vergi-sistemi', icon: ReceiptText },
  { keyword: 'finansal-muhasebe', icon: Calculator },
  { keyword: 'maliyet-muhasebesi', icon: Coins },
  { keyword: 'sirketler-muhasebesi', icon: BriefcaseConveyorBelt },
  { keyword: 'mali-tablolar-analizi', icon: ChartColumnStacked },
  // YABANCI DİL
  { keyword: 'i-ngilizce', icon: Languages },
];
