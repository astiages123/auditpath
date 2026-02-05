import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const USER_ID = "f63e5a09-7401-481d-9cfb-c1bb1940a999";
const ACHIEVEMENT_ID = "special-01";
const TARGET_DATE = "2026-01-19T22:00:00.000Z";

async function setAchievement() {
    console.log(
        `Setting achievement ${ACHIEVEMENT_ID} for user ${USER_ID} to date ${TARGET_DATE}...`,
    );

    const { error } = await supabase
        .from("user_achievements")
        .upsert({
            user_id: USER_ID,
            achievement_id: ACHIEVEMENT_ID,
            unlocked_at: TARGET_DATE,
            is_celebrated: true, // Already achieved, no need to celebrate again
        }, {
            onConflict: "user_id,achievement_id",
        });

    if (error) {
        console.error("Error setting achievement:", error);
    } else {
        console.log("Achievement successfully set!");
    }
}

setAchievement().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
});
