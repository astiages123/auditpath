import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useProgress } from '@/shared/hooks/useProgress';
import {
  toggleItemProgress,
  toggleItemProgressBatch,
} from '../services/videoService';
import { logger } from '@/utils/logger';

export interface CourseItemActionState {
  completed: boolean;
  itemNumber: number;
  durationMinutes: number;
}

/**
 * Hook for managing course item interaction and states like progressive completion.
 * Handles both single item and batch operations optimally.
 *
 * @param courseSlug - Public course slug used by progress state
 * @param courseId - Database course UUID used by persistence services
 * @returns Hook functionality mapping to be consumed by components
 */
export function useCourseItemActions(
  courseSlug: string,
  courseId: string
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
    const targetItem = items.find(
      (item) => item.itemNumber === targetItemNumber
    );
    if (!targetItem) return items;

    const newCompleted = !targetItem.completed;
    const previousItems = [...items];

    let updatedItems = [...items];
    let itemIdListToUpdate: string[] = [];

    if (isModifierPressed) {
      updatedItems = updatedItems.map((item) =>
        item.itemNumber === targetItemNumber
          ? { ...item, completed: newCompleted }
          : item
      );
      itemIdListToUpdate = [targetItemNumber.toString()];
    } else if (newCompleted) {
      updatedItems = updatedItems.map((item) =>
        item.itemNumber <= targetItemNumber
          ? { ...item, completed: true }
          : item
      );
      itemIdListToUpdate = items
        .filter(
          (item) => item.itemNumber <= targetItemNumber && !item.completed
        )
        .map((item) => item.itemNumber.toString());
    } else {
      updatedItems = updatedItems.map((item) =>
        item.itemNumber >= targetItemNumber
          ? { ...item, completed: false }
          : item
      );
      itemIdListToUpdate = items
        .filter((item) => item.itemNumber >= targetItemNumber && item.completed)
        .map((item) => item.itemNumber.toString());
    }

    let newlyCompletedCount = 0;
    let newlyRemovedCount = 0;
    let deltaMinutes = 0;

    updatedItems.forEach((item) => {
      const previousItem = previousItems.find(
        (candidateItem) => candidateItem.itemNumber === item.itemNumber
      );
      if (!previousItem) return;

      if (item.completed && !previousItem.completed) {
        newlyCompletedCount++;
        deltaMinutes += item.durationMinutes;
      }

      if (!item.completed && previousItem.completed) {
        newlyRemovedCount++;
        deltaMinutes -= item.durationMinutes;
      }
    });

    const deltaItems = newlyCompletedCount - newlyRemovedCount;
    const deltaHours = deltaMinutes / 60;

    updateProgressOptimistically(courseSlug, deltaItems, deltaHours);

    const userId = user?.id;

    try {
      if (!userId) {
        toast.error('İlerleme durumunun kaydedilmesi için giriş yapmalısınız.');
        throw new Error('User not logged in');
      }

      if (itemIdListToUpdate.length === 1) {
        const itemNumber = parseInt(itemIdListToUpdate[0]);
        if (!Number.isNaN(itemNumber)) {
          await toggleItemProgress(userId, courseId, itemNumber, newCompleted);
        }
      } else if (itemIdListToUpdate.length > 1) {
        const itemNumbers = itemIdListToUpdate
          .map((itemId) => parseInt(itemId))
          .filter((itemNumber) => !Number.isNaN(itemNumber));

        if (itemNumbers.length > 0) {
          await toggleItemProgressBatch(
            userId,
            courseId,
            itemNumbers,
            newCompleted
          );
        }
      }

      refreshProgress();
      return updatedItems;
    } catch (caughtError) {
      logger.error(
        'useCourseItemActions',
        'handleToggleItem',
        'İlerleme kaydedilemedi',
        caughtError as Error
      );
      updateProgressOptimistically(courseSlug, -deltaItems, -deltaHours);
      toast.error('İlerleme kaydedilemedi.');
      return previousItems;
    }
  };

  return { handleToggleItem };
}
