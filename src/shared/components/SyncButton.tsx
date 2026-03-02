import { useState } from 'react';
import { CloudSync, Loader2 } from 'lucide-react';
import { invokeNotionSync } from '@/features/notes/services/noteService';
import { useCategories } from '@/features/courses/hooks/useCategories';
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
  iconClassName,
}: SyncButtonProps & { iconClassName?: string }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const { data: categories = [] } = useCategories();

  const handleSync = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSyncing || categories.length === 0) return;

    setIsSyncing(true);
    const toastId = toast.info('Senkronizasyon Başlatıldı', {
      description: 'Notion notları kontrol ediliyor...',
      duration: Infinity,
      icon: <Loader2 className="size-4 text-blue-400 animate-spin" />,
    });

    try {
      // 1. Notion Sync
      const notionData = await invokeNotionSync();

      if (!notionData.success) {
        throw new Error(notionData.error || 'Senkronizasyon başarısız.');
      }

      if (notionData.success && notionData.stats) {
        toast.dismiss(toastId);

        const { synced, errors } = notionData.stats;

        if (synced === 0 && errors === 0) {
          toast.success('Her Şey Güncel', {
            description:
              "Notion'da yeni veya değiştirilmiş bir not bulunamadı.",
            duration: 4000,
          });
        } else {
          const description =
            errors > 0
              ? `${synced} not güncellendi, ${errors} hata oluştu. Logları kontrol edin.`
              : `${synced} not güncellendi.`;

          toast.success('Senkronizasyon Tamamlandı', {
            description,
            duration: 5000,
          });
        }

        onSyncComplete?.();
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
        <Loader2
          className={cn(
            'size-9 animate-spin shrink-0',
            iconClassName || 'text-primary'
          )}
        />
      ) : (
        <CloudSync
          className={cn('size-5 shrink-0', iconClassName || 'text-primary')}
        />
      )}
      {showLabel && <span>Not Senkronizasyonu</span>}
    </Button>
  );
}
