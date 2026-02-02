import { Brain, CheckCircle2, XCircle, MinusCircle, Clock, Maximize2, ArrowRight } from "lucide-react";
import { GlassCard } from "@/shared/components/GlassCard";
import { CardHeader } from "./EfficiencyCards";
import { useEfficiencyData } from "./useEfficiencyData";
import { EfficiencyModal } from "./EfficiencyModals";
import { cn } from "@/shared/lib/core/utils";
import { RecentQuizSession } from "@/shared/lib/core/client-db";
import { Button } from "@/shared/components/ui/button";

function getRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Şimdi";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}dk önce`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}s önce`;
  return `${Math.floor(diffInSeconds / 86400)}g önce`;
}

function SuccessBadge({ rate }: { rate: number }) {
  let colorClass = "text-slate-400 bg-slate-400/10 border-slate-400/20";
  if (rate >= 80) colorClass = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  else if (rate >= 60) colorClass = "text-amber-500 bg-amber-500/10 border-amber-500/20";
  else if (rate >= 40) colorClass = "text-orange-500 bg-orange-500/10 border-orange-500/20";
  else colorClass = "text-red-500 bg-red-500/10 border-red-500/20";

  return (
    <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", colorClass)}>
      %{rate} Başarı
    </div>
  );
}

const QuizListItem = ({ session }: { session: RecentQuizSession }) => (
  <div className="group flex items-center justify-between p-3.5 rounded-lg hover:bg-white/3 transition-colors border border-transparent hover:border-white/5">
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-base font-medium text-white/90 group-hover:text-emerald-400 transition-colors">
          {session.courseName}
        </span>
        <span className="text-xs text-muted-foreground bg-white/5 px-2 rounded">
          Quiz #{session.sessionNumber}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground/70">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{getRelativeTime(session.date)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-500/80">
            <CheckCircle2 className="w-4 h-4" /> {session.correct}
          </span>
          <span className="flex items-center gap-1 text-red-500/80">
            <XCircle className="w-4 h-4" /> {session.incorrect}
          </span>
          <span className="flex items-center gap-1 text-slate-500/80">
            <MinusCircle className="w-4 h-4" /> {session.blank}
          </span>
        </div>
      </div>
    </div>
    
    <div className="flex items-center gap-3">
       <SuccessBadge rate={session.successRate} />
       <ArrowRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-emerald-500/50 transition-colors" />
    </div>
  </div>
);

const QuizHistoryContent = ({ quizzes }: { quizzes: RecentQuizSession[] }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
       {quizzes.map((quiz) => (
         <div key={quiz.uniqueKey} className="bg-black/20 p-5 rounded-xl border border-white/5 flex flex-col gap-3">
            <div className="flex justify-between items-start">
               <div>
                  <h4 className="font-semibold text-lg text-white">{quiz.courseName}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">Quiz #{quiz.sessionNumber} • {new Date(quiz.date).toLocaleString('tr-TR')}</p>
               </div>
               <SuccessBadge rate={quiz.successRate} />
            </div>
            
            <div className="grid grid-cols-3 gap-3 mt-2">
               <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-emerald-500">{quiz.correct}</div>
                  <div className="text-xs text-muted-foreground uppercase">Doğru</div>
               </div>
               <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-red-500">{quiz.incorrect}</div>
                  <div className="text-xs text-muted-foreground uppercase">Yanlış</div>
               </div>
               <div className="bg-slate-500/5 border border-slate-500/10 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-slate-500">{quiz.blank}</div>
                  <div className="text-xs text-muted-foreground uppercase">Boş</div>
               </div>
            </div>
         </div>
       ))}
    </div>
    {quizzes.length === 0 && (
      <div className="text-center py-12 text-muted-foreground">
        Henüz quiz aktivitesi bulunmuyor.
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
        <GlassCard className="h-full flex flex-col relative p-6">
           <CardHeader
             icon={Brain}
             iconColor="text-violet-500"
             iconBg="bg-violet-500/10"
             title="Son Quizler"
             subtitle="Kronolojik son 5 quiz aktivitesi"
             action={<Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />}
           />
           
           <div className="mt-5 flex-1 flex flex-col gap-2 min-h-[220px]">
             {displayQuizzes.length > 0 ? (
               displayQuizzes.map((session) => (
                 <QuizListItem key={session.uniqueKey} session={session} />
               ))
             ) : (
               <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground/50 italic">
                 Henüz quiz tamamlanmadı
               </div>
             )}
           </div>


        </GlassCard>
      }
    >
      <div className="p-2">
        <QuizHistoryContent quizzes={recentQuizzes} />
      </div>
    </EfficiencyModal>
  );
};
