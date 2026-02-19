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
        <AlertDialogContent className="bg-card border-border text-foreground rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Oturumu Kapat</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Mevcut oturumun kaydedilmeyecek. Emin misin?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-border bg-secondary text-foreground">
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmClose}
              className="rounded-xl bg-destructive text-destructive-foreground"
            >
              Kapat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Finish Alert */}
      <AlertDialog open={showFinishAlert} onOpenChange={setShowFinishAlert}>
        <AlertDialogContent className="bg-card border-border text-foreground rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Günü Tamamla</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tüm çalışmaların kaydedilecek. Günü bitirmek istiyor musun?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-border bg-secondary text-foreground">
              Devam Et
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmFinish}
              className="rounded-xl bg-emerald-600 text-white"
            >
              Bitir ve Kaydet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
