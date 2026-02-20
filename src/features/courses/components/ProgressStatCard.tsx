import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/stringHelpers';
import { Skeleton } from '@/components/ui/skeleton';
import type { Variants } from 'framer-motion';

interface ProgressStatCardProps {
  icon: LucideIcon;
  bgIcon?: LucideIcon;
  label: string;
  value: string | number;
  suffix?: string;
  subText?: string;
  colorClass?: string;
  showSkeleton?: boolean;
  variants: Variants;
  children?: React.ReactNode;
}

export function ProgressStatCard({
  icon: Icon,
  bgIcon: BgIcon,
  label,
  value,
  suffix,
  subText,
  colorClass = 'text-white',
  showSkeleton,
  variants,
  children,
}: ProgressStatCardProps) {
  const borderClass = colorClass.includes('orange')
    ? 'border-orange-500/20'
    : colorClass.includes('emerald')
      ? 'border-emerald-500/20'
      : colorClass.includes('blue')
        ? 'border-blue-500/20'
        : colorClass.includes('purple')
          ? 'border-purple-500/20'
          : 'border-white/10';

  const gradientClass = colorClass.includes('orange')
    ? 'from-orange-500/10 via-zinc-900 to-zinc-900'
    : colorClass.includes('emerald')
      ? 'from-emerald-500/10 via-zinc-900 to-zinc-900'
      : colorClass.includes('blue')
        ? 'from-blue-500/10 via-zinc-900 to-zinc-900'
        : colorClass.includes('purple')
          ? 'from-purple-500/10 via-zinc-900 to-zinc-900'
          : 'from-zinc-900 via-zinc-900 to-zinc-800';

  const iconBgClass = colorClass.includes('orange')
    ? 'bg-orange-500/10 border-orange-500/20 text-orange-500'
    : colorClass.includes('emerald')
      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
      : colorClass.includes('blue')
        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
        : colorClass.includes('purple')
          ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
          : 'bg-white/5 border-white/10 text-white';

  return (
    <motion.div
      variants={variants}
      className={cn(
        'relative overflow-hidden rounded-3xl border p-5 group bg-linear-to-br',
        borderClass,
        gradientClass
      )}
    >
      {BgIcon && (
        <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <BgIcon className={cn('w-24 h-24', colorClass.split(' ')[0])} />
        </div>
      )}
      <div className="relative flex flex-col justify-between h-full space-y-4">
        <div className="flex items-center gap-2">
          <div className={cn('p-2 rounded-xl border', iconBgClass)}>
            <Icon className="w-4 h-4" />
          </div>
          <span
            className={cn(
              'text-xs font-semibold uppercase tracking-wider',
              colorClass.includes('text-white') ? 'text-white/70' : colorClass
            )}
          >
            {label}
          </span>
        </div>

        <div>
          {showSkeleton ? (
            <Skeleton className="h-10 w-24 bg-zinc-800" />
          ) : (
            <>
              <div className="flex items-baseline">
                <span className={cn('text-lg font-black text-white')}>
                  {value}
                </span>
                {suffix && (
                  <span className="ml-1 text-sm font-medium text-muted-foreground">
                    {suffix}
                  </span>
                )}
              </div>
              {subText && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {subText}
                </p>
              )}
            </>
          )}
          {children}
        </div>
      </div>
    </motion.div>
  );
}
