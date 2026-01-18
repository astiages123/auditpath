export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
          total_hours: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
          total_hours?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
          total_hours?: number | null
        }
        Relationships: []
      }
      chunk_mastery: {
        Row: {
          chunk_id: string
          course_id: string
          created_at: string | null
          id: string
          last_reviewed_session: number | null
          mastery_score: number
          total_questions_seen: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chunk_id: string
          course_id: string
          created_at?: string | null
          id?: string
          last_reviewed_session?: number | null
          mastery_score?: number
          total_questions_seen?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chunk_id?: string
          course_id?: string
          created_at?: string | null
          id?: string
          last_reviewed_session?: number | null
          mastery_score?: number
          total_questions_seen?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chunk_mastery_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "note_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chunk_mastery_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chunk_mastery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      course_session_counters: {
        Row: {
          course_id: string
          created_at: string | null
          current_session: number | null
          id: string
          last_session_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          current_session?: number | null
          id?: string
          last_session_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          current_session?: number | null
          id?: string
          last_session_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_session_counters_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_session_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category_id: string | null
          course_slug: string
          created_at: string | null
          id: string
          last_hash: string | null
          lesson_type: string
          name: string
          playlist_url: string | null
          sort_order: number | null
          total_hours: number | null
          total_videos: number | null
        }
        Insert: {
          category_id?: string | null
          course_slug: string
          created_at?: string | null
          id?: string
          last_hash?: string | null
          lesson_type: string
          name: string
          playlist_url?: string | null
          sort_order?: number | null
          total_hours?: number | null
          total_videos?: number | null
        }
        Update: {
          category_id?: string | null
          course_slug?: string
          created_at?: string | null
          id?: string
          last_hash?: string | null
          lesson_type?: string
          name?: string
          playlist_url?: string | null
          sort_order?: number | null
          total_hours?: number | null
          total_videos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "Course_categoryId_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      note_chunks: {
        Row: {
          char_count: number | null
          checksum: string | null
          chunk_order: number
          content: string
          course_id: string
          course_name: string
          created_at: string | null
          id: string
          metadata: Json | null
          parent_h1_id: string | null
          parent_h2_id: string | null
          section_title: string
          word_count: number | null
        }
        Insert: {
          char_count?: number | null
          checksum?: string | null
          chunk_order: number
          content: string
          course_id: string
          course_name: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          parent_h1_id?: string | null
          parent_h2_id?: string | null
          section_title: string
          word_count?: number | null
        }
        Update: {
          char_count?: number | null
          checksum?: string | null
          chunk_order?: number
          content?: string
          course_id?: string
          course_name?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          parent_h1_id?: string | null
          parent_h2_id?: string | null
          section_title?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "note_chunks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      pomodoro_sessions: {
        Row: {
          course_id: string | null
          course_name: string | null
          created_at: string | null
          ended_at: string
          id: string
          started_at: string
          timeline: Json | null
          total_break_time: number | null
          total_pause_time: number | null
          total_work_time: number | null
          user_id: string | null
        }
        Insert: {
          course_id?: string | null
          course_name?: string | null
          created_at?: string | null
          ended_at: string
          id?: string
          started_at: string
          timeline?: Json | null
          total_break_time?: number | null
          total_pause_time?: number | null
          total_work_time?: number | null
          user_id?: string | null
        }
        Update: {
          course_id?: string | null
          course_name?: string | null
          created_at?: string | null
          ended_at?: string
          id?: string
          started_at?: string
          timeline?: Json | null
          total_break_time?: number | null
          total_pause_time?: number | null
          total_work_time?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "PomodoroSession_courseId_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          bloom_level: Database["public"]["Enums"]["bloom_level"] | null
          chunk_id: string | null
          course_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_global: boolean | null
          parent_question_id: string | null
          quality_score: number | null
          question_data: Json
          section_title: string
          sequence_index: number | null
          usage_type: Database["public"]["Enums"]["question_usage_type"] | null
          validation_status:
            | Database["public"]["Enums"]["validation_status"]
            | null
          validator_feedback: string | null
        }
        Insert: {
          bloom_level?: Database["public"]["Enums"]["bloom_level"] | null
          chunk_id?: string | null
          course_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          parent_question_id?: string | null
          quality_score?: number | null
          question_data: Json
          section_title: string
          sequence_index?: number | null
          usage_type?: Database["public"]["Enums"]["question_usage_type"] | null
          validation_status?:
            | Database["public"]["Enums"]["validation_status"]
            | null
          validator_feedback?: string | null
        }
        Update: {
          bloom_level?: Database["public"]["Enums"]["bloom_level"] | null
          chunk_id?: string | null
          course_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          parent_question_id?: string | null
          quality_score?: number | null
          question_data?: Json
          section_title?: string
          sequence_index?: number | null
          usage_type?: Database["public"]["Enums"]["question_usage_type"] | null
          validation_status?:
            | Database["public"]["Enums"]["validation_status"]
            | null
          validator_feedback?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "note_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_parent_question_id_fkey"
            columns: ["parent_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_guidelines: {
        Row: {
          created_at: string | null
          few_shot_example: Json
          id: string
          instruction: string
          subject_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          few_shot_example: Json
          id?: string
          instruction: string
          subject_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          few_shot_example?: Json
          id?: string
          instruction?: string
          subject_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          is_celebrated: boolean | null
          unlocked_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          is_celebrated?: boolean | null
          unlocked_at?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          is_celebrated?: boolean | null
          unlocked_at?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_question_status: {
        Row: {
          id: string
          question_id: string
          status: Database["public"]["Enums"]["question_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          question_id: string
          status?: Database["public"]["Enums"]["question_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          question_id?: string
          status?: Database["public"]["Enums"]["question_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_question_status_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quiz_progress: {
        Row: {
          answered_at: string | null
          chunk_id: string | null
          course_id: string
          id: string
          is_review_question: boolean | null
          question_id: string
          response_type: Database["public"]["Enums"]["quiz_response_type"]
          selected_answer: number | null
          session_number: number
          time_spent_ms: number | null
          user_id: string
        }
        Insert: {
          answered_at?: string | null
          chunk_id?: string | null
          course_id: string
          id?: string
          is_review_question?: boolean | null
          question_id: string
          response_type: Database["public"]["Enums"]["quiz_response_type"]
          selected_answer?: number | null
          session_number: number
          time_spent_ms?: number | null
          user_id: string
        }
        Update: {
          answered_at?: string | null
          chunk_id?: string | null
          course_id?: string
          id?: string
          is_review_question?: boolean | null
          question_id?: string
          response_type?: Database["public"]["Enums"]["quiz_response_type"]
          selected_answer?: number | null
          session_number?: number
          time_spent_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quiz_progress_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "note_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quiz_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quiz_progress_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quiz_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          daily_generation_count: number | null
          email: string
          id: string
          last_generation_date: string | null
          last_synced_at: string | null
          title: string | null
          updated_at: string | null
          xp: number | null
        }
        Insert: {
          created_at?: string
          daily_generation_count?: number | null
          email: string
          id: string
          last_generation_date?: string | null
          last_synced_at?: string | null
          title?: string | null
          updated_at?: string | null
          xp?: number | null
        }
        Update: {
          created_at?: string
          daily_generation_count?: number | null
          email?: string
          id?: string
          last_generation_date?: string | null
          last_synced_at?: string | null
          title?: string | null
          updated_at?: string | null
          xp?: number | null
        }
        Relationships: []
      }
      video_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          id: string
          updated_at: string | null
          user_id: string | null
          video_id: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "VideoProgress_videoId_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          course_id: string | null
          created_at: string | null
          duration: string
          duration_minutes: number | null
          id: string
          title: string
          video_number: number
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          duration: string
          duration_minutes?: number | null
          id?: string
          title: string
          video_number: number
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          duration?: string
          duration_minutes?: number | null
          id?: string
          title?: string
          video_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "Video_courseId_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_schedule: {
        Row: {
          created_at: string | null
          id: string
          match_days: number[]
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_days: number[]
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          match_days?: number[]
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_schedule_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_course_session: {
        Args: { p_course_id: string; p_user_id: string }
        Returns: {
          current_session: number
          is_new_session: boolean
        }[]
      }
    }
    Enums: {
      bloom_level: "knowledge" | "application" | "analysis"
      question_status: "active" | "archived" | "pending_followup"
      question_usage_type: "antrenman" | "arsiv" | "deneme"
      quiz_response_type: "correct" | "incorrect" | "blank"
      validation_status: "PENDING" | "APPROVED" | "REJECTED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      bloom_level: ["knowledge", "application", "analysis"],
      question_status: ["active", "archived", "pending_followup"],
      question_usage_type: ["antrenman", "arsiv", "deneme"],
      quiz_response_type: ["correct", "incorrect", "blank"],
      validation_status: ["PENDING", "APPROVED", "REJECTED"],
    },
  },
} as const
