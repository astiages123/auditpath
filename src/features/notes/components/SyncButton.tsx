import { useState } from 'react';
import { RefreshCcwDot, Loader2 } from 'lucide-react';
import { invokeNotionSync } from '../services/noteService';
import { toast } from 'sonner';
import { cn } from '@/utils/stringHelpers';
import { Button } from '@/components/ui/button';

interface SyncButtonProps {
  className?: string;
  onSyncComplete?: () => void;
  showLabel?: boolean;
}

export function SyncButton({
  className,
  onSyncComplete,
  showLabel = true,
}: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSyncing) return;

    setIsSyncing(true);
    const toastId = toast.info('Senkronize ediliyor', {
      description: 'Notlar güncelleniyor, lütfen bekleyin...',
      duration: Infinity,
      icon: <Loader2 className="size-4 text-blue-400 animate-spin" />,
    });

    try {
      const data = await invokeNotionSync();

      if (data.success && data.stats) {
        toast.dismiss(toastId);
        toast.success('Senkronizasyon Başarılı!', {
          description: `${data.stats.synced} eklendi, ${data.stats.deleted} silindi, ${data.stats.skipped} atlandı.`,
        });
        onSyncComplete?.();
      } else {
        throw new Error(
          data.error || 'Senkronizasyon sırasında bir hata oluştu.'
        );
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.';
      toast.dismiss(toastId);
      toast.error('Senkronizasyon Başarısız', {
        description: message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size={showLabel ? 'default' : 'icon'}
      onClick={handleSync}
      disabled={isSyncing}
      title={!showLabel ? 'Notları Senkronize Et' : undefined}
      className={cn(
        'transition-all font-medium',
        showLabel
          ? 'w-full justify-start gap-3 h-auto rounded-xl'
          : 'rounded-full h-10 w-10 hover:bg-transparent hover:scale-110',
        isSyncing && 'opacity-70',
        className
      )}
    >
      {isSyncing ? (
        <Loader2 className="size-9 animate-spin text-primary shrink-0" />
      ) : (
        <RefreshCcwDot className="size-5 text-emerald-300 shrink-0" />
      )}
      {showLabel && <span>Not Senkronizasyonu</span>}
    </Button>
  );
}
