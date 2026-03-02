import {
  BadgeTurkishLira,
  Banknote,
  BookOpen,
  BookText,
  Brain,
  Briefcase,
  Building,
  Building2,
  Calculator,
  ChartNoAxesCombined,
  Code,
  Crown,
  Factory,
  FileSignature,
  Gavel,
  Globe,
  GraduationCap,
  Handshake,
  Hourglass,
  IdCard,
  Languages,
  Library,
  LucideIcon,
  Map,
  Newspaper,
  Puzzle,
  Pyramid,
  Scale,
  Scroll,
  Coins,
  Ship,
  Sigma,
  Sprout,
  Stamp,
  Table,
  TrendingUp,
  Users,
  Vote,
} from 'lucide-react';

// --- Types ---

export interface DailyBlock {
  name: string; // "SABAH BLOK", "AKŞAM BLOK", "FİNAL BLOK"
  subject: string;
  courseOrCategoryId?: string; // used to derive icon and theme
  icon?: LucideIcon; // override
  theme?: CourseTheme; // override
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

export const CATEGORY_THEMES: Record<
  string,
  {
    Icon: LucideIcon;
    theme: CourseTheme;
  }
> = {
  GY_GK: { Icon: Brain, theme: 'orange' },
  HUKUK: { Icon: Scale, theme: 'rose' },
  IKTISAT: { Icon: TrendingUp, theme: 'emerald' },
  MUHASEBE_MALIYE: { Icon: Calculator, theme: 'blue' },
  KAMU_YONETIMI: { Icon: BookText, theme: 'purple' },
  ULUSLARARASI_ILISKILER: { Icon: Globe, theme: 'amber' },
  ATA_584: { Icon: GraduationCap, theme: 'rose' },
};

export const ICON_OVERRIDES: Record<string, LucideIcon> = {
  // GY_GK
  'sozel-mantik': Puzzle,
  'matematik-ve-geometri': Sigma,
  tarih: Hourglass,
  cografya: Map,
  vatandaslik: IdCard,
  ingilizce: Languages,
  // HUKUK
  'anayasa-hukuku': Crown,
  'idare-hukuku': Building,
  'ceza-hukuku': Gavel,
  'borclar-hukuku': FileSignature,
  'medeni-hukuk': Users,
  'ticaret-hukuku': Briefcase,
  'icra-iflas-hukuku': Stamp,
  // IKTISAT
  'mikro-iktisat': ChartNoAxesCombined,
  'makro-iktisat': Factory,
  'para-banka-kredi': Banknote,
  'uluslararasi-iktisat': Ship,
  'kalkinma-buyume': Sprout,
  'turkiye-ekonomisi': BadgeTurkishLira,
  'iktisadi-doktrinler-tarihi': Library,
  // MUHASEBE VE MALİYE
  maliye: Coins,
  muhasebe: Table,
  // KAMU YÖNETİMİ
  'siyaset-bilimi': Vote,
  'yonetim-bilimi': Pyramid,
  'turk-siyasal-hayati': Newspaper,
  'yerel-yonetimler': Building2,
  // ULUSLARARASI İLİŞKİLER
  'diplomasi-tarihi': Scroll,
  'turk-dis-politikasi': Globe,
  'uluslararasi-hukuk': Handshake,
  'uluslararasi-orgutler': Globe,
  'uluslararasi-iliskiler-kuramlari': Brain,
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
        courseOrCategoryId: 'muhasebe',
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
      {
        name: 'AKŞAM BLOK',
        subject: 'Yabancı Dil',
        courseOrCategoryId: 'ingilizce',
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
    id: 3,
    dayIndex: 3,
    dayName: 'Çarşamba',
    matchDays: [3],
    blocks: [
      {
        name: 'SABAH BLOK',
        subject: 'Uluslararası İlişkiler',
        courseOrCategoryId: 'ULUSLARARASI_ILISKILER',
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
        courseOrCategoryId: 'KAMU_YONETIMI',
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
      { name: 'SABAH BLOK', subject: 'İktisat', courseOrCategoryId: 'IKTISAT' },
      { name: 'AKŞAM BLOK', subject: 'Hukuk', courseOrCategoryId: 'HUKUK' },
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
      { name: 'SABAH BLOK', subject: 'Maliye', courseOrCategoryId: 'maliye' },
      {
        name: 'AKŞAM BLOK',
        subject: 'Yabancı Dil',
        courseOrCategoryId: 'ingilizce',
      },
      {
        name: 'FİNAL BLOK',
        subject: 'Vibecoding',
        icon: Code,
        theme: 'primary',
      },
    ],
  },
];
