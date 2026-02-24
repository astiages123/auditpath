import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/utils/stringHelpers';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { type NavItem } from './nav-config';

interface SidebarItemProps {
  item: NavItem;
  isCollapsed: boolean;
  onAction?: (action: string) => void;
}

export function SidebarItem({ item, isCollapsed, onAction }: SidebarItemProps) {
  const { pathname } = useLocation();
  const isActive = item.href
    ? item.href === '/'
      ? pathname === '/'
      : pathname === item.href || pathname.startsWith(item.href + '/')
    : false;
  const Icon = item.icon;

  const sharedClassName = cn(
    'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 group w-full',
    isCollapsed && 'justify-center px-2',
    isActive
      ? 'bg-primary/10 border border-primary/20 text-primary'
      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground border border-transparent'
  );

  const inner = (
    <>
      <Icon
        className={cn(
          'size-[18px] shrink-0 transition-colors',
          isActive
            ? 'text-primary'
            : 'text-muted-foreground group-hover:text-foreground'
        )}
      />
      {!isCollapsed && <span className="truncate">{item.label}</span>}
    </>
  );

  const element = item.href ? (
    <Link to={item.href} className={sharedClassName}>
      {inner}
    </Link>
  ) : (
    <button
      onClick={() => item.action && onAction?.(item.action)}
      className={cn(sharedClassName, 'text-left')}
    >
      {inner}
    </button>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{element}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return element;
}
