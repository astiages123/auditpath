import { useCallback, useEffect, useRef } from 'react';
import { logger } from '@/utils/logger';
import faviconIco from '@/assets/favicon.ico';

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

  const resetToDefault = useCallback(() => {
    if (faviconRef.current) {
      faviconRef.current.href = faviconIco;
    }
    // eslint-disable-next-line react-compiler/react-compiler
    document.title = 'AuditPath';
  }, []);

  const getColors = useCallback(() => {
    const style = getComputedStyle(document.documentElement);
    const destructive =
      style.getPropertyValue('--destructive') || '0.6368 0.2078 25.3313';
    const primary =
      style.getPropertyValue('--primary') || '0.8554 0.1969 158.6115';
    const muted =
      style.getPropertyValue('--muted-foreground') || '82.968% 0.00009 271.152';

    return {
      work: `oklch(${destructive})`,
      break: `oklch(${primary})`,
      paused: `oklch(${muted})`,
    };
  }, []);

  const drawFavicon = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.clearRect(0, 0, 64, 64);

    const colors = getColors();
    let strokeColor = mode === 'work' ? colors.work : colors.break;

    if (!isActive && timeLeft < totalTime) {
      strokeColor = colors.paused;
    }

    if (imageRef.current) {
      const size = 48;
      const offset = (64 - size) / 2;

      context.save();
      context.beginPath();
      context.arc(32, 32, size / 2, 0, 2 * Math.PI);
      context.clip();
      context.drawImage(imageRef.current, offset, offset, size, size);
      context.restore();
    }

    const progress = totalTime > 0 ? timeLeft / totalTime : 0;
    const radius = 28;
    const centerX = 32;
    const centerY = 32;
    const startAngle = -0.5 * Math.PI;
    const endAngle = startAngle + 2 * Math.PI * progress;

    context.strokeStyle = strokeColor;
    context.lineWidth = 4;
    context.lineCap = 'round';
    context.beginPath();
    context.arc(centerX, centerY, radius, startAngle, endAngle, false);
    context.stroke();

    if (faviconRef.current) {
      faviconRef.current.href = canvas.toDataURL('image/png');
    }
  }, [mode, isActive, timeLeft, totalTime, getColors]);

  const updateTitle = useCallback(() => {
    const isOvertime = timeLeft < 0;
    const absoluteTime = Math.abs(timeLeft);
    const minutes = Math.floor(absoluteTime / 60);
    const seconds = Math.floor(absoluteTime % 60);
    const timeSign = isOvertime ? '+' : '';
    const formattedTime = `${timeSign}${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    let prefix = '';
    if (!isActive) {
      prefix = '⏸️ ';
    }

    let statusIcon = '🔴';
    let statusText = 'Odaklanıyor...';

    if (mode === 'break') {
      statusIcon = '🟢';
      statusText = 'Mola';
    }

    document.title = `${prefix}${statusIcon}${formattedTime} ${statusText}`;
  }, [timeLeft, isActive, mode]);

  useEffect(() => {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;

    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    faviconRef.current = link;

    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      canvasRef.current = canvas;
    }

    if (!imageRef.current) {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.src = faviconIco;

      image.onload = () => {
        imageRef.current = image;
      };
      image.onerror = () => {
        logger.warn(
          'UseFaviconManager',
          'useEffect',
          'Favicon image could not be loaded, drawing only progress ring.'
        );
        imageRef.current = null;
      };
    }

    return () => {
      resetToDefault();
      faviconRef.current = null;
      canvasRef.current = null;
      imageRef.current = null;
    };
  }, [resetToDefault]);

  useEffect(() => {
    if (enabled) {
      drawFavicon();
      updateTitle();
      return;
    }

    resetToDefault();
  }, [
    timeLeft,
    totalTime,
    isActive,
    mode,
    enabled,
    drawFavicon,
    updateTitle,
    resetToDefault,
  ]);
}
