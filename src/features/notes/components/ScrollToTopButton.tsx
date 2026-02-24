import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = document.getElementById('notes-scroll-container');
    if (!container) return;

    const handleScroll = () => {
      const scrollPercent =
        container.scrollTop / (container.scrollHeight - container.clientHeight);
      setIsVisible(scrollPercent > 0.2);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    document
      .getElementById('notes-scroll-container')
      ?.scrollTo({ top: 0, behavior: 'smooth' });
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
    >
      <ChevronUp className="size-8" />
    </button>
  );
}
