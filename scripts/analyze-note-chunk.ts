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

async function analyze() {
    console.log("Fetching a single note chunk...");
    const { data: chunks, error } = await supabase
        .from("note_chunks")
        .select("*")
        .not("content", "is", null)
        .gt("word_count", 800)
        .order("word_count", { ascending: false })
        .limit(1);

    if (error) {
        console.error("Error fetching chunk:", error);
        return;
    }

    if (!chunks || chunks.length === 0) {
        console.log("No chunks found.");
        return;
    }

    const chunk = chunks[0];

    const { data: course, error: cError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", chunk.course_id)
        .single();

    if (cError) {
        console.error("Error fetching course:", cError);
    }

    const output = {
        chunk,
        course: cError ? { error: cError } : course,
    };

    const fs = await import("fs");
    fs.writeFileSync(
        "temp_chunk_analysis.json",
        JSON.stringify(output, null, 2),
    );
    console.log("Analysis written to temp_chunk_analysis.json");
}

analyze();
