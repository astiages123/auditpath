import React from 'react';
import { Header } from '@/shared/components/layout/Header';

import { PomodoroModal } from '@/features/pomodoro';
import { TimerController } from '@/features/pomodoro';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">{children}</main>
      <TimerController />
      <PomodoroModal />
    </div>
  );
}
