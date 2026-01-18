import { useEffect } from 'react';
import { useTimerStore } from '@/store/useTimerStore';

export function TimerController() {
    const { isActive, tick } = useTimerStore();

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isActive) {
            interval = setInterval(() => {
                tick();
            }, 1000);
        } else if (interval) {
            clearInterval(interval);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, tick]);

    return null; // Logic only
}
