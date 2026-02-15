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
          ? 'bg-linear-to-r from-emerald-500/20 to-emerald-500/5 border-emerald-500/20'
          : 'bg-linear-to-r from-zinc-800/50 to-zinc-900/50 border-white/5 hover:from-zinc-800 hover:to-zinc-900 hover:border-white/10'
      }`}
    >
      {/* Status Checkbox */}
      <div
        className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full border transition-all duration-300 ${
          completed
            ? `bg-emerald-500 text-white border-emerald-500 shadow-[0_0_10px_-3px_rgba(16,185,129,0.5)]`
            : 'border-zinc-600 bg-black/20 group-hover:border-zinc-400'
        }`}
      >
        {completed ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Circle className="h-3.5 w-3.5 text-transparent" />
        )}
      </div>

      {/* Number */}
      <span
        className={`text-sm font-mono shrink-0 ${
          completed
            ? 'text-emerald-200/70'
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
              ? 'text-emerald-50'
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
              ? 'bg-emerald-500/10 border-emerald-500/10 text-emerald-200'
              : 'bg-zinc-800/50 border-white/5 text-zinc-400 group-hover:bg-zinc-700/50 group-hover:text-zinc-300'
          }`}
        >
          {duration}
        </span>
      </div>
    </button>
  );
});
