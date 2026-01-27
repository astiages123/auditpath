import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testQueries() {
    console.log("--- Testing 'muhasebe' ---");
    const { data: muhasebeCourses, error: mError } = await supabase
        .from("courses")
        .select("id, name, course_slug, total_videos")
        .eq("course_slug", "muhasebe");

    if (mError) console.error(mError);
    console.log("Courses with slug 'muhasebe':", muhasebeCourses);

    if (muhasebeCourses) {
        for (const c of muhasebeCourses) {
            const { count } = await supabase.from("note_chunks").select("*", {
                count: "exact",
                head: true,
            }).eq("course_id", c.id);
            console.log(`Course ${c.id} (${c.name}) has ${count} chunks.`);
        }
    }

    console.log("\n--- Testing 'medeni-hukuk' ---");
    const { data: medeniCourses, error: medError } = await supabase
        .from("courses")
        .select("id, name, course_slug, total_videos")
        .eq("course_slug", "medeni-hukuk");

    if (medError) console.error(medError);
    console.log("Courses with slug 'medeni-hukuk':", medeniCourses);

    if (medeniCourses) {
        for (const c of medeniCourses) {
            const { count } = await supabase.from("note_chunks").select("*", {
                count: "exact",
                head: true,
            }).eq("course_id", c.id);
            console.log(`Course ${c.id} (${c.name}) has ${count} chunks.`);
        }
    }
}

testQueries();
