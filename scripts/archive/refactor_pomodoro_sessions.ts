/**
 * AuditPath Pomodoro Refactor Script
 * 
 * Logic:
 * 1. Read sessions from CSV
 * 2. Group by user_id and course_id
 * 3. Merge sessions if gap < 2 minutes
 * 4. Recalculate metrics from timeline
 * 5. Auto-seal sessions > 24h
 * 6. Output SQL for Supabase SQL Editor
 */

import { readFileSync, writeFileSync } from 'fs';

interface TimelineEvent {
  type: 'work' | 'break' | 'pause';
  start: number;
  end?: number;
}

interface PomodoroSession {
  id: string;
  user_id: string;
  course_id: string;
  course_name: string;
  total_work_time: number;
  total_break_time: number;
  total_pause_time: number;
  timeline: TimelineEvent[];
  started_at: string;
  ended_at: string;
  created_at: string;
  is_completed: boolean;
  pause_count?: number;
  efficiency_score?: number;
}

// Simple CSV parser
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function calculateMetrics(session: PomodoroSession) {
  let workSec = 0;
  let breakSec = 0;
  let pauseSec = 0;
  let pauseCount = 0;

  session.timeline.forEach(event => {
    const duration = Math.max(0, Math.round(((event.end || Date.now()) - event.start) / 1000));
    if (event.type === 'work') workSec += duration;
    else if (event.type === 'break') breakSec += duration;
    else if (event.type === 'pause') {
      pauseSec += duration;
      pauseCount++;
    }
  });

  session.total_work_time = workSec;
  session.total_break_time = breakSec;
  session.total_pause_time = pauseSec;
  session.pause_count = pauseCount;

  const totalTime = workSec + breakSec + pauseSec;
  session.efficiency_score = totalTime === 0 ? 0 : Math.round((workSec / totalTime) * 10000) / 100;
}

async function refactor() {
  console.log('🚀 AuditPath Pomodoro Refactor Initializing...');
  
  const csvContent = readFileSync('pomodoro_sessions_rows.csv', 'utf-8');
  const lines = csvContent.split('\n').filter(l => l.trim());
  const dataLines = lines.slice(1);
  
  const rawSessions: PomodoroSession[] = dataLines.map(line => {
    const fields = parseCSVLine(line);
    const timelineStr = fields[6].replace(/""/g, '"');
    let timeline = [];
    try { timeline = JSON.parse(timelineStr); } catch { /* ignore parse error */ }
    
    return {
      id: fields[0],
      user_id: fields[1],
      course_id: fields[2],
      total_work_time: parseInt(fields[3]),
      total_break_time: parseInt(fields[4]),
      total_pause_time: parseInt(fields[5]),
      timeline: timeline,
      started_at: fields[7],
      ended_at: fields[8],
      created_at: fields[9],
      course_name: fields[10],
      is_completed: fields[11]?.trim() === 'true'
    };
  });

  console.log(`📊 Processing ${rawSessions.length} raw sessions...`);

  // Group by user and course
  const groups: Record<string, PomodoroSession[]> = {};
  rawSessions.forEach(s => {
    const key = `${s.user_id}_${s.course_id}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });

  const processedSessions: PomodoroSession[] = [];

  for (const key in groups) {
    // Sort by started_at
    const sessions = groups[key].sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
    
    if (sessions.length === 0) continue;

    let current = sessions[0];
    
    for (let i = 1; i < sessions.length; i++) {
        const next = sessions[i];
        const currentEnd = new Date(current.ended_at).getTime();
        const nextStart = new Date(next.started_at).getTime();
        const gapMs = nextStart - currentEnd;
        
        // Gap < 2 minutes (120,000 ms)
        if (gapMs < 120000) {
            console.log(`🔗 Merging sessions for ${current.course_name}: ${current.id.slice(0,8)} + ${next.id.slice(0,8)} (Gap: ${Math.round(gapMs/1000)}s)`);
            current.ended_at = next.ended_at;
            current.timeline = [...current.timeline, ...next.timeline];
            current.is_completed = current.is_completed || next.is_completed;
        } else {
            processedSessions.push(current);
            current = next;
        }
    }
    processedSessions.push(current);
  }

  // 24h Auto-seal & Metrics
  const now = Date.now();
  const msIn24h = 24 * 60 * 60 * 1000;

  processedSessions.forEach(s => {
    // Sealing
    const age = now - new Date(s.ended_at).getTime();
    if (age > msIn24h && !s.is_completed) {
      console.log(`🔒 Sealing old session: ${s.id.slice(0,8)} (${s.course_name})`);
      s.is_completed = true;
    }

    // Metrics
    calculateMetrics(s);
  });

  console.log(`✅ Refactor complete. Total sessions: ${processedSessions.length}`);

  // Generate SQL
  let sql = `-- AuditPath Refactored Pomodoro Sessions\n-- Generated on ${new Date().toISOString()}\n\n`;
  sql += `DELETE FROM pomodoro_sessions;\n\n`; // Optional: Clear old data or use UPSERT
  
  sql += `INSERT INTO pomodoro_sessions (id, user_id, course_id, course_name, total_work_time, total_break_time, total_pause_time, timeline, started_at, ended_at, created_at, is_completed, pause_count, efficiency_score, last_active_at)\nVALUES\n`;
  
  const values = processedSessions.map(s => {
    const timelineJson = JSON.stringify(s.timeline).replace(/'/g, "''");
    return `  ('${s.id}', '${s.user_id}', '${s.course_id}', '${s.course_name.replace(/'/g, "''")}', ${s.total_work_time}, ${s.total_break_time}, ${s.total_pause_time}, '${timelineJson}'::jsonb, '${s.started_at}', '${s.ended_at}', '${s.created_at}', ${s.is_completed}, ${s.pause_count}, ${s.efficiency_score}, '${s.ended_at}')`;
  });

  sql += values.join(',\n') + ';\n';

  writeFileSync('scripts/refactored_pomodoro_sessions.sql', sql);
  console.log(`💾 SQL saved to scripts/refactored_pomodoro_sessions.sql`);
}

refactor().catch(console.error);
