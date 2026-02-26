import { Database } from '@/types/database.types';
import { ConceptMapItem } from '@/features/quiz/types';

export type Course = Database['public']['Tables']['courses']['Row'];

export type Category = Database['public']['Tables']['categories']['Row'] & {
  courses: Course[];
};

export type CourseTopic = Database['public']['Tables']['note_chunks']['Row'] & {
  questionCount?: number;
};

export interface TopicCompletionStats {
  completed: boolean;
  antrenman: {
    solved: number;
    total: number;
    quota: number;
    existing: number;
  };
  deneme: { solved: number; total: number; quota: number; existing: number };
  mistakes: { solved: number; total: number; existing: number };
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

export interface TopicWithCounts {
  name: string;
  isCompleted: boolean;
  counts: {
    antrenman: number;
    deneme: number;
    total: number;
  };
}

export interface CourseMastery {
  courseId: string;
  courseName: string;
  videoProgress: number; // 0-100
  questionProgress: number; // 0-100
  masteryScore: number; // (video * 0.6) + (question * 0.4)
}
