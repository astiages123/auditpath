import { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// ==========================================
// === TYPES / PROPS ===
// ==========================================

export interface StatisticsModalProps {
  title: string;
  trigger: ReactNode;
  children: ReactNode;
}

// ==========================================
// === COMPONENT ===
// ==========================================

/**
 * A reusable modal wrapper tailored for the Efficiency Dashboard charts and tables.
 */
export const StatisticsModal = ({
  title,
  trigger,
  children,
}: StatisticsModalProps) => {
  // ==========================================
  // === RENDER ===
  // ==========================================
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {title} detayları ve istatistikleri.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">{children}</div>
      </DialogContent>
    </Dialog>
  );
};
