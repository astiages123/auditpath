import { ClipboardCheck, Maximize2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { StatisticsCard } from '@/features/statistics/components/cards/StatisticsCard';
import { CommonEmptyState } from '@/features/statistics/components/shared/CardElements';
import { StatisticsModal } from '@/features/statistics/components/modals/StatisticsModal';
import { cn } from '@/utils/stringHelpers';
import { formatDisplayDate } from '@/utils/dateUtils';

import type { RecentQuizSession } from '@/features/quiz/types';

// ==========================================
// === HELPERS ===
// ==========================================

const formatDate = (dateStr: string) => {
  return formatDisplayDate(dateStr, {
    day: 'numeric',
    month: 'long',
  });
};

// ==========================================
// === INTERNAL COMPONENTS ===
// ==========================================

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
  <div className="mt-4 p-4 border border-border/50 rounded-xl bg-white/5 space-y-2 md:space-y-3">
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
      <CommonEmptyState
        message="Tamamlanan test bulunamadı."
        className="border border-dashed border-white/5 bg-white/2 rounded-2xl py-20"
      />
    )}
  </div>
);

// ==========================================
// === PROPS ===
// ==========================================

export interface RecentQuizzesCardProps {
  recentQuizzes: RecentQuizSession[];
}

// ==========================================
// === COMPONENT ===
// ==========================================

export const RecentQuizzesCard = ({
  recentQuizzes,
}: RecentQuizzesCardProps) => {
  // ==========================================
  // === DERIVED STATE ===
  // ==========================================
  const displayQuizzes = recentQuizzes.slice(0, 5);

  // ==========================================
  // === RENDER ===
  // ==========================================
  return (
    <StatisticsModal
      title="Quiz Geçmişi"
      trigger={
        <StatisticsCard
          title="Son Testler"
          subtitle="Tamamlanan son test oturumları"
          tooltip="Girdiğin son quizlerin sonuçlarını burada görebilirsin. Başarı oranına göre renkler değişir: Yeşil (%70+), Sarı (%50-70), Kırmızı (%50altı)."
          icon={ClipboardCheck}
          isEmpty={displayQuizzes.length === 0}
          emptyMessage="Tamamlanan test bulunamadı."
          action={
            <Maximize2 className="w-5 h-5 text-muted-foreground/30 group-hover:text-white transition-colors" />
          }
        >
          <div className="mt-6 flex-1 flex flex-col gap-3">
            {displayQuizzes.map((session, index) => (
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
            ))}
          </div>
        </StatisticsCard>
      }
    >
      <QuizHistoryContent quizzes={recentQuizzes} />
    </StatisticsModal>
  );
};
