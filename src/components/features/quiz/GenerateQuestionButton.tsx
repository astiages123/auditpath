import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2, Sparkles, Box, ScrollText } from 'lucide-react';
import { generateQuizQuestionBatch, getChunkQuotaStatus, type QuotaStatus } from '@/lib/ai/quiz-api';
import { toast } from 'sonner';

interface GenerateQuestionButtonProps {
  chunkId: string;
}

export function GenerateQuestionButton({ chunkId }: GenerateQuestionButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<QuotaStatus | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>('');

  // Load status when modal opens
  const refreshStatus = React.useCallback(async () => {
    try {
      const newStatus = await getChunkQuotaStatus(chunkId);
      setStatus(newStatus);
    } catch (e) {
      console.error(e);
      toast.error("Kota bilgisi alınamadı.");
    }
  }, [chunkId]);

  React.useEffect(() => {
    if (open) {
      setInitializing(true);
      refreshStatus().finally(() => setInitializing(false));
    }
  }, [open, refreshStatus]);

  const handleGenerate = async () => {
    if (!status) return;

    setLoading(true);
    let currentUsed = status.used;
    const targetTotal = status.quota.total;
    let errorOccurred = false;
    const BATCH_SIZE = 4;

    try {
      while (currentUsed < targetTotal) {
        const remaining = targetTotal - currentUsed;
        // Show range in progress message
        const rangeText = `${currentUsed + 1}-${Math.min(currentUsed + BATCH_SIZE, targetTotal)}`;
        setProgressMessage(`Soru üretiliyor... (${rangeText}/${targetTotal})`);
        
        // Use batch generation (Always 4)
        const { success, results } = await generateQuizQuestionBatch(chunkId);
        
        if (success) {
          const successCount = results.filter(r => r.success).length;
          currentUsed += successCount;
          
          // Update status locally for UI feedback
          setStatus(prev => prev ? { ...prev, used: currentUsed, isFull: currentUsed >= targetTotal } : null);
          
          // If we requested N but got 0 successes (should be caught by success check, but double check)
          if (successCount === 0) {
             const firstError = results.find(r => !r.success)?.error;
             toast.error(firstError || "Soru üretilemedi, işlem durduruldu.");
             errorOccurred = true;
             break;
          }
        } else {
          // All failed
          const firstError = results[0]?.error;
          toast.error(firstError || "Toplu üretim hatası, işlem durduruldu.");
          errorOccurred = true;
          break; 
        }
      }

      if (!errorOccurred) {
        toast.success("Tüm sorular başarıyla üretildi!");
      }
    } catch (err) {
      toast.error("Beklenmeyen bir hata oluştu.");
      console.error(err);
    } finally {
      setLoading(false);
      setProgressMessage('');
      refreshStatus(); // Final sync
    }
  };

  const percentage = status ? Math.min(100, (status.used / status.quota.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 text-xs border-dashed border-zinc-700 hover:border-zinc-500"
        >
          <Sparkles className="w-3 h-3 text-yellow-500" />
          Soru Üret
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Akıllı Soru Üretici
          </DialogTitle>
          <DialogDescription>
            Bu bölüm için analiz edilen kavramlara göre sırayla soru üretilir.
          </DialogDescription>
        </DialogHeader>

        {initializing ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : status ? (
          <div className="py-4 space-y-6">
            <div className="space-y-4">
               <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Box className="w-4 h-4 text-blue-500" />
                    <span>Soru Kotası</span>
                  </div>
                  <span className="font-bold">
                    {status.used} / {status.quota.total}
                  </span>
                </div>
                
                <Progress value={percentage} className="h-2" indicatorClassName="bg-blue-600" />
                
                {loading && (
                  <p className="text-xs text-center text-muted-foreground animate-pulse">
                    {progressMessage}
                  </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2">
               <div className="rounded-md bg-muted/50 p-3 text-xs flex flex-col items-center justify-center gap-1">
                  <ScrollText className="w-4 h-4 text-muted-foreground mb-1" />
                  <span className="text-muted-foreground">Kelime</span>
                  <span className="font-mono text-foreground text-lg">{status.wordCount}</span>
               </div>
               <div className="rounded-md bg-muted/50 p-3 text-xs flex flex-col items-center justify-center gap-1">
                  <Sparkles className="w-4 h-4 text-muted-foreground mb-1" />
                  <span className="text-muted-foreground">Kavram</span>
                  <span className="font-mono text-foreground text-lg">{status.conceptCount}</span>
               </div>
            </div>
            
             <div className="rounded-md bg-yellow-500/10 p-3 text-xs text-yellow-600 border border-yellow-500/20">
               <p className="font-semibold mb-1">Nasıl Çalışır?</p>
               <ul className="list-disc list-inside space-y-1 opacity-90">
                 <li>Önce içerik haritası çıkarılır.</li>
                 <li>Her kavram için sırasıyla Tanım, İlişki ve Sonuç odaklı sorular üretilir.</li>
                 <li>Üretim sırasında pencereyi kapatmayın.</li>
               </ul>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Kota bilgisi alınamadı.
          </div>
        )}

        <DialogFooter>
          <Button 
            onClick={handleGenerate} 
            disabled={loading || initializing || status?.isFull}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Üretiliyor...
              </>
            ) : status?.isFull ? (
              'Kota Doldu'
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Soru Üret
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
