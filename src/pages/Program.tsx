import { useEffect } from 'react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/stringHelpers';
import {
  WEEKLY_SCHEDULE,
  COURSE_THEME_CONFIG,
} from '@/features/courses/utils/coursesConfig';

export default function ProgramPage() {
  const today = new Date();
  const currentDayIndex = today.getDay();

  useEffect(() => {
    document.title = 'Program | AuditPath';
  }, []);

  return (
    <div className="bg-background text-foreground pb-20">
      <PageHeader
        title="Program"
        subtitle="Haftalık çalışma takvimi ve ders programı detayları."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
        {WEEKLY_SCHEDULE.map((item) => {
          const isToday = item.matchDays.includes(currentDayIndex);
          const cardTheme =
            COURSE_THEME_CONFIG[item.blocks[0]?.theme || 'primary'];

          return (
            <Card
              key={item.id}
              className={cn(
                'relative flex flex-col overflow-hidden transition-all duration-300',
                isToday
                  ? 'ring-1 ring-primary ring-offset-1 ring-offset-background shadow-md bg-card z-10'
                  : 'bg-card hover:bg-card/80 border-border/40 hover:border-border/80'
              )}
            >
              <div
                className={cn(
                  'absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20 -mr-12 -mt-12 pointer-events-none',
                  cardTheme.bg.replace(/\/\d+/, '')
                )}
              />

              <CardContent className="p-5">
                <div className="flex justify-between items-center mb-5">
                  <div className="space-y-1">
                    <h3
                      className={cn(
                        'text-lg font-bold',
                        isToday ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {item.dayName}
                    </h3>
                    {isToday && (
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary text-[10px] h-5 px-2 flex w-fit"
                      >
                        BUGÜN
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {item.blocks.map((block, idx) => {
                    const blockTheme = COURSE_THEME_CONFIG[block.theme];
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border border-border/30 hover:bg-background/80 transition-colors"
                      >
                        <div
                          className={cn(
                            'p-2 rounded-lg shadow-sm border border-border/50',
                            blockTheme.text,
                            blockTheme.bg
                          )}
                        >
                          <block.icon className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col flex-1 overflow-hidden">
                          <span className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-widest">
                            {block.name}
                          </span>
                          <span className="font-bold text-sm tracking-tight text-foreground truncate">
                            {block.subject}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>

              <div
                className={cn(
                  'h-1 w-full opacity-50',
                  cardTheme.bg.replace(/\/\d+/, '/50')
                )}
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
