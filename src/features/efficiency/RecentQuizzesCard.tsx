import { ClipboardCheck, Maximize2 } from "lucide-react";
import { motion } from "framer-motion";
import { GlassCard } from "@/shared/components/GlassCard";
import { CardHeader } from "./EfficiencyCards";
import { useEfficiencyData } from "./useEfficiencyData";
import { EfficiencyModal } from "./EfficiencyModals";
import { cn } from "@/shared/lib/core/utils";
import { RecentQuizSession } from "@/shared/lib/core/client-db";

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('tr-TR', { 
    day: 'numeric', 
    month: 'long' 
  });
};

const ScoreBoard = ({ correct, incorrect, blank }: { correct: number, incorrect: number, blank: number }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center justify-center size-15 rounded-xl bg-emerald-900/50">
        <span className="text-sm font-black text-white leading-none">{correct}</span>
        <span className="text-[12px] font-black text-white uppercase tracking-tighter mt-1">Doğru</span>
      </div>
      <div className="flex flex-col items-center justify-center size-15 rounded-xl bg-rose-900/50">
        <span className="text-sm font-black text-white leading-none">{incorrect}</span>
        <span className="text-[12px] font-black text-white uppercase tracking-tighter mt-1">Yanlış</span>
      </div>
      <div className="flex flex-col items-center justify-center size-15 rounded-xl bg-amber-900/50">
        <span className="text-sm font-black text-white leading-none">{blank}</span>
        <span className="text-[12px] font-black text-white uppercase tracking-tighter mt-1">Boş</span>
      </div>
    </div>
  );
};

const QuizHistoryContent = ({ quizzes }: { quizzes: RecentQuizSession[] }) => (
  <div className="space-y-3 p-2">
    {quizzes.length > 0 ? (
      quizzes.map((quiz, index) => (
        <motion.div
          key={quiz.uniqueKey}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="p-4 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/6 transition-all group flex items-center justify-between"
        >
          <div className="flex flex-col gap-1">
            <h4 className="font-semibold text-white/90 group-hover:text-emerald-400 transition-colors">
              {quiz.courseName}
            </h4>
            <p className="text-xs text-muted-foreground">
              Quiz #{quiz.sessionNumber} • {formatDate(quiz.date)}
            </p>
          </div>

          <div className="hidden md:block">
            <ScoreBoard 
              correct={quiz.correct} 
              incorrect={quiz.incorrect} 
              blank={quiz.blank} 
            />
          </div>

          <div className={cn(
            "text-xl font-black",
            quiz.successRate >= 70 ? "text-emerald-400" : 
            quiz.successRate < 50 ? "text-rose-400" : "text-amber-400"
          )}>
            %{quiz.successRate}
          </div>
        </motion.div>
      ))
    ) : (
      <div className="text-center py-12 text-muted-foreground/50 italic">
        Henüz test verisi yok
      </div>
    )}
  </div>
);

export const RecentQuizzesCard = () => {
  const { recentQuizzes } = useEfficiencyData();
  const displayQuizzes = recentQuizzes.slice(0, 5);

  return (
    <EfficiencyModal
      title="Quiz Geçmişi"
      trigger={
        <div className="h-full w-full cursor-pointer">
          <GlassCard className="h-full flex flex-col p-6">
            <CardHeader
              icon={ClipboardCheck}
              iconColor="text-emerald-400"
              iconBg="bg-emerald-500/10"
              title="Son Testler"
              subtitle="Tamamlanan son test oturumları"
              action={<Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />}
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
                    className="p-4 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/6 transition-all group flex items-center justify-between"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-white/90 group-hover:text-emerald-400 transition-colors">
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

                      <div className={cn(
                        "text-lg font-black min-w-12 text-right",
                        session.successRate >= 70 ? "text-emerald-400" : 
                        session.successRate < 50 ? "text-rose-400" : "text-amber-400"
                      )}>
                        %{session.successRate}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-10 text-muted-foreground/30">
                  <ClipboardCheck className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">Henüz test verisi yok</p>
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
