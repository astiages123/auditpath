import React from 'react';
import { Brain, Loader2 } from 'lucide-react';
import { GenerationLog } from '@/features/quiz/core/factory';

interface SmartExamViewProps {
  isGeneratingExam: boolean;
  examProgress: { current: number; total: number };
  examLogs: GenerationLog[];
  onStartSmartExam: () => void;
}

export function SmartExamView({
  isGeneratingExam,
  examProgress,
  examLogs,
  onStartSmartExam,
}: SmartExamViewProps) {
  return (
    // h-full kaldırıldı, min-h-0 ve overflow-y-auto eklendi. Padding biraz daraltıldı (p-6).
    <div className="flex flex-col items-center justify-center min-h-0 w-full max-w-2xl mx-auto space-y-8 p-6 overflow-y-auto">
      {!isGeneratingExam ? (
        <>
          {/* İkon alanı: shrink-0 ekleyerek daralmasını önledik */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            <div className="w-24 h-24 bg-zinc-900 border border-white/10 rounded-3xl flex items-center justify-center relative shadow-2xl">
              <Brain className="w-12 h-12 text-primary" />
            </div>
          </div>

          <div className="space-y-4 text-center">
            <h2 className="text-3xl font-black text-white tracking-tight leading-tight">
              Zeki Deneme Sınavı
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
              SAK algoritması ile o anki ilerlemene ve dersin sınav önemine göre
              sana özel bir deneme hazırlayalım.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full shrink-0">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
              <div className="text-[10px] font-bold text-primary uppercase tracking-widest">
                Yapay Zeka
              </div>
              <div className="text-sm font-semibold text-white">
                Terzi Dikimi
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
              <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                Algoritma
              </div>
              <div className="text-sm font-semibold text-white">SAK Odaklı</div>
            </div>
          </div>

          <button
            onClick={onStartSmartExam}
            className="w-full py-5 bg-primary text-primary-foreground rounded-2xl font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 shrink-0"
          >
            <Brain className="w-6 h-6" />
            Karma Deneme Çöz
          </button>

          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium shrink-0">
            DENEME SINAVI AKIŞI • 20 SORULUK SETLER
          </p>
        </>
      ) : (
        <div className="w-full space-y-8 animate-in fade-in zoom-in-95 duration-500">
          {/* Yükleme içeriği aynı kalabilir ancak flex-col-reverse olan log viewer'a h-48 yerine max-h-48 verelim */}
          <div className="flex flex-col items-center text-center space-y-4 shrink-0">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white bg-zinc-900 rounded-full w-8 h-8 flex items-center justify-center border border-white/10">
                  {Math.round(
                    (examProgress.current / (examProgress.total || 1)) * 100
                  )}
                  %
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">
                Soru Havuzu Güncelleniyor
              </h3>
              <p className="text-sm text-muted-foreground">
                Hazır soruların arasından sana özel bir deneme seçiliyor...
              </p>
            </div>
          </div>

          <div className="w-full h-48 bg-black/60 rounded-2xl border border-white/10 p-4 font-mono text-[10px] overflow-y-auto flex flex-col-reverse shadow-inner">
            {/* Loglar aynı */}
            {examLogs.map((log) => (
              <div
                key={log.id}
                className="flex gap-3 mb-1.5 opacity-80 border-b border-white/5 pb-1 text-left shrink-0"
              >
                <span className="text-zinc-600">
                  [{log.timestamp.toLocaleTimeString([], { hour12: false })}]
                </span>
                <span className="text-primary truncate">[{log.step}]</span>
                <span className="text-zinc-300 truncate">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
