
import React, { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
// import { getNote, type Note } from "@/lib/notes"; // Removed
import { useNotes } from "@/hooks/useNotes";
import { NoteViewer } from "@/components/notes/NoteViewer";
import { TableOfContents } from "@/components/notes/TableOfContents";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotePage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    // Using TanStack Query hook
    const { data: note, isLoading: loading } = useNotes(slug || '');

    // Side effect for title can be kept or moved to a separate useEffect or inside the component render
    useEffect(() => {
        if (note && slug) {
            const formattedTitle = slug
                .split("-")
                .map((word) => word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1))
                .join(" ");
            document.title = `${formattedTitle} | AuditPath`;
        }
    }, [note, slug]);

    // Handle hash scrolling
    useEffect(() => {
        if (!loading && note && location.hash) {
            const id = decodeURIComponent(location.hash.substring(1));
            // Small timeout to ensure DOM is ready
            const timer = setTimeout(() => {
                const element = document.getElementById(id);
                if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [loading, note, location.hash]);

    const processedContent = React.useMemo(() => {
        const content = note?.content;
        if (!content) return "";
        return content.replace(/\\"/g, '"');
    }, [note]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!note) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4">
                <p className="text-muted-foreground">Not bulunamadı.</p>
                <Button variant="outline" onClick={() => navigate("/")}>
                    Ana sayfaya dön
                </Button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-background text-foreground overflow-hidden">
            <div className="note-layout-container h-full flex">
                {/* Sidebar - Table of Contents */}
                <aside className="note-sidebar hidden lg:block w-80 h-full overflow-y-auto border-r border-border bg-card p-4">
                    <div className="mb-4">
                        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="w-full justify-start pl-0">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Ana Sayfa
                        </Button>
                    </div>
                    <TableOfContents content={processedContent} />
                </aside>

                {/* Main Content Area */}
                <main className="note-main-content flex-1 h-full overflow-y-auto scroll-smooth p-4 md:p-8">
                    <div className="lg:hidden mb-4">
                        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Geri
                        </Button>
                    </div>
                    <article className="note-content-limit w-full max-w-none mx-auto">
                        <NoteViewer content={processedContent} courseId={note.courseId} />
                    </article>
                </main>
            </div>
        </div>
    );
}
