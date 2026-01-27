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

async function checkCourses() {
    const { data: courses, error } = await supabase.from("courses").select("*");

    if (error) {
        console.error("Error fetching courses:", error);
        return;
    }

    console.log(`Found ${courses.length} courses.`);

    for (const c of courses) {
        console.log(`\n--- Course: ${c.name} (Slug: '${c.course_slug}') ---`);
        console.log(`ID: ${c.id}`);
        console.log(`Total Videos: ${c.total_videos}`);

        // 1. Check Chunks (Simulate getCourseTopics)
        const { data: chunks, error: chunkError } = await supabase
            .from("note_chunks")
            .select("section_title")
            .eq("course_id", c.id);

        if (chunkError) {
            console.error(`Error fetching chunks: ${chunkError.message}`);
        } else {
            console.log(`Total Chunks: ${chunks?.length}`);
            const titles = chunks?.map((ch) => ch.section_title).filter(
                Boolean,
            );
            const uniqueTitles = [...new Set(titles)];
            console.log(`Unique Section Titles: ${uniqueTitles.length}`);
            if (uniqueTitles.length > 0) {
                console.log(`Titles: ${uniqueTitles.join(", ")}`);
            } else {
                console.log("WARNING: No section titles found!");
            }
        }
    }
}

checkCourses();
