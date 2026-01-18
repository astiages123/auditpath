-- ============================================
-- Cleanup: Duplicate Index
-- ============================================
-- Removes duplicate index on pomodoro_sessions table
-- Both indexes cover the same columns (user_id, started_at)

DROP INDEX IF EXISTS idx_pomodoro_session_user_started;

-- Keeping: idx_pomodoro_sessions_user_started (plural form, more conventional)
