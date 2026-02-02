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
        const { error: chunkError, data: movedChunks } = await supabase
            .from("note_chunks")
            .update({ course_id: target.keeperId })
            .eq("course_id", target.donorId)
            .select("id");

        if (chunkError) {
            console.error("Error moving chunks:", chunkError);
            continue;
        }
        const chunkCount = movedChunks?.length || 0;
        console.log(`Moved ${chunkCount} chunks.`);

        // 2. Move Questions
        const { error: qError, data: movedQuestions } = await supabase
            .from("questions")
            .update({ course_id: target.keeperId })
            .eq("course_id", target.donorId)
            .select("id");

        if (qError) {
            console.error("Error moving questions:", qError);
        } else {
            const qCount = movedQuestions?.length || 0;
            console.log(`Moved ${qCount} questions.`);
        }

        // 3. Move User Quiz Progress
        const { error: pError, data: movedProgress } = await supabase
            .from("user_quiz_progress")
            .update({ course_id: target.keeperId })
            .eq("course_id", target.donorId)
            .select("id");

        if (pError) {
            console.error("Error moving quiz progress:", pError);
        } else {
            const pCount = movedProgress?.length || 0;
            console.log(`Moved ${pCount} progress records.`);
        }

        // 4. Move Chunk Mastery
        const { error: mError, data: movedMastery } = await supabase
            .from("chunk_mastery")
            .update({ course_id: target.keeperId })
            .eq("course_id", target.donorId)
            .select("id");

        if (mError) {
            console.error("Error moving chunk mastery:", mError);
        } else {
            const mCount = movedMastery?.length || 0;
            console.log(`Moved ${mCount} mastery records.`);
        }

        // 5. Move Pomodoro Sessions (if any accidently linked to donor)
        const { error: sError, data: movedSessions } = await supabase
            .from("pomodoro_sessions")
            .update({ course_id: target.keeperId })
            .eq("course_id", target.donorId)
            .select("id");

        if (sError) {
            console.error("Error moving sessions:", sError);
        } else {
            const sCount = movedSessions?.length || 0;
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
