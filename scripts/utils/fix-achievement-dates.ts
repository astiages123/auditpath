/**
 * Başarım tarih düzeltme scripti v2
 * Haftalık dinlenme günü toleranslı streak hesaplama
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function calculateCorrectDates() {
    console.log("=== BAŞARIM TARİH DÜZELTME v2 ===\n");

    // 1. Kullanıcıyı bul
    const { data: users } = await supabase.from("users").select("id, email");
    const user = users?.[0];
    if (!user) {
        console.error("Kullanıcı bulunamadı!");
        return;
    }
    console.log(`Kullanıcı: ${user.email}\n`);

    // 2. Video tamamlamalarını tarihle birlikte getir
    const { data: videoProgress } = await supabase
        .from("video_progress")
        .select("completed_at, updated_at, user_id")
        .eq("user_id", user.id)
        .eq("completed", true)
        .order("completed_at", { ascending: true });

    if (!videoProgress || videoProgress.length === 0) {
        console.error("Video tamamlaması bulunamadı!");
        return;
    }

    // 3. Günlere göre video sayısını hesapla
    const dailyVideos: Record<
        string,
        { count: number; lastTimestamp: string }
    > = {};

    for (const vp of videoProgress) {
        const date = (vp.completed_at || vp.updated_at)?.split("T")[0];
        if (!date) continue;

        if (!dailyVideos[date]) {
            dailyVideos[date] = {
                count: 0,
                lastTimestamp: vp.completed_at || vp.updated_at!,
            };
        }
        dailyVideos[date].count++;
        if (
            (vp.completed_at || vp.updated_at)! >
                dailyVideos[date].lastTimestamp
        ) {
            dailyVideos[date].lastTimestamp = vp.completed_at || vp.updated_at!;
        }
    }

    console.log("Günlük video tamamlamaları:");
    const sortedDates = Object.keys(dailyVideos).sort();
    for (const date of sortedDates) {
        const d = new Date(date);
        const dayName =
            [
                "Pazar",
                "Pazartesi",
                "Salı",
                "Çarşamba",
                "Perşembe",
                "Cuma",
                "Cumartesi",
            ][d.getDay()];
        console.log(`  ${date} (${dayName}): ${dailyVideos[date].count} video`);
    }

    // 4. Streak hesapla - HAFTALIK DİNLENME GÜNÜ TOLERANSI
    // Haftada 1 gün boşluk (cumartesi veya pazar) streak'i bozmuyor
    const streakAchievements: Record<number, string> = {};

    let currentStreak = 0;
    let previousDate: Date | null = null;
    let weeklyRestUsed = false;
    let currentWeekStart: Date | null = null;

    for (const dateStr of sortedDates) {
        const currentDate = new Date(dateStr);
        const dayOfWeek = currentDate.getDay(); // 0=Pazar, 6=Cumartesi

        // Yeni hafta kontrolü (Pazartesi başlangıç)
        const weekStart = new Date(currentDate);
        weekStart.setDate(weekStart.getDate() - ((dayOfWeek + 6) % 7)); // Pazartesi'ye git

        if (
            !currentWeekStart ||
            weekStart.getTime() !== currentWeekStart.getTime()
        ) {
            currentWeekStart = weekStart;
            weeklyRestUsed = false;
        }

        if (previousDate) {
            const diffDays = Math.floor(
                (currentDate.getTime() - previousDate.getTime()) /
                    (1000 * 60 * 60 * 24),
            );

            if (diffDays === 1) {
                // Ardışık gün - streak devam
                currentStreak++;
            } else if (diffDays === 2 && !weeklyRestUsed) {
                // 1 gün boşluk - haftalık dinlenme günü olarak say
                const missingDate = new Date(previousDate);
                missingDate.setDate(missingDate.getDate() + 1);
                const missingDay = missingDate.getDay();

                // Eksik gün cumartesi veya pazar mı?
                if (missingDay === 0 || missingDay === 6) {
                    console.log(
                        `\n  ℹ️ Haftalık dinlenme günü kullanıldı: ${
                            missingDate.toISOString().split("T")[0]
                        }`,
                    );
                    weeklyRestUsed = true;
                    currentStreak++; // Streak devam
                } else {
                    // Hafta içi boşluk - streak sıfırla
                    currentStreak = 1;
                }
            } else {
                // Daha fazla boşluk - streak sıfırla
                currentStreak = 1;
            }
        } else {
            currentStreak = 1;
        }

        console.log(`  Streak @ ${dateStr}: ${currentStreak} gün`);

        // Streak milestone'larını kaydet
        if (currentStreak === 5 && !streakAchievements[5]) {
            streakAchievements[5] = dailyVideos[dateStr].lastTimestamp;
        }
        if (currentStreak === 7 && !streakAchievements[7]) {
            streakAchievements[7] = dailyVideos[dateStr].lastTimestamp;
        }
        if (currentStreak === 30 && !streakAchievements[30]) {
            streakAchievements[30] = dailyVideos[dateStr].lastTimestamp;
        }

        previousDate = currentDate;
    }

    console.log("\n=== STREAK BAŞARIMLARI ===");
    console.log(`  5 gün streak: ${streakAchievements[5] || "Ulaşılmadı"}`);
    console.log(`  7 gün streak: ${streakAchievements[7] || "Ulaşılmadı"}`);
    console.log(`  30 gün streak: ${streakAchievements[30] || "Ulaşılmadı"}`);

    // 5. Günde 5+ ve 10+ video başarımları (YENİ GEREKSİNİMLER)
    let dailyProgress5Date: string | null = null;
    let dailyProgress10Date: string | null = null;

    for (const dateStr of sortedDates) {
        const count = dailyVideos[dateStr].count;
        if (count >= 5 && !dailyProgress5Date) {
            dailyProgress5Date = dailyVideos[dateStr].lastTimestamp;
        }
        if (count >= 10 && !dailyProgress10Date) {
            dailyProgress10Date = dailyVideos[dateStr].lastTimestamp;
        }
    }

    console.log("\n=== GÜNLÜK İLERLEME BAŞARIMLARI ===");
    console.log(
        `  5+ video/gün (Gece Nöbetçisi): ${
            dailyProgress5Date || "Ulaşılmadı"
        }`,
    );
    console.log(
        `  10+ video/gün (Zihinsel Maraton): ${
            dailyProgress10Date || "Ulaşılmadı"
        }`,
    );

    // 6. İlk video tarihi (RANK_UP:1 için)
    const firstVideoDate = videoProgress[0]?.completed_at ||
        videoProgress[0]?.updated_at;
    console.log(`\nİlk video: ${firstVideoDate}`);

    // 7. Mevcut başarımları getir ve düzeltmeleri hesapla
    const { data: achievements } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", user.id);

    console.log("\n=== DÜZELTMELER ===\n");

    const updates: { id: string; correctDate: string; currentDate: string }[] =
        [];

    for (const ach of achievements || []) {
        let correctDate: string | null = null;
        const achId = ach.achievement_id;

        // Başarım tipine göre doğru tarihi belirle
        if (achId === "special-01") {
            correctDate = dailyProgress5Date; // 5+ video/gün
        } else if (achId === "special-02") {
            correctDate = dailyProgress10Date; // 10+ video/gün
        } else if (achId === "special-03") {
            correctDate = streakAchievements[7]; // 7 gün streak
        } else if (achId === "special-04") {
            correctDate = streakAchievements[30];
        } else if (achId === "mastery_04") {
            correctDate = streakAchievements[5]; // 5 gün streak
        } else if (achId === "RANK_UP:1") {
            correctDate = firstVideoDate;
        } else if (
            achId.startsWith("genel_") || achId.startsWith("hukuk_") ||
            achId.startsWith("eko_") || achId.startsWith("muh_")
        ) {
            correctDate = firstVideoDate;
        }

        if (correctDate) {
            const currentDate = ach.unlocked_at;
            if (correctDate.split("T")[0] !== currentDate.split("T")[0]) {
                updates.push({
                    id: achId,
                    correctDate,
                    currentDate,
                });
                console.log(`${achId}:`);
                console.log(`  Mevcut: ${currentDate}`);
                console.log(`  Doğru:  ${correctDate}`);
                console.log("");
            } else {
                console.log(
                    `${achId}: ✓ Tarih zaten doğru (${
                        correctDate.split("T")[0]
                    })`,
                );
            }
        } else {
            console.log(
                `${achId}: ⚠️ Doğru tarih hesaplanamadı - gereksinim karşılanmamış olabilir`,
            );
        }
    }

    // 8. Güncellemeleri uygula
    if (updates.length > 0) {
        console.log(`\n${updates.length} başarım güncellenecek...`);

        for (const update of updates) {
            const { error } = await supabase
                .from("user_achievements")
                .update({ unlocked_at: update.correctDate })
                .eq("user_id", user.id)
                .eq("achievement_id", update.id);

            if (error) {
                console.error(`Hata (${update.id}):`, error);
            } else {
                console.log(`✓ ${update.id} güncellendi`);
            }
        }
    } else {
        console.log("\nGüncelleme gerekmiyor, tüm tarihler doğru.");
    }
}

calculateCorrectDates().then(() => {
    console.log("\n=== DÜZELTME TAMAMLANDI ===");
    process.exit(0);
}).catch((err) => {
    console.error("Hata:", err);
    process.exit(1);
});
