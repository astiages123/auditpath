import {
  CircleCheckIcon,
  InfoIcon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      duration={2000}
      icons={{
        success: (
          <div className="flex size-8 items-center justify-center shrink-0 rounded-full bg-primary/10 ring-1 ring-primary/40 shadow-[0_0_15px_oklch(0.6_0.2_150/0.3)]">
            <CircleCheckIcon className="size-4 text-primary" />
          </div>
        ),
        info: (
          <div className="flex size-8 items-center justify-center shrink-0 rounded-full bg-chart-1/10 ring-1 ring-chart-1/40 shadow-[0_0_15px_oklch(0.5_0.2_250/0.3)]">
            <InfoIcon className="size-4 text-chart-1" />
          </div>
        ),
        warning: (
          <div className="flex size-8 items-center justify-center shrink-0 rounded-full bg-accent/10 ring-1 ring-accent/40 shadow-[0_0_15px_oklch(0.7_0.2_80/0.3)]">
            <TriangleAlertIcon className="size-4 text-accent" />
          </div>
        ),
        error: (
          <div className="flex size-8 items-center justify-center shrink-0 rounded-full bg-destructive/10 ring-1 ring-destructive/40 shadow-[0_0_15px_oklch(0.5_0.2_25/0.3)]">
            <OctagonXIcon className="size-4 text-destructive" />
          </div>
        ),
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'group !flex w-full min-w-[340px] max-w-[420px] items-center gap-4 overflow-hidden rounded-2xl border border-white/10 p-4 text-sm backdrop-blur-3xl transition-all duration-300',
          content:
            'flex flex-col gap-0.5 flex-1 !static !translate-x-0 !translate-y-0',
          icon: 'shrink-0 !relative !inset-auto !translate-x-0 !translate-y-0',
          title:
            'font-bold text-[15px] leading-tight text-white [.sonner-toast[data-type=success]_&]:before:content-["Başarılı:_"] [.sonner-toast[data-type=error]_&]:before:content-["Hata:_"] [.sonner-toast[data-type=warning]_&]:before:content-["Uyarı:_"] [.sonner-toast[data-type=info]_&]:before:content-["Bilgi:_"]',
          description:
            'text-white/50 line-clamp-2 leading-relaxed text-[13px] font-medium',
          success:
            'bg-[oklch(0.12_0.02_160)]/95 border-primary/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_oklch(0.6_0.2_150/0.12)]',
          error:
            'bg-[oklch(0.12_0.04_27)]/95 border-destructive/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_oklch(0.5_0.2_25/0.12)]',
          warning:
            'bg-[oklch(0.12_0.04_79)]/95 border-accent/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_oklch(0.7_0.2_80/0.12)]',
          info: 'bg-[oklch(0.12_0.02_260)]/95 border-chart-1/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_oklch(0.5_0.2_250/0.12)]',
          actionButton:
            'bg-primary text-primary-foreground font-medium rounded-lg px-3 py-1.5 transition-colors hover:bg-primary/90',
          cancelButton:
            'bg-muted text-muted-foreground font-medium rounded-lg px-3 py-1.5 transition-colors hover:bg-muted/80',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
