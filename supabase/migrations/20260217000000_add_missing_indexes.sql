-- Add missing composite indexes for performance improvement
CREATE INDEX IF NOT EXISTS "idx_questions_course_section" ON "public"."questions" (course_id, section_title);
CREATE INDEX IF NOT EXISTS "idx_user_quiz_progress_user_course" ON "public"."user_quiz_progress" (user_id, course_id);
CREATE INDEX IF NOT EXISTS "idx_user_question_status_user_status" ON "public"."user_question_status" (user_id, status);
CREATE INDEX IF NOT EXISTS "idx_note_chunks_course_section" ON "public"."note_chunks" (course_id, section_title);
