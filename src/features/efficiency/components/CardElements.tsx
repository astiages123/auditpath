import { memo, ElementType, ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/utils/stringHelpers';
import { Skeleton } from '@/components/ui/skeleton';

// Reusable Trend Badge component
export const TrendBadge = ({ percentage }: { percentage: number }) => {
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

// Shared CardHeader component for consistency
export const CardHeader = memo(
  ({
    icon: Icon,
    iconColor = 'text-accent',
    iconBg = 'bg-accent/10',
    title,
    subtitle,
    badge,
    action,
  }: {
    icon: ElementType;
    iconColor?: string;
    iconBg?: string;
    title: string;
    subtitle: string;
    badge?: ReactNode;
    action?: ReactNode;
  }) => (
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
  )
);

CardHeader.displayName = 'CardHeader';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: string;
  trendLabel?: string;
  className?: string;
  loading?: boolean;
}

export const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  className,
  loading,
}: StatCardProps) => {
  if (loading) {
    return (
      <div
        className={cn(
          'p-4 rounded-2xl bg-zinc-900/80 border-border',
          className
        )}
      >
        <div className="flex justify-between items-start mb-2">
          <Skeleton className="h-4 w-24 bg-surface" />
          {icon && <Skeleton className="h-8 w-8 rounded-full bg-surface" />}
        </div>
        <Skeleton className="h-8 w-16 mb-2 bg-surface" />
        <Skeleton className="h-4 w-32 bg-surface" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-4 rounded-2xl bg-zinc-900/80 border-border hover:border-white/10 transition-colors',
        className
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        {icon && (
          <div className="p-2 bg-surface rounded-lg text-white/80">{icon}</div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white font-heading">
          {value}
        </span>
        {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
      </div>
      {(trend || trendLabel) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={cn(
                'font-medium px-1.5 py-0.5 rounded',
                trend.startsWith('+')
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-rose-500/10 text-rose-400'
              )}
            >
              {trend}
            </span>
          )}
          {trendLabel && <span className="text-slate-500">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
};
