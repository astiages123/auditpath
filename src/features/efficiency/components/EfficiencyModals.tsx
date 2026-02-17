import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ReactNode } from 'react';

// Extracted Content Components
import { FocusStreamHub } from './modals/content/FocusStreamHub';
import { LearningLoadAnalysis } from './modals/content/LearningLoadAnalysis';
import { PracticePerformanceRadar } from './modals/content/PracticePerformanceRadar';
import { MasteryProgressNavigator } from './modals/content/MasteryProgressNavigator';

// Types

interface ModalProps {
  title: string;
  trigger: ReactNode;
  children: ReactNode;
}

export const EfficiencyModal = ({ title, trigger, children }: ModalProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border scrollbar-hide">
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

// Re-exporting for convenience with consistent naming
export {
  FocusStreamHub as FocusHubContent,
  LearningLoadAnalysis as LearningLoadContent,
  PracticePerformanceRadar as PracticeCenterContent,
  MasteryProgressNavigator as MasteryNavigatorContent,
};
