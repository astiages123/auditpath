import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function updateCourseName() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    console.log("Updating course name in Supabase...");

    const { error } = await supabase
        .from("courses")
        .update({
            name: "Matematik",
            course_slug: "matematik",
        })
        .eq("name", "Matematik & Sayısal Mantık");

    if (error) {
        console.error("Error updating course name:", error.message);
    } else {
        console.log("Course name and slug updated successfully in Supabase.");
    }
}

updateCourseName();
