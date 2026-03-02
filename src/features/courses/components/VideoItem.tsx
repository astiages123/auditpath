import { memo } from 'react';
import { Check, Circle } from 'lucide-react';

interface VideoItemProps {
  _id: number;
  videoNumber: number;
  title: string;
  duration: string;
  completed: boolean;
  onToggle: (videoNumber: number, isModifierPressed: boolean) => void;
}

export const VideoItem = memo(function VideoItem({
  _id,
  videoNumber,
  title,
  duration,
  completed,
  onToggle,
}: VideoItemProps) {
  return (
    <button
      onClick={(e) => onToggle(videoNumber, e.metaKey || e.ctrlKey)}
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

      {/* Number */}
      <span
        className={`text-sm font-mono shrink-0 ${
          completed
            ? 'text-accent/70'
            : 'text-zinc-300 group-hover:text-zinc-400'
        }`}
      >
        {videoNumber}.
      </span>

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
