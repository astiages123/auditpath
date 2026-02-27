import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PomodoroAlertsProps {
  showCloseAlert: boolean;
  setShowCloseAlert: (show: boolean) => void;
  showFinishAlert: boolean;
  setShowFinishAlert: (show: boolean) => void;
  onConfirmClose: () => void;
  onConfirmFinish: () => void;
}

export function PomodoroAlerts({
  showCloseAlert,
  setShowCloseAlert,
  showFinishAlert,
  setShowFinishAlert,
  onConfirmClose,
  onConfirmFinish,
}: PomodoroAlertsProps) {
  return (
    <>
      {/* Close Alert */}
      <AlertDialog open={showCloseAlert} onOpenChange={setShowCloseAlert}>
        <AlertDialogContent className="bg-card/80 border-border text-foreground rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Oturumu Kapat</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Mevcut oturumun kaydedilmeyecek. Emin misin?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-border bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmClose}
              className="rounded-xl bg-destructive/50 text-destructive-foreground hover:bg-destructive/80 transition-colors"
            >
              Kapat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Finish Alert */}
      <AlertDialog open={showFinishAlert} onOpenChange={setShowFinishAlert}>
        <AlertDialogContent className="bg-card/80 border-border text-foreground rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Günü Tamamla</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tüm çalışmaların kaydedilecek. Günü bitirmek istiyor musun?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-border bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
              Devam Et
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmFinish}
              className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-600/80 transition-colors"
            >
              Bitir ve Kaydet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
