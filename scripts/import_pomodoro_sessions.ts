/**
 * Pomodoro Sessions CSV to DB Import Script
 * 
 * Runs with: npx tsx scripts/import_pomodoro_sessions.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('🔗 Connecting to:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

interface TimelineEvent {
  type: 'work' | 'break' | 'pause';
  start: number;
  end?: number;
}

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

async function importSessions() {
  console.log('📂 Reading CSV file...');
  
  const csvContent = readFileSync('pomodoro_sessions_rows.csv', 'utf-8');
  const lines = csvContent.split('\n').filter(l => l.trim());
  
  const header = parseCSVLine(lines[0]);
  console.log('📋 Headers:', header.slice(0, 5).join(', '), '...');
  
  const dataLines = lines.slice(1);
  console.log(`📊 Found ${dataLines.length} records to import\n`);

  // Test connection first
  const { data: testData, error: testError } = await supabase.from('pomodoro_sessions').select('id').limit(1);
  if (testError) {
    console.error('❌ Connection test failed:', testError.message);
    return;
  }
  console.log('✅ Connection successful\n');

  let successCount = 0;
  let errorCount = 0;

  for (const line of dataLines) {
    if (!line.trim()) continue;
    
    try {
      const fields = parseCSVLine(line);
      
      const id = fields[0]?.trim();
      const userId = fields[1]?.trim();
      const courseId = fields[2]?.trim();
      const workTime = parseInt(fields[3]) || 0;
      const breakTime = parseInt(fields[4]) || 0;
      const pauseTime = parseInt(fields[5]) || 0;
      const timelineStr = fields[6];
      const startedAt = fields[7]?.trim();
      const endedAt = fields[8]?.trim();
      const createdAt = fields[9]?.trim();
      const courseName = fields[10]?.trim();
      const isCompleted = fields[11]?.trim() === 'true';

      // Parse timeline JSON
      let timeline: TimelineEvent[] = [];
      try {
        const cleanJson = timelineStr.replace(/""/g, '"');
        timeline = JSON.parse(cleanJson);
      } catch {
        console.warn(`⚠️ Could not parse timeline for ${id}`);
      }

      // Use existing columns only (migration not applied yet)
      const sessionData = {
        id,
        user_id: userId,
        course_id: courseId,
        course_name: courseName,
        total_work_time: workTime,
        total_break_time: breakTime,
        total_pause_time: pauseTime,
        timeline: timeline,
        started_at: startedAt,
        ended_at: endedAt,
        is_completed: isCompleted,
      };

      const { error } = await supabase
        .from('pomodoro_sessions')
        .upsert(sessionData, { onConflict: 'id' });

      if (error) {
        console.error(`❌ ${id.slice(0,8)}: ${error.message}`);
        errorCount++;
      } else {
        console.log(`✅ ${courseName} | Work: ${Math.round(workTime/60)}m | Break: ${Math.round(breakTime/60)}m`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Exception:`, err);
      errorCount++;
    }
  }

  console.log(`\n📈 Import complete: ${successCount} succeeded, ${errorCount} failed`);
}

importSessions().catch(console.error);
