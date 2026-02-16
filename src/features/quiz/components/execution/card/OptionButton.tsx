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

/**
 * OptionButton component for multiple choice quiz questions
 *
 * Displays an option with a label (A, B, C, etc.), supporting
 * KaTeX rendering for math formulas and visual feedback for
 * correct/incorrect selection.
 */
export const OptionButton = memo(function OptionButton({
  option,
  label,
  variant,
  onClick,
  disabled,
}: OptionButtonProps) {
  let containerStyle =
    'border-border hover:border-primary/50 hover:bg-muted/30';
  let iconComponent = null;
  let labelStyle = 'bg-muted text-muted-foreground';

  switch (variant) {
    case 'correct':
      containerStyle = 'border-emerald-500 bg-emerald-500/10';
      labelStyle = 'bg-emerald-500 text-white';
      iconComponent = (
        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
          <Check className="w-4 h-4 text-white" />
        </div>
      );
      break;
    case 'incorrect':
      containerStyle = 'border-red-500 bg-red-500/10';
      labelStyle = 'bg-red-500 text-white';
      iconComponent = (
        <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shrink-0">
          <X className="w-4 h-4 text-white" />
        </div>
      );
      break;
    case 'dimmed':
      containerStyle = 'border-border opacity-50';
      break;
    case 'default':
    default:
      // kept initials
      break;
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.01 } : {}}
      whileTap={!disabled ? { scale: 0.99 } : {}}
      className={cn(
        'w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left',
        containerStyle,
        !disabled && 'cursor-pointer'
      )}
    >
      <span
        className={cn(
          'w-8 h-8 min-w-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0',
          labelStyle
        )}
      >
        {label}
      </span>
      <div className="flex-1 pt-1 prose prose-sm prose-invert max-w-none">
        <MathRenderer content={option} />
      </div>
      {iconComponent}
    </motion.button>
  );
});

export default OptionButton;
