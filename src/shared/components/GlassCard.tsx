import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/utils/stringHelpers';

interface GlassCardProps {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}

export const GlassCard = ({ className, children, onClick }: GlassCardProps) => (
  <Card
    className={cn(
      'relative overflow-hidden transition-all duration-300 cursor-pointer group',
      'bg-white/2 backdrop-blur-sm border-white/5',
      'hover:bg-white/4 hover:border-white/10 hover:shadow-lg hover:shadow-black/10',
      className
    )}
    onClick={onClick}
  >
    {children}
  </Card>
);
