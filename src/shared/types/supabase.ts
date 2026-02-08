export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      ai_generation_logs: {
        Row: {
          cached_tokens: number | null;
          completion_tokens: number | null;
          created_at: string | null;
          error_message: string | null;
          id: string;
          latency_ms: number | null;
          model: string;
          prompt_tokens: number | null;
          provider: string;
          status: number | null;
          total_tokens: number | null;
          usage_type: string | null;
          user_id: string;
        };
        Insert: {
          cached_tokens?: number | null;
          completion_tokens?: number | null;
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          latency_ms?: number | null;
          model: string;
          prompt_tokens?: number | null;
          provider: string;
          status?: number | null;
          total_tokens?: number | null;
          usage_type?: string | null;
          user_id: string;
        };
        Update: {
          cached_tokens?: number | null;
          completion_tokens?: number | null;
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          latency_ms?: number | null;
          model?: string;
          prompt_tokens?: number | null;
          provider?: string;
          status?: number | null;
          total_tokens?: number | null;
          usage_type?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          created_at: string | null;
          id: string;
          name: string;
          slug: string;
          sort_order: number | null;
          total_hours: number | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          name: string;
          slug: string;
          sort_order?: number | null;
          total_hours?: number | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number | null;
          total_hours?: number | null;
        };
        Relationships: [];
      };
      chunk_mastery: {
        Row: {
          chunk_id: string;
          course_id: string;
          created_at: string | null;
          id: string;
          last_full_review_at: string | null;
          last_reviewed_session: number | null;
          mastery_score: number;
          total_questions_seen: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          chunk_id: string;
          course_id: string;
          created_at?: string | null;
          id?: string;
          last_full_review_at?: string | null;
          last_reviewed_session?: number | null;
          mastery_score?: number;
          total_questions_seen?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          chunk_id?: string;
          course_id?: string;
          created_at?: string | null;
          id?: string;
          last_full_review_at?: string | null;
          last_reviewed_session?: number | null;
          mastery_score?: number;
          total_questions_seen?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chunk_mastery_chunk_id_fkey";
            columns: ["chunk_id"];
            isOneToOne: false;
            referencedRelation: "note_chunks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chunk_mastery_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chunk_mastery_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      course_session_counters: {
        Row: {
          course_id: string;
          created_at: string | null;
          current_session: number | null;
          id: string;
          last_session_date: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          course_id: string;
          created_at?: string | null;
          current_session?: number | null;
          id?: string;
          last_session_date?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          course_id?: string;
          created_at?: string | null;
          current_session?: number | null;
          id?: string;
          last_session_date?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_session_counters_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_session_counters_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          category_id: string | null;
          course_slug: string;
          created_at: string | null;
          id: string;
          instructor: string | null;
          name: string;
          playlist_url: string | null;
          sort_order: number | null;
          total_hours: number | null;
          total_videos: number | null;
        };
        Insert: {
          category_id?: string | null;
          course_slug: string;
          created_at?: string | null;
          id?: string;
          instructor?: string | null;
          name: string;
          playlist_url?: string | null;
          sort_order?: number | null;
          total_hours?: number | null;
          total_videos?: number | null;
        };
        Update: {
          category_id?: string | null;
          course_slug?: string;
          created_at?: string | null;
          id?: string;
          instructor?: string | null;
          name?: string;
          playlist_url?: string | null;
          sort_order?: number | null;
          total_hours?: number | null;
          total_videos?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "Course_categoryId_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      note_chunks: {
        Row: {
          chunk_order: number;
          content: string;
          course_id: string;
          course_name: string;
          created_at: string | null;
          density_score: number | null;
          display_content: string | null;
          id: string;
          last_synced_at: string | null;
          meaningful_word_count: number | null;
          metadata: Json | null;
          section_title: string;
          sequence_order: number;
          status: Database["public"]["Enums"]["chunk_generation_status"] | null;
          target_count: number | null;
          word_count: number | null;
        };
        Insert: {
          chunk_order: number;
          content: string;
          course_id: string;
          course_name: string;
          created_at?: string | null;
          density_score?: number | null;
          display_content?: string | null;
          id?: string;
          last_synced_at?: string | null;
          meaningful_word_count?: number | null;
          metadata?: Json | null;
          section_title: string;
          sequence_order?: number;
          status?:
            | Database["public"]["Enums"]["chunk_generation_status"]
            | null;
          target_count?: number | null;
          word_count?: number | null;
        };
        Update: {
          chunk_order?: number;
          content?: string;
          course_id?: string;
          course_name?: string;
          created_at?: string | null;
          density_score?: number | null;
          display_content?: string | null;
          id?: string;
          last_synced_at?: string | null;
          meaningful_word_count?: number | null;
          metadata?: Json | null;
          section_title?: string;
          sequence_order?: number;
          status?:
            | Database["public"]["Enums"]["chunk_generation_status"]
            | null;
          target_count?: number | null;
          word_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "note_chunks_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      pomodoro_sessions: {
        Row: {
          course_id: string | null;
          course_name: string | null;
          created_at: string | null;
          efficiency_score: number | null;
          ended_at: string;
          id: string;
          is_completed: boolean | null;
          last_active_at: string | null;
          pause_count: number | null;
          started_at: string;
          timeline: Json | null;
          total_break_time: number | null;
          total_pause_time: number | null;
          total_work_time: number | null;
          user_id: string | null;
        };
        Insert: {
          course_id?: string | null;
          course_name?: string | null;
          created_at?: string | null;
          efficiency_score?: number | null;
          ended_at: string;
          id?: string;
          is_completed?: boolean | null;
          last_active_at?: string | null;
          pause_count?: number | null;
          started_at: string;
          timeline?: Json | null;
          total_break_time?: number | null;
          total_pause_time?: number | null;
          total_work_time?: number | null;
          user_id?: string | null;
        };
        Update: {
          course_id?: string | null;
          course_name?: string | null;
          created_at?: string | null;
          efficiency_score?: number | null;
          ended_at?: string;
          id?: string;
          is_completed?: boolean | null;
          last_active_at?: string | null;
          pause_count?: number | null;
          started_at?: string;
          timeline?: Json | null;
          total_break_time?: number | null;
          total_pause_time?: number | null;
          total_work_time?: number | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "PomodoroSession_courseId_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      questions: {
        Row: {
          bloom_level: Database["public"]["Enums"]["bloom_level"] | null;
          chunk_id: string | null;
          concept_title: string | null;
          course_id: string;
          created_at: string | null;
          created_by: string | null;
          evidence: string | null;
          id: string;
          parent_question_id: string | null;
          question_data: Json;
          section_title: string;
          usage_type: Database["public"]["Enums"]["question_usage_type"] | null;
        };
        Insert: {
          bloom_level?: Database["public"]["Enums"]["bloom_level"] | null;
          chunk_id?: string | null;
          concept_title?: string | null;
          course_id: string;
          created_at?: string | null;
          created_by?: string | null;
          evidence?: string | null;
          id?: string;
          parent_question_id?: string | null;
          question_data: Json;
          section_title: string;
          usage_type?:
            | Database["public"]["Enums"]["question_usage_type"]
            | null;
        };
        Update: {
          bloom_level?: Database["public"]["Enums"]["bloom_level"] | null;
          chunk_id?: string | null;
          concept_title?: string | null;
          course_id?: string;
          created_at?: string | null;
          created_by?: string | null;
          evidence?: string | null;
          id?: string;
          parent_question_id?: string | null;
          question_data?: Json;
          section_title?: string;
          usage_type?:
            | Database["public"]["Enums"]["question_usage_type"]
            | null;
        };
        Relationships: [
          {
            foreignKeyName: "questions_chunk_id_fkey";
            columns: ["chunk_id"];
            isOneToOne: false;
            referencedRelation: "note_chunks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_parent_question_id_fkey";
            columns: ["parent_question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      subject_guidelines: {
        Row: {
          bad_few_shot_example: Json | null;
          created_at: string | null;
          few_shot_example: Json;
          id: string;
          instruction: string;
          subject_code: string | null;
          subject_name: string;
          updated_at: string | null;
        };
        Insert: {
          bad_few_shot_example?: Json | null;
          created_at?: string | null;
          few_shot_example: Json;
          id?: string;
          instruction: string;
          subject_code?: string | null;
          subject_name: string;
          updated_at?: string | null;
        };
        Update: {
          bad_few_shot_example?: Json | null;
          created_at?: string | null;
          few_shot_example?: Json;
          id?: string;
          instruction?: string;
          subject_code?: string | null;
          subject_name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_achievements: {
        Row: {
          achievement_id: string;
          is_celebrated: boolean | null;
          unlocked_at: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          achievement_id: string;
          is_celebrated?: boolean | null;
          unlocked_at?: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          achievement_id?: string;
          is_celebrated?: boolean | null;
          unlocked_at?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_question_status: {
        Row: {
          consecutive_fails: number | null;
          consecutive_success: number | null;
          id: string;
          next_review_at: string | null;
          next_review_session: number | null;
          question_id: string;
          status: Database["public"]["Enums"]["question_status"];
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          consecutive_fails?: number | null;
          consecutive_success?: number | null;
          id?: string;
          next_review_at?: string | null;
          next_review_session?: number | null;
          question_id: string;
          status?: Database["public"]["Enums"]["question_status"];
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          consecutive_fails?: number | null;
          consecutive_success?: number | null;
          id?: string;
          next_review_at?: string | null;
          next_review_session?: number | null;
          question_id?: string;
          status?: Database["public"]["Enums"]["question_status"];
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_question_status_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      user_quiz_progress: {
        Row: {
          ai_diagnosis: string | null;
          ai_insight: string | null;
          answered_at: string | null;
          chunk_id: string | null;
          course_id: string;
          id: string;
          is_review_question: boolean | null;
          question_id: string;
          response_type: Database["public"]["Enums"]["quiz_response_type"];
          selected_answer: number | null;
          session_number: number;
          time_spent_ms: number | null;
          user_id: string;
        };
        Insert: {
          ai_diagnosis?: string | null;
          ai_insight?: string | null;
          answered_at?: string | null;
          chunk_id?: string | null;
          course_id: string;
          id?: string;
          is_review_question?: boolean | null;
          question_id: string;
          response_type: Database["public"]["Enums"]["quiz_response_type"];
          selected_answer?: number | null;
          session_number: number;
          time_spent_ms?: number | null;
          user_id: string;
        };
        Update: {
          ai_diagnosis?: string | null;
          ai_insight?: string | null;
          answered_at?: string | null;
          chunk_id?: string | null;
          course_id?: string;
          id?: string;
          is_review_question?: boolean | null;
          question_id?: string;
          response_type?: Database["public"]["Enums"]["quiz_response_type"];
          selected_answer?: number | null;
          session_number?: number;
          time_spent_ms?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_quiz_progress_chunk_id_fkey";
            columns: ["chunk_id"];
            isOneToOne: false;
            referencedRelation: "note_chunks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_quiz_progress_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_quiz_progress_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_quiz_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          updated_at: string | null;
          username: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id: string;
          updated_at?: string | null;
          username?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          updated_at?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };
      video_progress: {
        Row: {
          completed: boolean | null;
          completed_at: string | null;
          id: string;
          updated_at: string | null;
          user_id: string | null;
          video_id: string | null;
        };
        Insert: {
          completed?: boolean | null;
          completed_at?: string | null;
          id?: string;
          updated_at?: string | null;
          user_id?: string | null;
          video_id?: string | null;
        };
        Update: {
          completed?: boolean | null;
          completed_at?: string | null;
          id?: string;
          updated_at?: string | null;
          user_id?: string | null;
          video_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "VideoProgress_videoId_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "videos";
            referencedColumns: ["id"];
          },
        ];
      };
      videos: {
        Row: {
          course_id: string | null;
          created_at: string | null;
          duration: string;
          duration_minutes: number | null;
          id: string;
          title: string;
          video_number: number;
        };
        Insert: {
          course_id?: string | null;
          created_at?: string | null;
          duration: string;
          duration_minutes?: number | null;
          id?: string;
          title: string;
          video_number: number;
        };
        Update: {
          course_id?: string | null;
          created_at?: string | null;
          duration?: string;
          duration_minutes?: number | null;
          id?: string;
          title?: string;
          video_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "Video_courseId_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      exchange_rates: {
        Row: {
          currency_pair: string;
          rate: number;
          updated_at: string;
        };
        Insert: {
          currency_pair: string;
          rate: number;
          updated_at?: string;
        };
        Update: {
          currency_pair?: string;
          rate?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      ai_generation_costs: {
        Row: {
          cached_tokens: number | null;
          completion_tokens: number | null;
          cost_usd: number | null;
          created_at: string | null;
          id: string | null;
          model: string | null;
          prompt_tokens: number | null;
          provider: string | null;
          total_tokens: number | null;
          usage_type: string | null;
          user_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_course_content_version: {
        Args: { p_course_id: string };
        Returns: string;
      };
      get_email_by_username: {
        Args: { username_input: string };
        Returns: string;
      };
      increment_course_session: {
        Args: { p_course_id: string; p_user_id: string };
        Returns: {
          current_session: number;
          is_new_session: boolean;
        }[];
      };
    };
    Enums: {
      bloom_level: "knowledge" | "application" | "analysis";
      chunk_generation_status:
        | "DRAFT"
        | "PENDING"
        | "PROCESSING"
        | "COMPLETED"
        | "FAILED"
        | "SYNCED";
      question_status: "active" | "archived" | "pending_followup";
      question_usage_type: "antrenman" | "arsiv" | "deneme";
      quiz_response_type: "correct" | "incorrect" | "blank";
      validation_status: "PENDING" | "APPROVED" | "REJECTED";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema =
  DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  } ? keyof (
      & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
        "Tables"
      ]
      & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
        "Views"
      ]
    )
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? (
    & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
      "Tables"
    ]
    & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
      "Views"
    ]
  )[TableName] extends {
    Row: infer R;
  } ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (
    & DefaultSchema["Tables"]
    & DefaultSchema["Views"]
  ) ? (
      & DefaultSchema["Tables"]
      & DefaultSchema["Views"]
    )[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    } ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  } ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
      "Tables"
    ]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
    "Tables"
  ][TableName] extends {
    Insert: infer I;
  } ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    } ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  } ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
      "Tables"
    ]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]][
    "Tables"
  ][TableName] extends {
    Update: infer U;
  } ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    } ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  } ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]][
      "Enums"
    ]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][
    EnumName
  ]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  } ? keyof DatabaseWithoutInternals[
      PublicCompositeTypeNameOrOptions["schema"]
    ]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]][
    "CompositeTypes"
  ][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {
      bloom_level: ["knowledge", "application", "analysis"],
      chunk_generation_status: [
        "DRAFT",
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "SYNCED",
      ],
      question_status: ["active", "archived", "pending_followup"],
      question_usage_type: ["antrenman", "arsiv", "deneme"],
      quiz_response_type: ["correct", "incorrect", "blank"],
      validation_status: ["PENDING", "APPROVED", "REJECTED"],
    },
  },
} as const;
