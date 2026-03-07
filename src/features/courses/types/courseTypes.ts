import type { Database } from '@/types/database.types';
import type { ConceptMapItem } from '@/features/quiz/types';
import type { Rank } from '@/types/auth';

export interface RankInfo extends Rank {
  threshold?: number;
}

/** Database enum for course types */
export type CourseType = Database['public']['Enums']['course_type_enum'];

/** Database enum for item types (e.g., video, reading) */
export type ItemType = Database['public']['Enums']['item_type_enum'];

/** Represents a single course record */
export type Course = Database['public']['Tables']['courses']['Row'];

/** Represents a single video record */
export type Video = Database['public']['Tables']['videos']['Row'];

/** Represents a category with its associated courses */
export type Category = Database['public']['Tables']['categories']['Row'] & {
  courses: Course[];
};

/** Represents a note chunk associated with a course, optionally including question count */
export type CourseTopic = Database['public']['Tables']['note_chunks']['Row'] & {
  questionCount?: number;
};

/** Statistics and details representing completion and quiz status of a topic */
export interface TopicCompletionStats {
  completed: boolean;
  antrenman: {
    solved: number;
    total: number;
    quota: number;
    existing: number;
  };
  deneme: {
    solved: number;
    total: number;
    quota: number;
    existing: number;
  };
  mistakes: {
    solved: number;
    total: number;
    existing: number;
  };
  importance?: 'high' | 'medium' | 'low';
  aiLogic?: {
    suggested_quotas?: {
      antrenman: number;
      deneme: number;
    };
  } | null;
  concepts?: ConceptMapItem[] | null;
  difficultyIndex?: number | null;
}

/** Summarized concept of a topic with its counts */
export interface TopicWithCounts {
  name: string;
  isCompleted: boolean;
  counts: {
    antrenman: number;
    deneme: number;
    total: number;
  };
}

/** Progress and mastery score indicators for a specific course */
export interface CourseMastery {
  courseId: string;
  courseName: string;
  courseType?: string;
  /** Representation of video progress as a percentage (0-100) */
  videoProgress: number;
  /** Representation of question progress as a percentage (0-100) */
  questionProgress: number;
  /** Calculated mastery score using video and question progresses */
  masteryScore: number;
}
