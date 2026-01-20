import React from 'react';
import { Header } from '@/components/layout/Header';
import { Providers } from '@/components/providers';
import { PomodoroModal } from '@/components/pomodoro/PomodoroModal';
import { TimerController } from "../pomodoro/TimerController";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <Providers>
            <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1">{children}</main>
                <TimerController />
                <PomodoroModal />
            </div>
        </Providers>
    );
}
