"use client";

const notificationAudio = typeof window !== "undefined"
    ? new Audio("/audio/alarm_ring.mp3")
    : null;

export const playNotificationSound = () => {
    if (!notificationAudio) return;
    try {
        notificationAudio.currentTime = 0;
        notificationAudio.play().catch((e) => {
            console.warn(
                "Audio play failed (waiting for user interaction):",
                e,
            );
        });
    } catch (e) {
        console.error("Audio initialization failed", e);
    }
};

/**
 * Browsers block audio in background unless unlocked by a user gesture.
 */
export const unlockAudio = () => {
    if (!notificationAudio) return;
    notificationAudio.play().then(() => {
        notificationAudio.pause();
        notificationAudio.currentTime = 0;
    }).catch(() => {
        // Safe to ignore, we are just warming it up
    });
};
