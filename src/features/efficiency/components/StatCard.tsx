import { ElementType } from 'react';
import { cn } from '@/utils/stringHelpers';

interface StatCardProps {
  icon: ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
}

export const StatCard = ({
  icon: Icon,
  iconBg = 'bg-accent/10',
  iconColor = 'text-accent',
  label,
  value,
}: StatCardProps) => (
  <div className="p-4 rounded-xl bg-card/40 border border-border flex flex-col items-center justify-center text-center">
    <div className={cn('p-2 rounded-lg mb-2', iconBg)}>
      <Icon className={cn('w-4 h-4', iconColor)} />
    </div>
    <div className="text-xs text-muted-foreground/70 uppercase mb-0.5">
      {label}
    </div>
    <div className="text-base font-semibold text-white">{value}</div>
  </div>
);
