import { useEffect } from 'react';
import { NotesPage } from '@/features/notes';

export default function NotesRoute() {
  useEffect(() => {
    document.title = 'Ders Notları | AuditPath';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Dersleriniz için detaylı çalışma notları ve konu özetleri.'
      );
    }
  }, []);

  return <NotesPage />;
}
