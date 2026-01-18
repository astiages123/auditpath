"use client";

import React, { useCallback } from "react";
// useLocation import removed
import { useAuth } from "@/hooks/useAuth";
import { useCelebration } from "@/hooks/useCelebration";
import { useCelebrationStore } from "@/store/celebration-store";

import { CelebrationModal } from "@/components/ui/CelebrationModal";

export function CelebrationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  // location unused variable removed
  
  // Initialize the hook which polls/checks DB
  useCelebration(); 

  const { current, isOpen, close } = useCelebrationStore();

  const handleComplete = useCallback(() => {
    close(); // Closes current
    // Small delay before next to allow exit animation?
    // The store's "close" calls "next" immediately or we can handle it here.
    // Our store logic for close() calls next().
  }, [close]);

  // If user is on achievements page, maybe we suppress "stamp" types? 
  // Requirement says: "A celebration ... should be shown". 
  // Existing code suppressed it: `pathname !== "/achievements"`.
  // Let's keep that logic for safety if desired, or maybe users want to see it pop up.
  // The Prompt says: "Queue... sequentially".
  
  return (
    <>
      {children}
      {user && current && isOpen && (
          <CelebrationModal 
            isOpen={isOpen}
            onClose={handleComplete}
            title={current.title}
            description={current.description}
            subtitle={current.subtitle}
            icon={current.icon}
            imageUrl={current.imageUrl}
            variant={current.variant === 'group' ? 'course' : current.variant}
          />
      )}
    </>
  );
}
