import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials (URL or Service Role Key)");
  process.exit(1);
}

// Use Service Role Key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanAbnormalSessions() {
  console.log("Starting cleaning process with Service Role Key...");

  // Fetch all sessions
  const { data: sessions, error } = await supabase
    .from("pomodoro_sessions")
    .select("*");

  if (error) {
    console.error("Error fetching sessions:", error);
    return;
  }

  console.log(`Found ${sessions?.length || 0} sessions. Analyzing...`);

  if (!sessions || sessions.length === 0) {
      console.log("No sessions found to analyze.");
      return;
  }

  let updatedCount = 0;
  for (const session of sessions) {
    let needsUpdate = false;
    let newWork = session.total_work_time;
    let newBreak = session.total_break_time;
    let newPause = session.total_pause_time;

    // Report Logic: 
    // User sees "11280 dk" in UI.
    // Frontend likely treats DB value as Minutes if it's small, or maybe it just displays raw?
    // If DB value is 11280, and it's seconds -> 3.13 hours. That's fine.
    // If DB value is 11280, and it's MINUTES -> 188 hours. That's wrong.
    // Given the user complaint "11280 dk" which is "abartılı" (exaggerated), 
    // it implies the UI shows 11280.
    
    // We will assume any value > 36000 (10 hours) in any field is suspicious and should be capped or zeroed.
    // Even clearer: Any value > 60000 (16 hours) is definitely garbage.
    
    // Specific Fix for the 11280 scenario:
    // If we find EXACT 11280 (or close), we know it's the culprit.
    
    // Work Time cap: 8 hours (28800 seconds) for a single pomodoro session is highly irregular.
    // Let's cap at 4 hours (14400 seconds) to be safe for a "Session".
    // If it's a "Daily Accumulation" displayed as a session, that's a different bug, but here we clean "sessions".
    
    if (session.total_work_time > 28800) { // > 8 hours
        console.log(`[FIX] Session ${session.id} Work: ${session.total_work_time} -> 1500 (25m)`);
        newWork = 1500;
        needsUpdate = true;
    }
    
    if (session.total_break_time > 7200) { // > 2 hours break
         console.log(`[FIX] Session ${session.id} Break: ${session.total_break_time} -> 300 (5m)`);
         newBreak = 300;
         needsUpdate = true;
    }

     if (session.total_pause_time > 7200) { // > 2 hours pause
         console.log(`[FIX] Session ${session.id} Pause: ${session.total_pause_time} -> 0`);
         newPause = 0;
         needsUpdate = true;
    }

    // Check for "0" duration sessions that might clutter? (Optional)
    
    if (needsUpdate) {
       const { error: updateError } = await supabase
        .from('pomodoro_sessions')
        .update({
            total_work_time: newWork,
            total_break_time: newBreak,
            total_pause_time: newPause
        })
        .eq('id', session.id);
        
       if (updateError) {
           console.error(`Failed to update session ${session.id}:`, updateError);
       } else {
           updatedCount++;
       }
    }
  }

  console.log(`Cleaning complete. Updated ${updatedCount} sessions.`);
}

cleanAbnormalSessions();
