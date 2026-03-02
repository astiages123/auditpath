import { memo } from 'react';
import { Check, Circle, Play, FileText } from 'lucide-react';

interface CourseItemProps {
  _id: string; // Changed from number to string (UUID)
  itemNumber: number;
  title: string;
  duration: string;
  completed: boolean;
  itemType: 'video' | 'reading';
  onToggle: (itemNumber: number, isModifierPressed: boolean) => void;
}

export const CourseItem = memo(function CourseItem({
  _id,
  itemNumber,
  title,
  duration,
  completed,
  itemType,
  onToggle,
}: CourseItemProps) {
  const Icon = itemType === 'video' ? Play : FileText;

  return (
    <button
      onClick={(e) => onToggle(itemNumber, e.metaKey || e.ctrlKey)}
      className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 text-left w-full ${
        completed
          ? 'bg-accent/5 border-accent/30 shadow-[0_0_15px_-5px_var(--shadow-glow-accent)]'
          : 'bg-linear-to-r from-zinc-800/50 to-zinc-900/50 border-white/5 hover:from-zinc-800 hover:to-zinc-900 hover:border-white/10'
      }`}
    >
      {/* Status Checkbox */}
      <div
        className={`shrink-0 flex items-center justify-center size-6 rounded-full border transition-all duration-300 ${
          completed
            ? `bg-accent text-accent-foreground border-accent shadow-[0_0_10px_-3px_rgba(var(--accent),0.5)]`
            : 'border-zinc-600 bg-black/20 group-hover:border-zinc-400'
        }`}
      >
        {completed ? (
          <Check className="size-3.5" />
        ) : (
          <Circle className="size-3.5 text-transparent" />
        )}
      </div>

      {/* Icon and Number */}
      <div className="flex items-center gap-2 shrink-0">
        <Icon
          className={`size-3.5 ${
            completed
              ? 'text-accent/70'
              : 'text-zinc-500 group-hover:text-zinc-400'
          }`}
        />
        <span
          className={`text-sm font-mono ${
            completed
              ? 'text-accent/70'
              : 'text-zinc-300 group-hover:text-zinc-400'
          }`}
        >
          {itemNumber}.
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-medium transition-colors ${
            completed
              ? 'text-zinc-100'
              : 'text-zinc-300 group-hover:text-zinc-100'
          }`}
        >
          {title}
        </span>
      </div>

      {/* Duration */}
      <div className="shrink-0">
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${
            completed
              ? 'bg-accent/10 border-accent/10 text-accent/90'
              : 'bg-zinc-800/50 border-white/5 text-zinc-400 group-hover:bg-muted/40 group-hover:text-zinc-300'
          }`}
        >
          {duration}
        </span>
      </div>
    </button>
  );
});
