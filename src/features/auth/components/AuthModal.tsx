import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { AuthForms } from './AuthForms';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl p-6 gap-6">
        <DialogHeader className="space-y-3 items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <img
              src="/logo.svg"
              alt="Logo"
              className="w-8 h-8 object-contain"
            />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            Tekrar Hoşgeldiniz
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground max-w-[280px]">
            Devam etmek için giriş yapın.
          </DialogDescription>
        </DialogHeader>

        <AuthForms onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
