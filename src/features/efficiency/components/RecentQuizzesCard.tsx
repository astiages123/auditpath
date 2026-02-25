import { ClipboardCheck, Maximize2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/shared/components/GlassCard';
import { CardHeader } from './CardElements';

import { EfficiencyModal } from './EfficiencyModal';
import { cn } from '@/utils/stringHelpers';
import { useCognitiveInsights } from '../hooks/useCognitiveInsights';
import { Skeleton } from '@/components/ui/skeleton';
import { RecentQuizSession } from '@/features/quiz/types';
import { formatDisplayDate } from '@/utils/dateUtils';

const formatDate = (dateStr: string) => {
  return formatDisplayDate(dateStr, {
    day: 'numeric',
    month: 'long',
  });
};

const ScoreBoard = ({
  correct,
  incorrect,
  blank,
}: {
  correct: number;
  incorrect: number;
  blank: number;
}) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-col flex-center size-15 rounded-xl bg-emerald-900/50">
        <span className="text-sm font-black text-white leading-none">
          {correct}
        </span>
        <span className="text-[12px] font-black text-white uppercase tracking-tighter mt-1">
          Doğru
        </span>
      </div>
      <div className="flex-col flex-center size-15 rounded-xl bg-rose-900/50">
        <span className="text-sm font-black text-white leading-none">
          {incorrect}
        </span>
        <span className="text-[12px] font-black text-white uppercase tracking-tighter mt-1">
          Yanlış
        </span>
      </div>
      <div className="flex-col flex-center size-15 rounded-xl bg-amber-900/50">
        <span className="text-sm font-black text-white leading-none">
          {blank}
        </span>
        <span className="text-[12px] font-black text-white uppercase tracking-tighter mt-1">
          Boş
        </span>
      </div>
    </div>
  );
};

const QuizHistoryContent = ({ quizzes }: { quizzes: RecentQuizSession[] }) => (
  <div className="space-y-2 md:space-y-3 p-2">
    {quizzes.length > 0 ? (
      quizzes.map((quiz, index) => (
        <motion.div
          key={quiz.uniqueKey}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="p-3 md:p-4 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/6 transition-all group flex-between"
        >
          <div className="flex flex-col gap-1">
            <h4 className="font-semibold text-white/90 group-hover:text-primary transition-colors">
              {quiz.courseName}
            </h4>
            <p className="text-xs text-muted-foreground">
              Quiz #{quiz.sessionNumber} • {formatDate(quiz.date)}
            </p>
          </div>

          <div className="block">
            <ScoreBoard
              correct={quiz.correct}
              incorrect={quiz.incorrect}
              blank={quiz.blank}
            />
          </div>

          <div
            className={cn(
              'text-xl font-black',
              quiz.successRate >= 70
                ? 'text-emerald-400'
                : quiz.successRate < 50
                  ? 'text-rose-400'
                  : 'text-primary'
            )}
          >
            %{quiz.successRate}
          </div>
        </motion.div>
      ))
    ) : (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="p-4 bg-white/5 rounded-xl mb-4">
          <ClipboardCheck className="w-6 h-6 text-muted-foreground/50" />
        </div>
        <div className="space-y-1.5 text-center">
          <h3 className="text-base font-medium text-white/80">
            Henüz Test Yok
          </h3>
          <p className="text-sm text-muted-foreground/60">
            Tamamlanan test bulunamadı.
          </p>
        </div>
      </div>
    )}
  </div>
);

export const RecentQuizzesCard = () => {
  const { loading, recentQuizzes } = useCognitiveInsights();
  const displayQuizzes = recentQuizzes.slice(0, 5);

  if (loading) {
    return (
      <GlassCard className="h-full flex flex-col p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-xl bg-surface" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 bg-surface" />
              <Skeleton className="h-3 w-48 bg-surface" />
            </div>
          </div>
        </div>
        <div className="mt-6 flex-1 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-white/3 border border-white/5"
            >
              <div className="flex-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 bg-surface" />
                  <Skeleton className="h-3 w-24 bg-surface" />
                </div>
                <Skeleton className="h-8 w-12 bg-surface" />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    );
  }

  return (
    <EfficiencyModal
      title="Quiz Geçmişi"
      trigger={
        <div className="h-full w-full cursor-pointer">
          <GlassCard className="h-full flex flex-col p-6">
            <CardHeader
              icon={ClipboardCheck}
              iconColor="text-accent"
              iconBg="bg-accent/10"
              title="Son Testler"
              subtitle="Tamamlanan son test oturumları"
              action={
                <Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />
              }
            />

            <div className="mt-6 flex-1 flex flex-col gap-3">
              {displayQuizzes.length > 0 ? (
                displayQuizzes.map((session, index) => (
                  <motion.div
                    key={session.uniqueKey}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/5 transition-all group flex-between"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-white/90 group-hover:text-primary transition-colors">
                        {session.courseName}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {formatDate(session.date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="hidden sm:block">
                        <ScoreBoard
                          correct={session.correct}
                          incorrect={session.incorrect}
                          blank={session.blank}
                        />
                      </div>

                      <div
                        className={cn(
                          'text-lg font-black min-w-12 text-right',
                          session.successRate >= 70
                            ? 'text-emerald-400'
                            : session.successRate < 50
                              ? 'text-rose-400'
                              : 'text-primary'
                        )}
                      >
                        %{session.successRate}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-10">
                  <div className="p-4 bg-white/5 rounded-xl mb-4">
                    <ClipboardCheck className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div className="space-y-1.5 text-center">
                    <h3 className="text-base font-medium text-white/80">
                      Henüz Test Yok
                    </h3>
                    <p className="text-sm text-muted-foreground/60">
                      Tamamlanan test bulunamadı.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      }
    >
      <QuizHistoryContent quizzes={recentQuizzes} />
    </EfficiencyModal>
  );
};
