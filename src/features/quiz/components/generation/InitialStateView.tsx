import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Sparkles } from 'lucide-react';

interface InitialStateViewProps {
  onGenerate: () => void;
}

export function InitialStateView({ onGenerate }: InitialStateViewProps) {
  return (
    // items-center ve text-center ekleyerek tam ortaladık
    <div className="flex-1 flex flex-col items-center justify-center w-full min-h-full">
      <div className="w-full max-w-md space-y-6 flex flex-col items-center text-center">
        <div className="w-full p-8 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-4">
          {/* mx-auto ikonun merkezde kalmasını sağlar */}
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <div className="space-y-2">
            <h4 className="text-xl font-bold text-amber-600 tracking-tight">
              Bu Konuyu Henüz Keşfetmedik
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bu bölümdeki kavramları ve zorluk seviyesini senin için henüz
              analiz etmedim. Hemen başlayıp senin için en uygun antrenmanı
              hazırlayabilirim.
            </p>
          </div>
        </div>

        <Button
          size="lg"
          className="w-full h-14 text-lg font-bold gap-2 shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]"
          onClick={onGenerate}
        >
          <Sparkles className="w-5 h-5" />
          Analiz Et ve Soruları Hazırla
        </Button>
      </div>
    </div>
  );
}
