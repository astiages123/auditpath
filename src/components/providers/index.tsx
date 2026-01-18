"use client";

import { type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ProgressProvider } from "./ProgressProvider";
import { CelebrationProvider } from "./CelebrationProvider";

export function Providers({ children }: { children: ReactNode }) {
    return (
        <ProgressProvider>
            <CelebrationProvider>
                {children}
                <Toaster position="top-center" richColors />
            </CelebrationProvider>
        </ProgressProvider>
    );
}
