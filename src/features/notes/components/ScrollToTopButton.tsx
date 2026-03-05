import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

// === BÖLÜM ADI: BİLEŞEN (COMPONENT) ===
// ===========================

/**
 * Sayfa belirli bir miktar aşağı kaydırıldığında görünen ve tıklandığında
 * sayfayı en üste yumuşak bir şekilde (smooth scroll) kaydıran yardımcı buton.
 *
 * @returns {React.ReactElement}
 */
export function ScrollToTopButton(): React.ReactElement {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  // === EFEKTLER (EFFECTS) ===

  useEffect(() => {
    const container: HTMLElement | null = document.getElementById(
      'notes-scroll-container'
    );
    if (!container) return;

    const handleScroll = (): void => {
      try {
        const scrollPercent: number =
          container.scrollTop /
          (container.scrollHeight - container.clientHeight);
        setIsVisible(scrollPercent > 0.2);
      } catch (error: unknown) {
        console.error('[ScrollToTopButton][handleScroll] Hata:', error);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // === RENDER İŞ MANTIĞI ===

  const scrollToTop = (): void => {
    try {
      document
        .getElementById('notes-scroll-container')
        ?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: unknown) {
      console.error('[ScrollToTopButton][scrollToTop] Hata:', error);
    }
  };

  // === UI RENDER ===

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-8 z-50 p-2 rounded-full bg-primary/30 text-foreground shadow-2xl hover:scale-110 active:scale-95 cursor-pointer"
      style={{
        right: '260px', // 240px (sağ aside) + 32px boşluk
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
        transition: 'all 0.5s ease',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
      aria-label="Başa dön"
      title="Başa Dön"
    >
      <ChevronUp className="size-8" />
    </button>
  );
}
