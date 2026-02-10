import { useEffect, useRef } from 'react';

/**
 * useFaviconManager
 *
 * Dinamik favicon ve sayfa başlığı yönetimi sağlayan hook.
 * - Favicon üzerine ilerleme halkası çizer.
 * - Sayfa başlığını zamanlayıcı durumuna göre günceller.
 *
 * @param timeLeft - Saniye cinsinden kalan süre
 * @param totalTime - Saniye cinsinden toplam süre (ilerleme halkası için)
 * @param isActive - Zamanlayıcının çalışıp çalışmadığı
 * @param mode - 'work' (odak) veya 'break' (mola) veya 'pause'
 * @param enabled - Favicon yöneticisinin etkin olup olmadığı
 */
export function useFaviconManager(
  timeLeft: number,
  totalTime: number,
  isActive: boolean,
  mode: 'work' | 'break',
  enabled: boolean = true
) {
  const faviconRef = useRef<HTMLLinkElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Başlangıçta favicon elementini ve canvas'ı hazırla
  useEffect(() => {
    // Mevcut favicon elementini bul
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;

    // Eğer yoksa oluştur
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    faviconRef.current = link;

    // Canvas oluştur (bellekte)
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      canvasRef.current = canvas;
    }

    // Ana logoyu yükle
    if (!imageRef.current) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = '/favicon.ico'; // Varsayılan ikon

      // Eğer .ico yüklenemezse veya SVG varsa, alternatif yollar denenebilir.
      // Şimdilik varsayılan path üzerinden gidiyoruz.
      img.onload = () => {
        imageRef.current = img;
      };
      img.onerror = () => {
        // Logo yüklenemezse null bırak, sadece halkayı çizeriz
        console.warn(
          'Favicon image could not be loaded, drawing only progress ring.'
        );
        imageRef.current = null;
      };
    }

    // Cleanup: Bileşen unmount olduğunda veya enabled false olduğunda favicon'u eski haline getir
    return () => {
      resetToDefault();
    };
  }, []);

  // Zaman ve durum değiştikçe güncelle
  useEffect(() => {
    if (enabled) {
      drawFavicon();
      updateTitle();
    } else {
      resetToDefault();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, totalTime, isActive, mode, enabled]);

  const resetToDefault = () => {
    if (faviconRef.current) {
      faviconRef.current.href = '/favicon.ico';
    }
    document.title = 'AuditPath';
  };

  const getColors = () => {
    // CSS değişkenlerinden renkleri almayı dene
    // Ancak hook içinde DOM erişimi senkron olmayabilir veya hesaplama maliyetli olabilir.
    // Güvenli fallback değerler kullanacağız.

    const style = getComputedStyle(document.documentElement);

    // Tailwind/CSS variable okuma denemesi
    // Bu değerler index.css'den alınmıştır
    const destructive =
      style.getPropertyValue('--destructive') || '0.6368 0.2078 25.3313'; // Kırmızımsı
    const primary =
      style.getPropertyValue('--primary') || '0.8554 0.1969 158.6115'; // Yeşilimsi
    const muted =
      style.getPropertyValue('--muted-foreground') || '82.968% 0.00009 271.152'; // Gri

    // OKLCH değerlerini CSS color string'e çevir
    // Not: Canvas API oklch'yi modern tarayıcılarda destekler.

    return {
      work: `oklch(${destructive})`,
      break: `oklch(${primary})`,
      paused: `oklch(${muted})`,
    };
  };

  const drawFavicon = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Temizle
    ctx.clearRect(0, 0, 64, 64);

    // Renkleri al
    const colors = getColors();
    let strokeColor = mode === 'work' ? colors.work : colors.break;

    if (!isActive && timeLeft < totalTime) {
      strokeColor = colors.paused;
    }

    // 1. Logoyu Çiz (Merkeze)
    if (imageRef.current) {
      try {
        // %75-%80 boyutunda (yaklaşık 48-50px)
        const size = 48;
        const offset = (64 - size) / 2;

        ctx.save();
        // Yuvarlak kırpma
        ctx.beginPath();
        ctx.arc(32, 32, size / 2, 0, 2 * Math.PI);
        ctx.clip();

        ctx.drawImage(imageRef.current, offset, offset, size, size);
        ctx.restore();
      } catch (e) {
        // CORS hatası vb. durumunda yut
        console.debug('Favicon draw error:', e);
      }
    }

    // 2. İlerleme Halkası
    const progress = totalTime > 0 ? timeLeft / totalTime : 0;
    const radius = 28; // Dış çember
    const centerX = 32;
    const centerY = 32;
    const startAngle = -0.5 * Math.PI; // -90 derece (Saat 12 yönü)
    const endAngle = startAngle + 2 * Math.PI * progress;

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, false); // Saat yönü
    ctx.stroke();

    // 3. Favicon'u Güncelle
    if (faviconRef.current) {
      faviconRef.current.href = canvas.toDataURL('image/png');
    }
  };

  const updateTitle = () => {
    const isOvertime = timeLeft < 0;
    const absTime = Math.abs(timeLeft);
    const minutes = Math.floor(absTime / 60);
    const seconds = Math.floor(absTime % 60);

    const timeSign = isOvertime ? '+' : '';
    const formattedTime = `${timeSign}${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    let prefix = '';
    if (!isActive) {
      prefix = '⏸️ ';
    }

    let statusIcon = '🔴'; // Varsayılan Odak
    let statusText = 'Odaklanıyor...';

    if (mode === 'break') {
      statusIcon = '🟢';
      statusText = 'Mola';
    }

    document.title = `${prefix}${statusIcon}${formattedTime} ${statusText}`;
  };
}
