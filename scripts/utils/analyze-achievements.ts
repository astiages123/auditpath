/**
 * Başarım tarih analizi scripti
 * Mevcut başarımları inceler ve doğru unlocked_at tarihlerini hesaplar
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function analyzeAchievements() {
    console.log("=== KULLANICI VE BAŞARIM ANALİZİ ===\n");

    // Önce tüm kullanıcıları listele
    const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, email");

    if (usersError) {
        console.error("Kullanıcı hatası:", usersError);
        return;
    }

    console.log("Kayıtlı kullanıcılar:");
    for (const u of users || []) {
        console.log(`  - ${u.id}: ${u.email}`);
    }

    // Tüm başarımları getir (kullanıcı filtresi olmadan)
    const { data: allAchievements, error: allAchError } = await supabase
        .from("user_achievements")
        .select("*")
        .order("unlocked_at", { ascending: true });

    if (allAchError) {
        console.error("Başarım hatası:", allAchError);
        return;
    }

    console.log("\n=== TÜM BAŞARIMLAR ===\n");
    console.log(`Toplam başarım kaydı: ${allAchievements?.length}`);

    // Kullanıcı bazlı grupla
    const byUser: Record<string, typeof allAchievements> = {};
    for (const ach of allAchievements || []) {
        if (!byUser[ach.user_id]) byUser[ach.user_id] = [];
        byUser[ach.user_id]!.push(ach);
    }

    for (const [userId, achs] of Object.entries(byUser)) {
        const user = users?.find((u) => u.id === userId);
        console.log(`\n--- Kullanıcı: ${user?.email || userId} ---`);
        for (const ach of achs || []) {
            console.log(
                `  ${ach.achievement_id}: unlocked_at=${ach.unlocked_at}`,
            );
        }
    }

    // Tüm video progress'leri getir
    console.log("\n=== TÜM VİDEO TAMAMLAMALARI ===\n");

    const { data: allVideoProgress, error: vpError } = await supabase
        .from("video_progress")
        .select("user_id, completed_at, updated_at")
        .eq("completed", true)
        .order("completed_at", { ascending: true });

    if (vpError) {
        console.error("Video progress hatası:", vpError);
        return;
    }

    console.log(`Toplam tamamlanan video: ${allVideoProgress?.length}`);

    // Kullanıcı bazlı grupla
    const vpByUser: Record<
        string,
        { dates: Set<string>; firstDate: string | null; count: number }
    > = {};
    for (const vp of allVideoProgress || []) {
        if (!vp.user_id) continue;
        if (!vpByUser[vp.user_id]) {
            vpByUser[vp.user_id] = {
                dates: new Set(),
                firstDate: null,
                count: 0,
            };
        }
        const date = vp.completed_at?.split("T")[0] ||
            vp.updated_at?.split("T")[0];
        if (date) {
            vpByUser[vp.user_id].dates.add(date);
            if (!vpByUser[vp.user_id].firstDate) {
                vpByUser[vp.user_id].firstDate = vp.completed_at ||
                    vp.updated_at;
            }
        }
        vpByUser[vp.user_id].count++;
    }

    for (const [userId, data] of Object.entries(vpByUser)) {
        const user = users?.find((u) => u.id === userId);
        console.log(`\n--- Kullanıcı: ${user?.email || userId} ---`);
        console.log(`  Tamamlanan video: ${data.count}`);
        console.log(`  Aktif gün sayısı: ${data.dates.size}`);
        console.log(`  İlk tamamlama: ${data.firstDate}`);
        console.log(`  Tarihler: ${Array.from(data.dates).sort().join(", ")}`);
    }
}

analyzeAchievements().then(() => {
    console.log("\n=== ANALİZ TAMAMLANDI ===");
    process.exit(0);
}).catch((err) => {
    console.error("Hata:", err);
    process.exit(1);
});
