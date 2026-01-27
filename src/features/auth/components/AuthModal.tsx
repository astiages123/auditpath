"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/shared/components/ui/dialog";
import { AuthForms } from "./AuthForms";

interface AuthModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultView?: "signin" | "signup";
}

export function AuthModal({ open, onOpenChange, defaultView = "signin" }: AuthModalProps) {
    const [view, setView] = useState<"signin" | "signup">(defaultView);

    // Sync view with default if opened freshly (optional, but keep state local mostly)

    const toggleView = () => {
        setView(v => v === "signin" ? "signup" : "signin");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl p-6 gap-6">
                <DialogHeader className="space-y-3 items-center text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                        <img
                            src="/logo.svg"
                            alt="Logo"
                            className="w-8 h-8 object-contain"
                        />
                    </div>
                    <DialogTitle className="text-2xl font-bold tracking-tight">
                        {view === "signin" ? "Tekrar Hoşgeldiniz" : "Hesap Oluşturun"}
                    </DialogTitle>
                    <DialogDescription className="text-base text-muted-foreground max-w-[280px]">
                        {view === "signin"
                            ? "Devam etmek için giriş yapın."
                            : "Müfettişlik yolculuğunuza başlamak için kayıt olun."}
                    </DialogDescription>
                </DialogHeader>

                <AuthForms
                    view={view}
                    onToggleView={toggleView}
                    onSuccess={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}
