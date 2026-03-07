-- Restore EXECUTE permissions for functions called from client-side

-- 1. get_email_by_username: Required for login via username
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon, authenticated;

-- 2. increment_course_session: Required for tracking quiz sessions
GRANT EXECUTE ON FUNCTION public.increment_course_session(uuid, uuid) TO authenticated;
