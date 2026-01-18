import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: users, error: userError } = await supabase
    .from("User")
    .select("*")
    .limit(1);
  if (userError || !users || users.length === 0) {
    console.log("No users found. Please sign in first.");
    return;
  }
  const userId = users[0].id;
  console.log(`Seeding data for user: ${userId}`);

  // Get courses for icons
  const { data: courses, error: courseError } = await supabase
    .from("Course")
    .select("*");
  if (courseError || !courses || courses.length === 0) {
    console.log("No courses found. Run seed script first.");
    return;
  }

  // Helper to find course by keyword
  const findCourse = (keyword: string) =>
    courses.find((c) => c.name.toLowerCase().includes(keyword.toLowerCase())) ||
    courses[0];

  const microEco = findCourse("iktisat");
  const law = findCourse("hukuk");

  const today = new Date();

  console.log("Cleaning recent data...");
  // Clear last 35 days of data for this user to have a clean slate
  const past35Days = new Date(today);
  past35Days.setDate(past35Days.getDate() - 35);

  await supabase
    .from("PomodoroSession")
    .delete()
    .eq("userId", userId)
    .gte("startedAt", past35Days.toISOString());

  await supabase
    .from("VideoProgress")
    .delete()
    .eq("userId", userId)
    .gte("completedAt", past35Days.toISOString());

  console.log("Generating Heatmap data (Last 30 days)...");
  // Generate random activity for heatmap
  for (let i = 1; i <= 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(10, 0, 0, 0);

    const intensity = Math.random();
    let minutes = 0;

    if (intensity > 0.8) minutes = 150;
    else if (intensity > 0.5) minutes = 60;
    else if (intensity > 0.3) minutes = 25;
    else minutes = 0;

    if (minutes > 0) {
      const startTime = date.getTime();
      const endTime = startTime + minutes * 60 * 1000;
      const pauseTime = Math.random() > 0.7 ? 300 : 0;

      await supabase.from("PomodoroSession").insert({
        userId,
        courseId: i % 2 === 0 ? microEco.courseId : law.courseId,
        totalWorkTime: minutes * 60,
        totalBreakTime: 0,
        totalPauseTime: pauseTime,
        timeline: [{ type: "work", start: startTime, end: endTime }],
        startedAt: date.toISOString(),
        endedAt: new Date(endTime).toISOString(),
      });
    }
  }

  console.log("Generating Today's Session Log...");
  // Session 1: Mikro İktisat (Morning) - 50 mins
  const s1Start = new Date(today);
  s1Start.setHours(9, 30, 0, 0);
  const s1Duration = 50 * 60;
  const s1Pause = 120;
  const s1RealEnd = new Date(s1Start.getTime() + (s1Duration + s1Pause) * 1000);

  await supabase.from("PomodoroSession").insert({
    userId,
    courseId: microEco.courseId,
    totalWorkTime: s1Duration,
    totalBreakTime: 0,
    totalPauseTime: s1Pause,
    timeline: [
      {
        type: "work",
        start: s1Start.getTime(),
        end: s1Start.getTime() + 20 * 60000,
      },
      {
        type: "pause",
        start: s1Start.getTime() + 20 * 60000,
        end: s1Start.getTime() + 22 * 60000,
      },
      {
        type: "work",
        start: s1Start.getTime() + 22 * 60000,
        end: s1RealEnd.getTime(),
      },
    ],
    startedAt: s1Start.toISOString(),
    endedAt: s1RealEnd.toISOString(),
  });

  // Break 1: 15 mins
  const b1Start = s1RealEnd;
  const b1Duration = 15 * 60;
  const b1End = new Date(b1Start.getTime() + b1Duration * 1000);

  await supabase.from("PomodoroSession").insert({
    userId,
    courseId: microEco.courseId, // Assuming break relates to last course or null
    totalWorkTime: 0,
    totalBreakTime: b1Duration,
    totalPauseTime: 0,
    timeline: [
      { type: "break", start: b1Start.getTime(), end: b1End.getTime() },
    ],
    startedAt: b1Start.toISOString(),
    endedAt: b1End.toISOString(),
  });

  // Session 2: Borçlar Hukuku (Late Morning) - 65 mins
  const s2Start = new Date(b1End.getTime() + 5 * 60000);
  const s2Duration = 65 * 60;
  const s2Pause = 600;
  const s2End = new Date(s2Start.getTime() + (s2Duration + s2Pause) * 1000);

  await supabase.from("PomodoroSession").insert({
    userId,
    courseId: law.courseId,
    totalWorkTime: s2Duration,
    totalBreakTime: 0,
    totalPauseTime: s2Pause,
    timeline: [
      {
        type: "work",
        start: s2Start.getTime(),
        end: s2Start.getTime() + 30 * 60000,
      },
      {
        type: "pause",
        start: s2Start.getTime() + 30 * 60000,
        end: s2Start.getTime() + 40 * 60000,
      },
      {
        type: "work",
        start: s2Start.getTime() + 40 * 60000,
        end: s2End.getTime(),
      },
    ],
    startedAt: s2Start.toISOString(),
    endedAt: s2End.toISOString(),
  });

  console.log("Generating Efficiency Data...");
  const { data: videos } = await supabase
    .from("Video")
    .select("*")
    .eq("courseId", microEco.id)
    .limit(2);

  if (videos && videos.length > 0) {
    const videoId = videos[0].id;
    await supabase
      .from("VideoProgress")
      .delete()
      .eq("userId", userId)
      .eq("videoId", videoId);
    await supabase.from("VideoProgress").insert({
      userId,
      videoId,
      completed: true,
      completedAt: new Date(
        new Date(today).setHours(10, 0, 0, 0)
      ).toISOString(),
    });
  }

  console.log("Seeding complete!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
