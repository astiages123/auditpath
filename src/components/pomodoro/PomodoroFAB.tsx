"use client";

import { useTimerStore } from "@/store/useTimerStore";
import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
// usePomodoro unused import removed

export function PomodoroFAB() {
    const setWidgetOpen = useTimerStore(s => s.setWidgetOpen);
    const isWidgetOpen = useTimerStore(s => s.isWidgetOpen);
    // usePomodoro unused vars removed
    // const { isActive, isOvertime, minutes, seconds, mode } = usePomodoro();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);



    // Visibility check
    if (!mounted || isWidgetOpen) return null;

    return createPortal(
        <div className="fixed bottom-8 right-3 z-40">
            <Button
                onClick={() => setWidgetOpen(true)}
                className="h-13 w-13 rounded-full shadow-2xl flex items-center justify-center p-0 transition-all duration-300 hover:scale-105 bg-foreground/20 hover:bg-foreground/50 overflow-hidden"
            >
                <Timer size={24} strokeWidth={1.5} className="text-white min-w-[24px] min-h-[24px]" />
            </Button>
        </div>,
        document.body
    );
}
