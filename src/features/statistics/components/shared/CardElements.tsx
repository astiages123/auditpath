import { memo, ElementType, ReactNode } from 'react';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { cn } from '@/utils/stringHelpers';
import { Skeleton } from '@/components/ui/skeleton';

export interface TrendBadgeProps {
  percentage: number;
}

export interface CardHeaderProps {
  icon: ElementType;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle: string;
  badge?: ReactNode;
  action?: ReactNode;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendLabel?: string;
  loading?: boolean;
}

/**
 * Reusable component showing an upward or downward trend badge based on percentage.
 */
export const TrendBadge = ({ percentage }: TrendBadgeProps) => {
  if (percentage === 0) return null;

  const isPositive = percentage > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
        isPositive
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-rose-500/15 text-rose-400'
      )}
    >
      <TrendIcon className="w-2.5 h-2.5" />
      <span>%{Math.abs(percentage)}</span>
    </div>
  );
};

/**
 * Reusable header component maintaining consistent styling across stat cards.
 */
export const CardHeader = memo(
  ({
    icon: Icon,
    iconColor = 'text-accent',
    iconBg = 'bg-accent/10',
    title,
    subtitle,
    badge,
    action,
  }: CardHeaderProps) => {
    return (
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className={cn('p-2.5 rounded-xl', iconBg)}>
            <Icon className={cn('w-5 h-5', iconColor)} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-semibold text-white tracking-wide">
              {title}
            </span>
            <span className="text-xs text-muted-foreground/80">{subtitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {badge}
          {action}
        </div>
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

export const StatCard = ({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  loading = false,
}: StatCardProps) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/30 p-4 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-16" />
      </div>
    );
  }

  const isPositive = trend?.startsWith('+');
  const trendClass = isPositive
    ? 'bg-emerald-500/15 text-emerald-400'
    : 'bg-rose-500/15 text-rose-400';

  return (
    <div className="rounded-xl border border-border/50 bg-card/30 p-4">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="mt-1 text-xl font-semibold text-white">{value}</div>
      {subtitle && (
        <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
      )}
      {trend && (
        <span
          className={cn(
            'mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold',
            trendClass
          )}
        >
          {trend}
        </span>
      )}
      {trendLabel && (
        <div className="mt-1 text-[10px] text-muted-foreground">
          {trendLabel}
        </div>
      )}
    </div>
  );
};

export interface CommonEmptyStateProps {
  message?: string;
  icon?: ElementType;
  className?: string;
}

/**
 * Shared empty state component for cards and modals.
 */
export const CommonEmptyState = ({
  message = 'Gösterilecek veri bulunamadı.',
  icon: Icon = Info,
  className,
}: CommonEmptyStateProps) => {
  return (
    <div
      className={cn(
        'flex-1 flex flex-col items-center justify-center text-center space-y-3 py-10 opacity-60 animate-in fade-in zoom-in duration-500',
        className
      )}
    >
      <div className="p-3 bg-white/5 rounded-full border border-white/5">
        <Icon className="size-6 text-foreground" />
      </div>
      <p className="text-sm text-foreground max-w-[240px] leading-relaxed">
        {message}
      </p>
    </div>
  );
};
