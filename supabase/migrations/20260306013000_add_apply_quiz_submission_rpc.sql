CREATE OR REPLACE FUNCTION public.apply_quiz_submission(
  p_user_id uuid,
  p_question_id uuid,
  p_chunk_id uuid,
  p_course_id uuid,
  p_response_type public.quiz_response_type,
  p_selected_answer integer,
  p_session_number integer,
  p_is_review_question boolean,
  p_time_spent_ms integer,
  p_status public.question_status,
  p_rep_count integer,
  p_next_review_session integer,
  p_mastery_score integer DEFAULT NULL,
  p_total_questions_seen integer DEFAULT NULL,
  p_last_reviewed_session integer DEFAULT NULL,
  p_updated_at timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(progress_id uuid)
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_progress_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized quiz submission for user %', p_user_id;
  END IF;

  INSERT INTO public.user_question_status (
    user_id,
    question_id,
    status,
    rep_count,
    next_review_session
  )
  VALUES (
    p_user_id,
    p_question_id,
    p_status,
    p_rep_count,
    p_next_review_session
  )
  ON CONFLICT (user_id, question_id) DO UPDATE
  SET
    status = EXCLUDED.status,
    rep_count = EXCLUDED.rep_count,
    next_review_session = EXCLUDED.next_review_session,
    updated_at = timezone('utc'::text, now());

  INSERT INTO public.user_quiz_progress (
    user_id,
    question_id,
    chunk_id,
    course_id,
    response_type,
    selected_answer,
    session_number,
    is_review_question,
    time_spent_ms
  )
  VALUES (
    p_user_id,
    p_question_id,
    p_chunk_id,
    p_course_id,
    p_response_type,
    p_selected_answer,
    p_session_number,
    p_is_review_question,
    p_time_spent_ms
  )
  RETURNING id INTO v_progress_id;

  IF p_chunk_id IS NOT NULL THEN
    INSERT INTO public.chunk_mastery (
      user_id,
      chunk_id,
      course_id,
      mastery_score,
      total_questions_seen,
      last_reviewed_session,
      updated_at
    )
    VALUES (
      p_user_id,
      p_chunk_id,
      p_course_id,
      COALESCE(p_mastery_score, 0),
      COALESCE(p_total_questions_seen, 0),
      COALESCE(p_last_reviewed_session, 0),
      COALESCE(p_updated_at, now())
    )
    ON CONFLICT (user_id, chunk_id) DO UPDATE
    SET
      course_id = EXCLUDED.course_id,
      mastery_score = EXCLUDED.mastery_score,
      total_questions_seen = EXCLUDED.total_questions_seen,
      last_reviewed_session = EXCLUDED.last_reviewed_session,
      updated_at = EXCLUDED.updated_at;
  END IF;

  RETURN QUERY SELECT v_progress_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_quiz_submission(
  uuid,
  uuid,
  uuid,
  uuid,
  public.quiz_response_type,
  integer,
  integer,
  boolean,
  integer,
  public.question_status,
  integer,
  integer,
  integer,
  integer,
  integer,
  timestamp with time zone
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.apply_quiz_submission(
  uuid,
  uuid,
  uuid,
  uuid,
  public.quiz_response_type,
  integer,
  integer,
  boolean,
  integer,
  public.question_status,
  integer,
  integer,
  integer,
  integer,
  integer,
  timestamp with time zone
) TO service_role;
