-- Pomodoro Sessions Enhancement
-- Adds pause_count, efficiency_score, and last_active_at for heartbeat tracking

ALTER TABLE pomodoro_sessions
ADD COLUMN IF NOT EXISTS pause_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS efficiency_score FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- Add index for heartbeat queries (find zombie sessions)
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_last_active_at 
ON pomodoro_sessions(last_active_at) 
WHERE is_completed = false;

COMMENT ON COLUMN pomodoro_sessions.pause_count IS 'Number of times the session was paused';
COMMENT ON COLUMN pomodoro_sessions.efficiency_score IS 'Efficiency = (work / (work + break + pause)) * 100';
COMMENT ON COLUMN pomodoro_sessions.last_active_at IS 'Last heartbeat timestamp for zombie session detection';
