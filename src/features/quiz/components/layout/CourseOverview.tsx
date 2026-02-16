import React from 'react';
import { Target, Trophy, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface CourseOverviewProps {
  courseName: string;
  progress: {
    total: number;
    solved: number;
    percentage: number;
  } | null;
}

export function CourseOverview({ courseName, progress }: CourseOverviewProps) {
  const stats = [
    {
      label: 'Ders İlerlemesi',
      value: progress ? `%${progress.percentage}` : '...',
      icon: Target,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Çözülen Soru',
      value: progress ? `${progress.solved} / ${progress.total}` : '...',
      icon: HelpCircle,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center p-8 h-full space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">
            Başlamaya Hazır Mısın?
          </h2>
          <p className="text-muted-foreground text-lg">
            {courseName} dersindeki durumunu incele ve bir konu seçerek başla.
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            className="bg-card border border-border/50 p-4 rounded-2xl flex items-center gap-4 hover:border-border/80 transition-colors"
          >
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground font-medium">
                {stat.label}
              </div>
              <div className="text-xl font-bold">{stat.value}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
