"use client";

import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/features/auth'
import { Toaster } from "@/shared/components/ui/sonner";
import { ProgressProvider } from "./ProgressProvider";
import { CelebrationProvider } from "./CelebrationProvider";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
        },
    },
})

export function Providers({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <ProgressProvider>
                    <CelebrationProvider>
                        {children}
                        <Toaster position="top-center" richColors />
                    </CelebrationProvider>
                </ProgressProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}
