"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Play, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoItemProps {
    id: string;
    videoNumber: number;
    title: string;
    duration: string;
    durationMinutes: number;
    completed?: boolean;
    onToggleComplete?: (videoId: string, completed: boolean, isModifierPressed: boolean) => void;
    playlistUrl?: string;
}

export function VideoItem({
    id,
    videoNumber,
    title,
    duration,
    // durationMinutes unused
    completed = false,
    onToggleComplete,
    playlistUrl,
}: VideoItemProps) {


    // Radix/Shadcn Checkbox onCheckedChange gives `checked` property, but not the event.
    // We need to capture the click event to detect "metaKey" or "ctrlKey".
    const handleClick = (e: React.MouseEvent) => {
        // e.stopPropagation(); // Don't stop propagation if we want other clicks to work, but here it's specific.

        // We want to detect the modifier key.
        const isModifierPressed = e.metaKey || e.ctrlKey;

        // The Checkbox component handles the state change, but we want to intercept the *intent*.
        // If we use onClick on the Checkbox, it might conflict with the internal handler of Radix.
        // A common workaround is to use `onKeyDown` or just `onClick` on a wrapping div or the checkbox itself if possible.
        // However, the cleanest way with `onCheckedChange` is often not possible for modifier keys.

        // Let's rely on the `onClick` of the Checkbox component (which passes through to the button element).
        // If we invoke `onToggleComplete` here, we need to know the *next* state.
        // The `completed` prop is the *current* state. So next state is !completed.

        // IMPORTANT: Radix Checkbox prevents default on click if it handles it? No, usually it bubbles.

        // Let's simplify: We trigger the callback manually on Click and prevent the default Checkbox behavior if we want full control,
        // OR we just use the Click event to capture the modifier and pass it.

        onToggleComplete?.(id, !completed, isModifierPressed);
    };

    // Wait, if we use `onClick` on the Checkbox, Radix execution order is tricky.
    // Let's look at how Checkbox is implemented. It uses Radix `CheckboxPrimitive.Root`.
    // Valid approach: Pass `onClick` to Checkbox, and use `e.preventDefault()` if we want to handle it fully manually,
    // OR just use `onClick` and let `onCheckedChange` be ignored or removed.

    // Removing `onCheckedChange` and using `onClick` gives us full control including the event object (for modifier keys).
    /* 
       <Checkbox 
          ...
          checked={completed}
          onClick={handleClick}
          // remove onCheckedChange to avoid double calls or confusion
       />
    */


    // Generate YouTube video URL from playlist
    const getVideoUrl = () => {
        if (!playlistUrl) return null;
        const playlistId = playlistUrl.split("list=")[1];
        if (!playlistId) return null;
        return `https://www.youtube.com/watch?v=&list=${playlistId}&index=${videoNumber}`;
    };

    const videoUrl = getVideoUrl();

    return (
        <div
            className={cn(
                "group flex items-center gap-3 p-3 rounded-lg transition-all duration-200",
                "hover:bg-card/50 border border-transparent hover:border-border/50",
                completed && "opacity-70"
            )}
        >
            {/* Checkbox */}
            {/* Checkbox Wrapper for robust click/modifier handling */}
            <div
                onClick={handleClick}
                className="cursor-pointer flex items-center justify-center rounded-full hover:bg-primary/10 p-0.5 transition-colors"
            >
                <Checkbox
                    id={`video-${id}`}
                    checked={completed}
                    className="h-5 w-5 rounded-full border-2 pointer-events-none"
                />
            </div>

            {/* Video Number */}
            <div
                className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium",
                    completed
                        ? "bg-primary/20 text-primary"
                        : "bg-muted/50 text-muted-foreground"
                )}
            >
                {completed ? (
                    <CheckCircle2 className="h-4 w-4" />
                ) : (
                    <span>{videoNumber}</span>
                )}
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
                <p
                    className={cn(
                        "font-medium text-sm truncate",
                        completed && "line-through text-muted-foreground"
                    )}
                >
                    {title}
                </p>
            </div>

            {/* Duration */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{duration}</span>
            </div>

            {/* Play Button */}
            {videoUrl && (
                <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/20"
                >
                    <Play className="h-3 w-3" />
                    <span className="hidden sm:inline">İzle</span>
                </a>
            )}
        </div>
    );
}
