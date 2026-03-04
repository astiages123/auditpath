// ===========================
// === IMPORTS ===
// ===========================

import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useProgress } from '@/shared/hooks/useProgress';
import {
  toggleItemProgress,
  toggleItemProgressBatch,
} from '../services/videoService';

// ===========================
// === INTERFACES ===
// ===========================

export interface CourseItemActionState {
  completed: boolean;
  itemNumber: number;
  durationMinutes: number;
}

// ===========================
// === HOOK ===
// ===========================

/**
 * Hook for managing course item interaction and states like progressive completion.
 * Handles both single item and batch operations optimally.
 *
 * @param courseId - Identifying slug or ID of course context
 * @param dbCourseId - Real tracking database course ID
 * @returns Hook functionality mapping to be consumed by components
 */
export function useCourseItemActions(
  courseId: string,
  dbCourseId: string
): {
  handleToggleItem: (
    items: CourseItemActionState[],
    targetItemNumber: number,
    isModifierPressed: boolean
  ) => Promise<CourseItemActionState[]>;
} {
  const { user } = useAuth();
  const { updateProgressOptimistically, refreshProgress } = useProgress();

  const handleToggleItem = async (
    items: CourseItemActionState[],
    targetItemNumber: number,
    isModifierPressed: boolean
  ): Promise<CourseItemActionState[]> => {
    const targetItem = items.find((v) => v.itemNumber === targetItemNumber);
    if (!targetItem) return items;

    const newCompleted = !targetItem.completed;
    const previousItems = [...items];

    // 1. Calculate new state (Optimistic)
    let updatedItems = [...items];
    let itemIdListToUpdate: string[] = [];

    if (isModifierPressed) {
      // Toggle only specific item
      updatedItems = updatedItems.map((v) =>
        v.itemNumber === targetItemNumber
          ? { ...v, completed: newCompleted }
          : v
      );
      itemIdListToUpdate = [targetItemNumber.toString()];
    } else {
      // Recursive/Batch logic
      if (newCompleted) {
        // Complete all previous
        updatedItems = updatedItems.map((v) =>
          v.itemNumber <= targetItemNumber ? { ...v, completed: true } : v
        );
        itemIdListToUpdate = items
          .filter((v) => v.itemNumber <= targetItemNumber && !v.completed)
          .map((v) => v.itemNumber.toString());
      } else {
        // Uncomplete all next
        updatedItems = updatedItems.map((v) =>
          v.itemNumber >= targetItemNumber ? { ...v, completed: false } : v
        );
        itemIdListToUpdate = items
          .filter((v) => v.itemNumber >= targetItemNumber && v.completed)
          .map((v) => v.itemNumber.toString());
      }
    }

    // 2. Calculate Stats Changes
    let newlyCompletedCount = 0;
    let newlyRemovedCount = 0;
    let deltaMinutes = 0;

    updatedItems.forEach((v) => {
      const oldV = previousItems.find((pv) => pv.itemNumber === v.itemNumber);
      if (!oldV) return;

      if (v.completed && !oldV.completed) {
        newlyCompletedCount++;
        deltaMinutes += v.durationMinutes;
      }
      if (!v.completed && oldV.completed) {
        newlyRemovedCount++;
        deltaMinutes -= v.durationMinutes;
      }
    });

    const deltaItems = newlyCompletedCount - newlyRemovedCount;
    const deltaHours = deltaMinutes / 60;

    // 3. Optimistic Update in Progress Context
    updateProgressOptimistically(courseId, deltaItems, deltaHours);

    // 4. Server Sync
    const userId = user?.id;
    try {
      if (!userId) {
        toast.error('İlerleme durumunun kaydedilmesi için giriş yapmalısınız.');
        throw new Error('User not logged in');
      }

      if (itemIdListToUpdate.length === 1) {
        const itemNum = parseInt(itemIdListToUpdate[0]);
        if (!Number.isNaN(itemNum)) {
          await toggleItemProgress(userId, dbCourseId, itemNum, newCompleted);
        }
      } else if (itemIdListToUpdate.length > 1) {
        const itemNumbers = itemIdListToUpdate
          .map((id) => parseInt(id))
          .filter((n) => !Number.isNaN(n));

        if (itemNumbers.length > 0) {
          await toggleItemProgressBatch(
            userId,
            dbCourseId,
            itemNumbers,
            newCompleted
          );
        }
      }

      // Background refresh to ensure consistency
      refreshProgress();

      return updatedItems;
    } catch (error) {
      console.error('[useCourseItemActions][handleToggleItem] Hata:', error);
      // Revert optimistic update
      updateProgressOptimistically(courseId, -deltaItems, -deltaHours);
      toast.error('İlerleme kaydedilemedi.');
      return previousItems;
    }
  };

  return { handleToggleItem };
}
