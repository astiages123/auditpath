import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/stringHelpers';

const inputVariants = cva(
  cn(
    // 1. boyut/layout
    'flex w-full py-3 px-4',
    // 2. görünüm
    'bg-secondary/50 border-transparent rounded-xl transition-colors',
    'file:border-0 file:bg-transparent',
    // 3. metin
    'font-medium text-sm file:text-sm file:font-medium placeholder:text-muted-foreground',
    // 4. etkileşim
    'focus:ring-2 focus:ring-primary/20 focus-visible:outline-none',
    // 5. erişilebilirlik
    'disabled:cursor-not-allowed disabled:opacity-50'
  ),
  {
    variants: {},
  }
);

export interface InputProps
  extends
    React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
