import { useEffect, useReducer } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseItem } from '@/features/courses/components/content/CourseItem';
import {
  useCourseItemActions,
  type CourseItemActionState,
} from '@/features/courses/hooks/useCourseItemActions';
import {
  getItemProgressByCourse,
  getItemsByCourseId,
  type DatabaseItem,
} from '@/features/courses/services/videoService';

export interface CourseItemListProps {
  courseSlug: string;
  courseId: string;
  categorySlug: string;
  _categoryColor?: string;
}

export interface StaticItem {
  id: string;
  itemNumber: number;
  title: string;
  duration: string;
  itemType: 'video' | 'reading';
}

export interface CourseItemState {
  items: CourseItemActionState[];
  staticItems: StaticItem[];
  loading: boolean;
}

export type CourseItemAction =
  | { type: 'START_LOADING' }
  | {
      type: 'SET_INITIAL_DATA';
      payload: { staticItems: StaticItem[]; items: CourseItemActionState[] };
    }
  | { type: 'SET_PROGRESS'; payload: CourseItemActionState[] }
  | { type: 'FINISH_LOADING' }
  | { type: 'UPDATE_ITEMS'; payload: CourseItemActionState[] };

const initialState: CourseItemState = {
  items: [],
  staticItems: [],
  loading: true,
};

function courseItemReducer(
  state: CourseItemState,
  action: CourseItemAction
): CourseItemState {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, loading: true };
    case 'SET_INITIAL_DATA':
      return {
        ...state,
        staticItems: action.payload.staticItems,
        items: action.payload.items,
      };
    case 'SET_PROGRESS':
      return { ...state, items: action.payload };
    case 'FINISH_LOADING':
      return { ...state, loading: false };
    case 'UPDATE_ITEMS':
      return { ...state, items: action.payload };
    default:
      return state;
  }
}

/**
 * Handles the loading and rendering of a course's items (videos or readings),
 * managing progress states and interactions.
 */
export function CourseItemList({
  courseSlug,
  courseId,
  categorySlug,
  _categoryColor,
}: CourseItemListProps) {
  const [state, dispatch] = useReducer(courseItemReducer, initialState);
  const { items, staticItems, loading } = state;

  const { user } = useAuth();
  const userId = user?.id;

  const { handleToggleItem } = useCourseItemActions(courseSlug, courseId);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      dispatch({ type: 'START_LOADING' });

      // 1. Load item data from DB
      const dbItems = await getItemsByCourseId(courseId);
      if (!dbItems || dbItems.length === 0) {
        if (isMounted) dispatch({ type: 'FINISH_LOADING' });
        return;
      }

      // Map static data from DB
      const initialItems = dbItems.map((databaseItem: DatabaseItem) => ({
        itemNumber: databaseItem.video_number,
        completed: false,
        durationMinutes: databaseItem.duration_minutes,
      }));

      const staticData = dbItems.map((databaseItem: DatabaseItem) => ({
        id: databaseItem.id,
        itemNumber: databaseItem.video_number,
        title: databaseItem.title,
        duration: databaseItem.duration,
        itemType: databaseItem.item_type,
      }));

      // Set initial state (not completed)
      if (isMounted) {
        dispatch({
          type: 'SET_INITIAL_DATA',
          payload: { staticItems: staticData, items: initialItems },
        });

        // 2. Fetch Progress (if logged in)
        if (userId) {
          try {
            const itemNumbers = initialItems.map((item) => item.itemNumber);
            const progressMap = await getItemProgressByCourse(
              userId,
              courseId,
              itemNumbers
            );

            if (isMounted) {
              const updatedWithProgress = initialItems.map((item) => ({
                ...item,
                completed: !!progressMap[item.itemNumber.toString()],
              }));
              dispatch({ type: 'SET_PROGRESS', payload: updatedWithProgress });
            }
          } catch {
            toast.error('İlerleme yüklenemedi');
          }
        }
        dispatch({ type: 'FINISH_LOADING' });
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [courseId, userId, categorySlug]);

  const onToggle = async (itemNumber: number, isModifierPressed: boolean) => {
    const updated = await handleToggleItem(
      items,
      itemNumber,
      isModifierPressed
    );
    dispatch({ type: 'UPDATE_ITEMS', payload: updated });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="grid gap-2">
        {(() => {
          if (loading) {
            // Skeleton Array
            return Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-zinc-900/20"
              >
                <Skeleton className="size-6 rounded-full" />
                <Skeleton className="h-4 w-[20px]" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="w-12 h-6 rounded-md" />
              </div>
            ));
          }

          if (staticItems.length === 0) {
            return (
              <div className="p-4 text-center text-muted-foreground text-sm">
                İçerik bulunamadı.
              </div>
            );
          }

          return staticItems.map((staticItem) => {
            const itemState = items.find(
              (v) => v.itemNumber === staticItem.itemNumber
            );
            return (
              <CourseItem
                key={staticItem.id}
                _id={staticItem.id}
                itemNumber={staticItem.itemNumber}
                title={staticItem.title}
                duration={staticItem.duration}
                itemType={staticItem.itemType}
                completed={itemState?.completed || false}
                onToggle={onToggle}
              />
            );
          });
        })()}
      </div>
    </div>
  );
}
