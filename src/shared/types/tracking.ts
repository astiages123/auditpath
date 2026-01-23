export type SRStage = 0 | 1 | 2 | 3 | 4;

export interface TopicProgress {
  id: string;
  user_id: string;
  topic_id: string; // Refers to the pillar or sub-topic name/ID
  course_id: string; // Foreign key to courses
  mastery_level: number; // 0-100 probably, or linked to SRStage
  sr_stage: SRStage; // 0=New, 1=1d, 2=3d, 3=10d, 4=30d, 5=50d(Graduate)
  next_review_date: string; // ISO Date string
  last_reviewed_date: string; // ISO Date string
  is_cursed: boolean;
  streak_count: number; // Consecutive correct answers
  total_questions_answered: number;
  created_at?: string;
  updated_at?: string;
}

export interface QuizStats {
  id: string;
  user_id: string;
  quiz_id?: string; // Optional if we just track single question interactions not grouped by a 'Quiz' entity
  question_id: string;
  is_correct: boolean;
  confidence_level: 'LOW' | 'MEDIUM' | 'HIGH'; // 🔴, 🟡, 🟢
  response_time_ms: number;
  created_at: string;
}

export type QuizResponse = 'FAIL' | 'DOUBT' | 'SUCCESS'; // 🔴, 🟡, 🟢

export interface LearningEngineParams {
  userId: string;
  courseId: string;
  topicId: string; // The specific concept/pillar
  questionId: string;
  result: QuizResponse;
  isVaka?: boolean; // Is this a case study question? (For Fast Travel)
}
