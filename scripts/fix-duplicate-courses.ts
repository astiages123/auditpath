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

interface CourseMergeTarget {
    name: string;
    keeperId: string; // The one with videos (keep this)
    donorId: string; // The one with chunks (delete this after moving)
}

const TARGETS: CourseMergeTarget[] = [
    {
        name: "Muhasebe",
        keeperId: "f5a34b1b-8e16-46f3-9af8-663f9ac3310f",
        donorId: "2f523a82-3c63-8011-9f97-d165f346a48c",
    },
    {
        name: "Medeni Hukuk",
        keeperId: "16c1f3f1-f952-42e7-864c-6133ab9f2493",
        donorId: "2f523a82-3c63-809a-bbc7-d08f475d6ff3",
    },
];

async function mergeCourses() {
    console.log("Starting Course Merge...");

    for (const target of TARGETS) {
        console.log(`\n--- Processing ${target.name} ---`);
        console.log(`Keeper: ${target.keeperId}`);
        console.log(`Donor:  ${target.donorId}`);

        // 1. Move Note Chunks
        const { error: chunkError, count: chunkCount } = await supabase
            .from("note_chunks")
            .update({ course_id: target.keeperId })
            .eq("course_id", target.donorId)
            .select("id", { count: "exact" });

        if (chunkError) {
            console.error("Error moving chunks:", chunkError);
            continue;
        }
        console.log(`Moved ${chunkCount} chunks.`);

        // 2. Move Questions
        const { error: qError, count: qCount } = await supabase
            .from("questions")
            .update({ course_id: target.keeperId })
            .eq("course_id", target.donorId)
            .select("id", { count: "exact" });

        if (qError) {
            console.error("Error moving questions:", qError);
        } else {
            console.log(`Moved ${qCount} questions.`);
        }

        // 3. Move User Quiz Progress
        // Note: Use try/catch or ignore conflicts if user already has progress on keeper (unlikely for chunks, but possible)
        // For simplicity, we update. If constraints fail, we might need a smarter approach.
        const { error: pError, count: pCount } = await supabase
            .from("user_quiz_progress")
            .update({ course_id: target.keeperId })
            .eq("course_id", target.donorId)
            .select("id", { count: "exact" });

        if (pError) {
            console.error("Error moving quiz progress:", pError);
        } else {
            console.log(`Moved ${pCount} progress records.`);
        }

        // 4. Move Chunk Mastery
        const { error: mError, count: mCount } = await supabase
            .from("chunk_mastery")
            .update({ course_id: target.keeperId })
            .eq("course_id", target.donorId)
            .select("id", { count: "exact" });

        if (mError) {
            console.error("Error moving chunk mastery:", mError);
        } else {
            console.log(`Moved ${mCount} mastery records.`);
        }

        // 5. Move Pomodoro Sessions (if any accidently linked to donor)
        const { error: sError, count: sCount } = await supabase
            .from("pomodoro_sessions")
            .update({ course_id: target.keeperId })
            .eq("course_id", target.donorId)
            .select("id", { count: "exact" });

        if (sError) {
            console.error("Error moving sessions:", sError);
        } else {
            console.log(`Moved ${sCount} sessions.`);
        }

        // 6. Delete Donor Course
        const { error: delError } = await supabase
            .from("courses")
            .delete()
            .eq("id", target.donorId);

        if (delError) {
            console.error("Error deleting donor course:", delError);
        } else {
            console.log(`Deleted donor course ${target.donorId}.`);
        }
    }

    console.log("\nMerge Completed.");
}

mergeCourses();
