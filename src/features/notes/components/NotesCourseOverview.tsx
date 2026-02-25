import { Trophy, Target, BookOpen, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/stringHelpers';

interface NotesCourseOverviewProps {
  courseName: string;
  onStartReading: () => void;
  videoProgress?: number;
}

export function NotesCourseOverview({
  courseName,
  onStartReading,
  videoProgress = 0,
}: NotesCourseOverviewProps) {
  const stats = [
    {
      label: 'Video İlerlemesi',
      value: `%${videoProgress}`,
      icon: Target,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Okuma Durumu',
      value: 'Hazır',
      icon: BookOpen,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
  ];

  return (
    <div className="flex-col flex items-center justify-center p-8 h-full space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Notlarını İncelemeye Başla
          </h2>
          <p className="text-muted-foreground text-base">
            <span className="font-semibold text-foreground">{courseName}</span>{' '}
            dersindeki notlarına göz at ve eksiklerini tamamla.
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-card border border-border/50 p-4 rounded-2xl flex items-center gap-4 hover:border-border/80 transition-colors"
          >
            <div className={cn('p-3 rounded-xl', stat.bg, stat.color)}>
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

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-lg"
      >
        <Button
          size="lg"
          className="w-full h-14 text-lg font-bold gap-2 shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]"
          onClick={onStartReading}
        >
          {videoProgress > 0 ? 'Okumaya Devam Et' : 'Okumaya Başla'}
          <ArrowRight className="w-5 h-5" />
        </Button>
      </motion.div>
    </div>
  );
}
