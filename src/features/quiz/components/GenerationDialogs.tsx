import { FC } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface GenerationLoadingDialogProps {
  open: boolean;
  status: string;
  currentStep: number;
  logs: string[];
}

export const GenerationLoadingDialog: FC<GenerationLoadingDialogProps> = ({
  open,
  status,
  currentStep,
  logs,
}) => {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px] border-white/10 bg-[#0A0A0B]/95 backdrop-blur-2xl">
        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
              <Sparkles className="h-7 w-7 text-primary animate-pulse" />
            </div>
            <h3 className="text-xl font-semibold text-white">
              {status === 'generating' ? 'Sorular Üretiliyor' : 'Kaydediliyor'}
            </h3>
            <p className="text-sm text-zinc-400">
              Yapay zeka içeriğinizi analiz ediyor ve kaliteli sorular
              hazırlıyor.
            </p>
          </div>

          <div className="space-y-4">
            <Progress value={(currentStep / 3) * 100} className="h-2" />
            <div className="flex justify-between text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              <span>Analiz</span>
              <span>Üretim</span>
              <span>Kayıt</span>
            </div>
          </div>

          <div className="bg-black/40 rounded-xl border border-white/5 p-4 h-[180px] overflow-y-auto font-mono text-[12px] leading-relaxed">
            {logs.map((log, i) => (
              <div
                key={`log-${i}`}
                className="flex gap-3 mb-1.5 animate-in fade-in slide-in-from-left-2 duration-300"
              >
                <span className="text-primary/50 shrink-0 select-none">
                  {'>'}
                </span>
                <span className="text-zinc-300">{log}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface GenerationSuccessDialogProps {
  open: boolean;
  onClose: () => void;
  savedCount: number;
}

export const GenerationSuccessDialog: FC<GenerationSuccessDialogProps> = ({
  open,
  onClose,
  savedCount,
}) => {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[400px] border-white/10 bg-[#0A0A0B]/95 backdrop-blur-2xl">
        <div className="flex flex-col items-center text-center space-y-4 py-6">
          <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-white">
              Başarıyla Tamamlandı!
            </h3>
            <p className="text-sm text-zinc-400">
              {savedCount} adet yeni soru kütüphanene eklendi.
            </p>
          </div>
          <Button
            className="w-full bg-white text-black hover:bg-zinc-200"
            onClick={onClose}
          >
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
