import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/core';
import { Calendar as CalendarIcon } from 'lucide-react';
import { WEEKLY_SCHEDULE, COURSE_THEME_CONFIG } from '../utils/coursesConfig';

interface ProgramModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProgramModal({ open, onOpenChange }: ProgramModalProps) {
  const today = new Date();
  const currentDayIndex = today.getDay();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Haftalık Çalışma Programı
            </DialogTitle>
            <DialogDescription className="sr-only">
              Haftalık çalışma takvimi ve ders programı detayları.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {WEEKLY_SCHEDULE.map((item) => {
            const isToday = item.matchDays.includes(currentDayIndex);
            const theme = COURSE_THEME_CONFIG[item.theme];

            return (
              <Card
                key={item.id}
                className={cn(
                  'relative flex flex-col overflow-hidden transition-all duration-300',
                  isToday
                    ? 'ring-1 ring-primary ring-offset-1 ring-offset-background shadow-md bg-card z-10'
                    : 'bg-card/40 hover:bg-card/80 border-border/40 hover:border-border/80'
                )}
              >
                <div
                  className={cn(
                    'absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-10 -mr-8 -mt-8 pointer-events-none',
                    theme.bg.replace('/20', '') // Adjust opacity if needed, or just use bg class directly if it fits
                  )}
                />

                <CardContent className="p-3">
                  <div className="flex justify-between items-center mb-2">
                    <div className="space-y-0.5">
                      <h3
                        className={cn(
                          'text-sm font-semibold',
                          isToday ? 'text-primary' : 'text-muted-foreground'
                        )}
                      >
                        {item.dayName}
                      </h3>
                      {isToday && (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary text-[9px] h-4 px-1.5 flex w-fit"
                        >
                          BUGÜN
                        </Badge>
                      )}
                    </div>
                    <div
                      className={cn(
                        'p-1.5 rounded-md bg-background shadow-sm border border-border/50',
                        theme.text
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className="text-center py-2 bg-background/30 rounded-lg border border-border/30 border-dashed">
                    <span className="font-bold text-sm tracking-tight text-foreground block">
                      {item.subject}
                    </span>
                  </div>
                </CardContent>

                <div
                  className={cn(
                    'h-0.5 w-full opacity-50',
                    theme.bg.replace('/20', '/50')
                  )}
                />
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
