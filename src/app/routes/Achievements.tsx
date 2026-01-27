
import React, { useEffect } from 'react';
import { AchievementsRoom } from '@/features/achievements';
// import { Metadata } from 'next'; // Vite uses index.html or Helmet for metadata

export default function AchievementsPage() {
    useEffect(() => {
        document.title = "Başarım Odası | AuditPath";
        // Meta description update (optional, but keep it consistent with what was there)
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute("content", "Kadim mühürleri topla, efsane ol. Müfettişlik yolculuğundaki başarımlarını takip et.");
        }
    }, []);

    return (
        <div className="container mx-auto px-4 py-8">
            <AchievementsRoom />
        </div>
    );
}
