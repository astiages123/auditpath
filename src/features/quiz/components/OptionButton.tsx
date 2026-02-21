import { memo } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { cn } from '@/utils/stringHelpers';
import { MathRenderer } from './QuizStatus';

interface OptionButtonProps {
  option: string;
  label: string;
  variant: 'default' | 'correct' | 'incorrect' | 'dimmed';
  isSelected?: boolean;
  onClick: () => void;
  disabled: boolean;
}

const OptionButtonComponent = function OptionButton({
  option,
  label,
  variant,
  isSelected,
  onClick,
  disabled,
}: OptionButtonProps) {
  let containerStyle =
    'border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10';
  let iconComponent = null;
  let labelStyle =
    'bg-white/10 text-white/60 group-hover:bg-white/20 group-hover:text-white';

  if (isSelected && variant === 'default') {
    containerStyle = 'border-primary/60 bg-primary/5 hover:bg-primary/10';
    labelStyle = 'bg-primary/20 text-primary group-hover:bg-primary/30';
  }

  switch (variant) {
    case 'correct':
      containerStyle = 'border-primary bg-primary/10';
      labelStyle = 'bg-primary text-black';
      iconComponent = (
        <div className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center bg-primary text-black ml-auto">
          <Check className="w-3.5 h-3.5 font-black" />
        </div>
      );
      break;
    case 'incorrect':
      containerStyle = 'border-red-500/50 bg-red-500/10';
      labelStyle = 'bg-red-500 text-white';
      iconComponent = (
        <div className="w-6 h-6 rounded-full border-2 border-red-500 flex items-center justify-center bg-red-500 text-white ml-auto">
          <X className="w-3.5 h-3.5 font-black" />
        </div>
      );
      break;
    case 'dimmed':
      containerStyle = 'border-white/5 opacity-40';
      break;
    case 'default':
    default:
      break;
  }

  const sanitizeOption = (text: string) => {
    return text.replace(/^[A-Ea-e1-5][\s).:-]+/, '').trim();
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.005 } : {}}
      whileTap={!disabled ? { scale: 0.995 } : {}}
      className={cn(
        'group w-full flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-xl border transition-all duration-200 text-left',
        containerStyle,
        !disabled && 'cursor-pointer'
      )}
    >
      <div
        className={cn(
          'w-7 h-7 min-w-[35px] rounded-lg flex items-center justify-center font-bold text-sm transition-colors',
          labelStyle
        )}
      >
        {label}
      </div>
      <div className="flex-1 font-medium text-base text-foreground group-hover:text-white transition-colors">
        <MathRenderer content={sanitizeOption(option)} />
      </div>
      {iconComponent}
    </motion.button>
  );
};

export const OptionButton = memo(OptionButtonComponent);
