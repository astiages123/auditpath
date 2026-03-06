import { FC, ReactNode } from 'react';
import { cn } from '@/utils/stringHelpers';

interface PageHeaderProps {
  title: string;
  subtitle?: string | ReactNode;
  className?: string;
}

export const PageHeader: FC<PageHeaderProps> = ({
  title,
  subtitle,
  className,
}) => {
  return (
    <div
      className={cn(
        'mb-10 animate-in fade-in slide-in-from-top-4 duration-700',
        className
      )}
    >
      <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        {title}
      </h1>
      {subtitle && (
        <div className="text-muted-foreground mt-2 text-base md:text-lg">
          {subtitle}
        </div>
      )}
    </div>
  );
};
