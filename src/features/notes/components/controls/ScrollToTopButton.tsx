import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

/**
 * Sayfa belirli bir miktar aşağı kaydırıldığında görünen ve tıklandığında
 * sayfayı en üste yumuşak bir şekilde (smooth scroll) kaydıran yardımcı buton.
 *
 * @returns {React.ReactElement}
 */
export function ScrollToTopButton(): React.ReactElement {
  const [isVisible, setIsVisible] = useState<boolean>(false);

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
      } catch {
        // Scroll yüzdesi hesaplanamazsa görünürlük bir sonraki event'te tekrar değerlendirilecektir.
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = (): void => {
    try {
      document
        .getElementById('notes-scroll-container')
        ?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // Yumuşak kaydırma desteklenmeyen ortamlarda sessizce devam edilir.
    }
  };

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
