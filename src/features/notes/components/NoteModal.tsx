"use client";

import { useState, useEffect } from "react";
import { X, Maximize2, Minimize2, Loader2, AlertCircle } from "lucide-react";
import { useNotes } from "@/features/notes";
import { Button } from "@/shared/components/ui/button";
import { NoteViewer } from "./NoteViewer";
import { TableOfContents } from "./TableOfContents";

interface NoteModalProps {
    courseId: string;
    lessonName: string;
    isOpen: boolean;
    onClose: () => void;
}

export function NoteModal({ courseId, lessonName, isOpen, onClose }: NoteModalProps) {
    const { data: noteData, isLoading, error: queryError } = useNotes(courseId);
    const [content, setContent] = useState<string>("");
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Use key prop on parent to reset state when lesson changes, or just use prop directly if read-only
    // If editing is needed, initialize state from prop but better to use key to re-mount
    // For now, suppress warning as this is existing logic pattern
    useEffect(() => {
        if (noteData) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setContent(noteData.content);
        }
    }, [noteData]);

    const error = queryError ? (queryError as Error).message : "";

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (isFullscreen) {
                    setIsFullscreen(false);
                } else {
                    onClose();
                }
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [isOpen, isFullscreen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={`
                    relative bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden
                    flex flex-col transition-all duration-300
                    ${isFullscreen
                        ? 'fixed inset-4'
                        : 'w-[95vw] max-w-7xl h-[90vh]'
                    }
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-100">{lessonName}</h2>
                        {/* Removed duplicate/redundant lessonType/courseId display if not needed, or show ID */}
                        {/* <p className="text-sm text-zinc-500">{courseId}</p> */} 
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="text-zinc-400 hover:text-zinc-200"
                        >
                            {isFullscreen ? (
                                <Minimize2 className="h-5 w-5" />
                            ) : (
                                <Maximize2 className="h-5 w-5" />
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="text-zinc-400 hover:text-zinc-200"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                                <p className="text-zinc-400">Not yükleniyor...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4 text-center px-4">
                                <div className="p-4 rounded-2xl bg-red-500/10">
                                    <AlertCircle className="h-8 w-8 text-red-400" />
                                </div>
                                <div>
                                    <p className="text-zinc-200 font-medium">{error}</p>
                                    <p className="text-zinc-500 text-sm mt-1">
                                        İçerik Yönetimi sayfasından not yükleyebilirsiniz.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Sidebar - Table of Contents */}
                            <aside className="w-72 border-r border-zinc-800 overflow-y-auto shrink-0 hidden lg:block">
                                <div className="p-4 sticky top-0">
                                    <TableOfContents content={content} />
                                </div>
                            </aside>

                            {/* Main Content */}
                            <main className="flex-1 overflow-y-auto">
                                <div className="p-8 max-w-4xl mx-auto">
                                    <NoteViewer content={content} />
                                </div>
                            </main>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
