import { memo } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { cn } from '@/utils/core';
import { MathRenderer } from './MathRenderer';

export interface OptionButtonProps {
  option: string;
  label: string;
  variant: 'default' | 'correct' | 'incorrect' | 'dimmed';
  onClick: () => void;
  disabled: boolean;
}

export const OptionButton = memo(function OptionButton({
  option,
  label,
  variant,
  onClick,
  disabled,
}: OptionButtonProps) {
  let containerStyle =
    'border-border/50 hover:border-primary/40 hover:bg-muted/30';
  let iconComponent = null;
  let labelStyle = 'bg-muted/60 text-muted-foreground';

  switch (variant) {
    case 'correct':
      containerStyle = 'border-emerald-500/50 bg-emerald-500/5';
      labelStyle = 'bg-emerald-500 text-white';
      iconComponent = (
        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
      );
      break;
    case 'incorrect':
      containerStyle = 'border-red-500/50 bg-red-500/5';
      labelStyle = 'bg-red-500 text-white';
      iconComponent = (
        <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
          <X className="w-3.5 h-3.5 text-white" />
        </div>
      );
      break;
    case 'dimmed':
      containerStyle = 'border-border/30 opacity-40';
      break;
    case 'default':
    default:
      break;
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.005 } : {}}
      whileTap={!disabled ? { scale: 0.995 } : {}}
      className={cn(
        'w-full flex items-start gap-3 p-3.5 rounded-lg border transition-all duration-150 text-left',
        containerStyle,
        !disabled && 'cursor-pointer'
      )}
    >
      <span
        className={cn(
          'w-7 h-7 min-w-7 rounded-md flex items-center justify-center font-bold text-xs',
          labelStyle
        )}
      >
        {label}
      </span>
      <div className="flex-1 pt-0.5 prose prose-sm prose-invert max-w-none">
        <MathRenderer content={option} />
      </div>
      {iconComponent}
    </motion.button>
  );
});

export default OptionButton;
