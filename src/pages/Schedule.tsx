import { useEffect } from 'react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/stringHelpers';
import {
  WEEKLY_SCHEDULE,
  COURSE_THEME_CONFIG,
} from '@/features/courses/utils/coursesConfig';
import {
  getCourseTheme,
  getCourseIcon,
} from '@/features/courses/logic/coursesLogic';

export default function SchedulePage() {
  const today = new Date();
  const currentDayIndex = today.getDay();

  useEffect(() => {
    document.title = 'Çalışma Programı | AuditPath';
  }, []);

  return (
    <div className="bg-background text-foreground pb-20">
      <PageHeader
        title="Çalışma Programı"
        subtitle="Haftalık rutin ve ders çalışma planı."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4 mt-6">
        {WEEKLY_SCHEDULE.map((item) => {
          const isToday = item.matchDays.includes(currentDayIndex);
          const firstBlockTheme = item.blocks[0]
            ? item.blocks[0].theme ||
              getCourseTheme(
                item.blocks[0].courseOrCategoryId || item.blocks[0].subject
              )
            : 'primary';
          const cardTheme = COURSE_THEME_CONFIG[firstBlockTheme];

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

                <div className="space-y-2">
                  {item.blocks.map((block) => {
                    const resolvedTheme =
                      block.theme ||
                      getCourseTheme(block.courseOrCategoryId || block.subject);
                    const blockTheme = COURSE_THEME_CONFIG[resolvedTheme];
                    const ResolvedIcon =
                      block.icon ||
                      getCourseIcon(block.courseOrCategoryId || block.subject);
                    const blockKey = `${block.name}-${block.subject}`;
                    return (
                      <div
                        key={blockKey}
                        className="flex flex-col items-center gap-3 p-4 bg-background/50 rounded-lg border border-border/30 hover:bg-background/80 transition-colors text-center"
                      >
                        <div
                          className={cn(
                            'p-3 rounded-xl shadow-sm border border-border/50',
                            blockTheme.text,
                            blockTheme.bg
                          )}
                        >
                          <ResolvedIcon className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col flex-1 overflow-hidden">
                          <span className="font-extrabold text-sm tracking-tight text-foreground leading-snug">
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
