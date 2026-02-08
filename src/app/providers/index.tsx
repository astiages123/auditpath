"use client";

import { type ReactNode, type ComponentType } from "react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth';
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
});

interface ProviderComposerProps {
    providers: ComponentType<{ children: ReactNode }>[];
    children: ReactNode;
}

const ProviderComposer = ({ providers, children }: ProviderComposerProps) => {
    return providers.reduceRight(
        (kids, Provider) => <Provider>{kids}</Provider>, 
        children
    );
};

export function Providers({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            {/* Toaster is placed here to validly catch errors from inner providers if needed, 
                and to be available globally without being nested deep in the tree */}
            <Toaster position="top-center" richColors />
            
            <ProviderComposer
                providers={[
                    AuthProvider,
                    ProgressProvider,
                    CelebrationProvider,
                ]}
            >
                {children}
            </ProviderComposer>
        </QueryClientProvider>
    );
}
