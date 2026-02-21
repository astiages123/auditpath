import { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ModalProps {
  title: string;
  trigger: ReactNode;
  children: ReactNode;
}

export const EfficiencyModal = ({ title, trigger, children }: ModalProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-linear-to-br from-zinc-900/80 via-zinc-900/95 to-zinc-950 border-border scrollbar-hide">
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
