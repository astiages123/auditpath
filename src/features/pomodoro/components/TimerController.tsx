"use client";

import { useEffect, useRef } from 'react';
import { useTimerStore } from '@/shared/store/useTimerStore';
import { useAuth } from '@/features/auth';
import { 
    getDailySessionCount, 
    getLatestActiveSession, 
    updatePomodoroHeartbeat
} from '@/shared/lib/core/client-db';
import { calculateSessionTotals } from '@/shared/lib/domain/pomodoro-utils';
import { toast } from 'sonner';
import { env } from '@/config/env';

const playNotificationSound = () => {
    try {
        const audio = new Audio("/audio/alarm_ring.mp3");
        audio.play().catch((e) => {
            console.warn("Audio play failed (waiting for user interaction):", e);
        });
    } catch (e) {
        console.error("Audio initialization failed", e);
    }
};

export function TimerController() {
    const { 
        isActive, tick, timeLeft, isBreak, sessionId, 
        selectedCourse, timeline, originalStartTime, startTime,
        setSessionCount, setSessionId, setCourse, hasRestored, setHasRestored
    } = useTimerStore();

    const { user, session } = useAuth();
    const userId = user?.id;

    // To prevent double notifications for the same event
    const lastNotifiedRef = useRef<string | null>(null);

    // 1. Core Tick using Web Worker
    useEffect(() => {
        const worker = new Worker(new URL('/workers/timerWorker.ts', import.meta.url));

        worker.onmessage = (e) => {
            if (e.data === 'TICK') {
                tick();
            }
        };

        if (isActive) {
            worker.postMessage('START');
        } else {
            worker.postMessage('STOP');
        }

        return () => {
            worker.postMessage('STOP');
            worker.terminate();
        };
    }, [isActive, tick]);

    // 2. Initial Sync & Restore
    useEffect(() => {
        if (!userId) return;

        const sync = async () => {
            // Sync daily count
            const count = await getDailySessionCount(userId);
            if (!sessionId) {
                setSessionCount(count + 1);
            } else {
                setSessionCount(count || 1);
            }

            // Restore active session if idle
            if (!hasRestored && !(window as unknown as { _isPomodoroRestoring?: boolean })._isPomodoroRestoring) {
                setHasRestored(true);
                (window as unknown as { _isPomodoroRestoring?: boolean })._isPomodoroRestoring = true;

                if (!isActive && !sessionId) {
                    try {
                        const activeSession = await getLatestActiveSession(userId);
                        if (activeSession) {
                            const sessionAge = Date.now() - new Date(activeSession.started_at).getTime();
                            const isRecent = sessionAge < 12 * 60 * 60 * 1000;

                            if (isRecent) {
                                setSessionId(activeSession.id);
                                if (activeSession.course_id && activeSession.course_name && !selectedCourse) {
                                    setCourse({
                                        id: activeSession.course_id,
                                        name: activeSession.course_name,
                                        category: activeSession.course?.category?.name || "General",
                                    });
                                }
                                toast.info("Önceki oturumunuzdan devam ediliyor.");
                            }
                        }
                    } catch (e) {
                        console.error("Restoration failed", e);
                    } finally {
                        (window as unknown as { _isPomodoroRestoring?: boolean })._isPomodoroRestoring = false;
                    }
                } else {
                    (window as unknown as { _isPomodoroRestoring?: boolean })._isPomodoroRestoring = false;
                }
            }
        };

        sync();
    }, [userId, sessionId, isActive, hasRestored, setSessionCount, setSessionId, setCourse, setHasRestored, selectedCourse]);

    // 3. Heartbeat
    useEffect(() => {
        if (!sessionId || !isActive) return;

        const heartbeatInterval = setInterval(() => {
            updatePomodoroHeartbeat(sessionId);
        }, 30000);

        return () => clearInterval(heartbeatInterval);
    }, [sessionId, isActive]);

    // 4. Session Completion & Notifications
    useEffect(() => {
        // We use <= 0 to catch any skips
        if (timeLeft <= 0 && isActive && sessionId) {
            const notificationKey = `${sessionId}-${isBreak ? 'break' : 'work'}`;
            
            // PREVENT DOUBLE FIRE
            if (lastNotifiedRef.current === notificationKey) return;
            lastNotifiedRef.current = notificationKey;

            const message = !isBreak
                ? "Harika iş çıkardın! Şimdi kısa bir mola zamanı. ☕"
                : "Mola bitti, tekrar odaklanmaya hazır mısın? 💪";

            // Sonner Toast
            toast.success(message, { duration: 2000 });

            // Notification Tool
            const sendNotification = () => {
                if ("Notification" in window && Notification.permission === "granted") {
                    try {
                        const notification = new Notification("Pomodoro: Süre Doldu!", {
                            body: message,
                            icon: "/favicon.svg",
                        });
                        // Some browsers need a manual close or focus handling
                        notification.onclick = () => {
                            window.focus();
                            notification.close();
                        };
                    } catch (e) {
                        console.error("Desktop Notification failed", e);
                    }
                }
            };

            if (Notification.permission === "granted") {
                sendNotification();
            } else if (Notification.permission === "default") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") sendNotification();
                });
            } else if (Notification.permission === "denied") {
                // Bilgilendirme ekleyelim
                toast.error("Masaüstü bildirimleri tarayıcı tarafından engellenmiş! Lütfen adres çubuğundaki kilit simgesinden izin verin.", {
                    id: "notification-denied-error"
                });
            }

            playNotificationSound();
        }
    }, [
        timeLeft, isActive, isBreak, sessionId, userId, selectedCourse, 
        timeline, originalStartTime, startTime
    ]);

    // 5. Beacon (Safety Save)
    useEffect(() => {
        const handleUnload = () => {
            if (userId && sessionId && selectedCourse && timeline.length > 0) {
                const { totalWork, totalBreak, totalPause } = calculateSessionTotals(timeline);
                const payload = {
                    id: sessionId,
                    user_id: userId,
                    course_id: selectedCourse.id,
                    course_name: selectedCourse.name,
                    timeline: timeline,
                    started_at: new Date(originalStartTime || startTime || Date.now()).toISOString(),
                    ended_at: new Date().toISOString(),
                    total_work_time: totalWork,
                    total_break_time: totalBreak,
                    total_pause_time: totalPause,
                    is_completed: false
                };

                const supabaseUrl = env.supabase.url;
                const supabaseKey = env.supabase.anonKey;

                fetch(`${supabaseUrl}/rest/v1/pomodoro_sessions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${session?.access_token || supabaseKey}`,
                        'Prefer': 'resolution=merge-duplicates'
                    },
                    body: JSON.stringify(payload),
                    keepalive: true
                }).catch(err => console.error("Beacon Error:", err));
            }
        };

        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [userId, sessionId, selectedCourse, timeline, startTime, originalStartTime, session]);

    return null;
}
