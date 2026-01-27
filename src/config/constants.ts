
export interface Rank {
  id: string;
  name: string;
  minPercentage: number;
  color: string;
  motto: string;
  imagePath: string;
  order: number;
}

export const RANKS: Rank[] = [
  { 
    id: "1", 
    name: "Sürgün", 
    minPercentage: 0,
    color: "text-slate-500", 
    motto: "Bilginin krallığından uzakta, sislerin içinde yolunu arıyorsun.", 
    imagePath: "/ranks/rank1.webp",
    order: 1
  },
  { 
    id: "2", 
    name: "Yazıcı", 
    minPercentage: 25,
    color: "text-amber-700", 
    motto: "Kadim metinleri kopyalayarak bilgeliğin izlerini sürmeye başladın.", 
    imagePath: "/ranks/rank2.webp",
    order: 2
  },
  { 
    id: "3", 
    name: "Sınır Muhafızı", 
    minPercentage: 50,
    color: "text-blue-400", 
    motto: "Bilgi krallığının sınırlarını koruyor, cehaletin gölgeleriyle savaşıyorsun.", 
    imagePath: "/ranks/rank3.webp",
    order: 3
  },
  { 
    id: "4", 
    name: "Yüce Bilgin", 
    minPercentage: 75,
    color: "text-purple-500", 
    motto: "Görünmeyeni görüyor, bilinmeyeni biliyorsun. Hikmetin ışığı sensin.", 
    imagePath: "/ranks/rank4.webp",
    order: 4
  },
];

export function getRankForPercentage(percentage: number): Rank {
  // Sort by minPercentage descending to find the highest matching rank
  const sortedRanks = [...RANKS].sort((a, b) => b.minPercentage - a.minPercentage);
  for (const rank of sortedRanks) {
    if (percentage >= rank.minPercentage) {
      return rank;
    }
  }
  return RANKS[0]; // Fallback
}
