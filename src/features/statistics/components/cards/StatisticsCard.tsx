import { ReactNode, ElementType } from 'react';
import { HelpCircle } from 'lucide-react';
import { CommonEmptyState } from '@/features/statistics/components/shared/CardElements';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/utils/stringHelpers';

export interface StatisticsCardProps {
  /** Card title shown in the header */
  title: string;
  /** Short description shown under the title */
  subtitle?: string;
  /** Technical explanation shown in a tooltip */
  tooltip?: string;
  /** Lucide icon displayed in the top-left */
  icon?: ElementType;
  /** Color class for the icon (e.g., text-accent) */
  iconColor?: string;
  /** Background color class for the icon (e.g., bg-accent/10) */
  iconBg?: string;
  /** Optional action element (e.g., Maximize icon) */
  action?: ReactNode;
  /** Loading state - shows a skeleton if true */
  loading?: boolean;
  /** Empty state - shows a message if true */
  isEmpty?: boolean;
  /** Custom message for empty state */
  emptyMessage?: string;
  /** Main content of the card */
  children: ReactNode;
  /** Optional CSS class for customization */
  className?: string;
  /** Optional click handler (makes the card look interactive) */
  onClick?: () => void;
}

/**
 * StatisticsCard is the central UI component for all cards on the Statistics page.
 * It provides consistent styling, hover effects, skeletons, and tooltips.
 */
export const StatisticsCard = ({
  title,
  subtitle,
  tooltip,
  icon: Icon,
  iconColor = 'text-accent',
  iconBg = 'bg-accent/10',
  action,
  loading,
  isEmpty,
  emptyMessage = 'Gösterilecek veri bulunamadı.',
  children,
  className,
  onClick,
}: StatisticsCardProps) => {
  if (loading) {
    return (
      <Card
        className={cn(
          'p-6 h-full bg-surface/5 border-border/10 skeleton-shimmer',
          className
        )}
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-xl bg-surface/20" />
            <div className="space-y-2">
              <Skeleton className="w-24 h-4 bg-surface/20" />
              <Skeleton className="w-40 h-3 bg-surface/20" />
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center space-y-4">
          <Skeleton className="w-full h-32 bg-surface/20 rounded-lg" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'group h-full flex flex-col p-4 md:p-6 transition-all duration-300 border-border/40 bg-card/30',
        'hover:border-accent/40 hover:bg-card/40',
        onClick || action ? 'cursor-pointer' : '',
        className
      )}
      onClick={onClick}
    >
      {/* HEADER SECTION */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          {Icon && (
            <div
              className={cn(
                'p-2.5 rounded-xl transition-colors duration-300',
                iconBg
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 transition-transform duration-300 group-hover:scale-110',
                  iconColor
                )}
              />
            </div>
          )}
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-white tracking-wide truncate">
                {title}
              </span>
              {tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="text-muted-foreground/40 hover:text-accent transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[200px] text-xs bg-popover border-border">
                      <p>{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {subtitle && (
              <span className="text-xs text-muted-foreground/80 truncate">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        {action && <div className="flex items-center gap-3">{action}</div>}
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {isEmpty ? <CommonEmptyState message={emptyMessage} /> : children}
      </div>
    </Card>
  );
};
