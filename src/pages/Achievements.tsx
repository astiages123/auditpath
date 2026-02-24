import { useEffect } from 'react';
import { AchievementsRoom } from '@/features/achievements/components/AchievementsRoom';
import { PageHeader } from '@/shared/components/PageHeader';

export default function AchievementsPage() {
  useEffect(() => {
    document.title = 'Başarılar | AuditPath';
    // Meta description update (optional, but keep it consistent with what was there)
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Kadim mühürleri topla, efsane ol. Müfettişlik yolculuğundaki başarımlarını takip et.'
      );
    }
  }, []);

  return (
    <div className="bg-background text-foreground pb-20">
      <PageHeader
        title="Başarılar"
        subtitle="Elde ettiğin mühürler ve uzmanlık seviyelerin."
      />
      <AchievementsRoom />
    </div>
  );
}
