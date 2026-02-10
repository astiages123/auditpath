'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/core/utils';
import { BookOpen, Calendar as CalendarIcon } from 'lucide-react';

interface ProgramModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProgramModal({ open, onOpenChange }: ProgramModalProps) {
  const today = new Date();
  const currentDayIndex = today.getDay();

  const schedule = [
    {
      id: 1,
      day: 'Pazartesi',
      subject: 'Ekonomi',
      icon: BookOpen,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      matchDays: [1],
    },
    {
      id: 2,
      day: 'Salı',
      subject: 'Hukuk',
      icon: BookOpen,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      matchDays: [2],
    },
    {
      id: 3,
      day: 'Çarşamba',
      subject: 'Ekonomi',
      icon: BookOpen,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      matchDays: [3],
    },
    {
      id: 4,
      day: 'Perşembe',
      subject: 'Hukuk',
      icon: BookOpen,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      matchDays: [4],
    },
    {
      id: 5,
      day: 'Cuma',
      subject: 'Genel Yetenek - İngilizce',
      icon: BookOpen,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      matchDays: [5],
    },
    {
      id: 6,
      day: 'Cumartesi / Pazar',
      subject: 'Muhasebe ve Maliye',
      icon: BookOpen,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      matchDays: [6, 0],
    },
  ];

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
          {schedule.map((item) => {
            const isToday = item.matchDays.includes(currentDayIndex);

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
                    item.color.replace('text-', 'bg-')
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
                        {item.day}
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
                        item.color
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
                    item.bg.replace('/10', '/50')
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
