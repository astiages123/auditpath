
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function backfillVideoLogs() {
  console.log("Starting backfill of video_logs from video_progress...");

  // 1. Fetch all completed video progress
  const { data: progress, error: progressError } = await supabase
    .from("video_progress")
    .select("user_id, video_id, completed_at, updated_at")
    .eq("completed", true);

  if (progressError) {
    console.error("Error fetching video_progress:", progressError);
    return;
  }

  if (!progress || progress.length === 0) {
    console.log("No completed videos found in video_progress.");
    return;
  }

  console.log(`Found ${progress.length} completed videos. Processing...`);

  let insertedCount = 0;
  let skippedCount = 0;

  for (const item of progress) {
    // Determine the timestamp
    const timestamp = item.completed_at || item.updated_at || new Date().toISOString();

    // Determine course_id from videos table
    const { data: videoData, error: videoError } = await supabase
        .from("videos")
        .select("course_id")
        .eq("id", item.video_id)
        .single();
    
    if (videoError || !videoData) {
        console.error(`Could not find video ${item.video_id}`, videoError);
        continue;
    }

    // Check if log already exists
    const { data: existingLog } = await supabase
      .from("video_logs")
      .select("id")
      .eq("user_id", item.user_id)
      .eq("video_id", item.video_id)
      .maybeSingle();

    if (existingLog) {
      skippedCount++;
      continue;
    }

    // Insert into video_logs
    const { error: insertError } = await supabase
      .from("video_logs")
      .insert({
        user_id: item.user_id,
        video_id: item.video_id,
        course_id: videoData.course_id,
        created_at: timestamp
      });

    if (insertError) {
      console.error(`Failed to insert log for video ${item.video_id}:`, insertError);
    } else {
      insertedCount++;
    }
  }

  console.log("Backfill complete.");
  console.log(`Inserted: ${insertedCount}`);
  console.log(`Skipped (Already Exists): ${skippedCount}`);
}

backfillVideoLogs();
