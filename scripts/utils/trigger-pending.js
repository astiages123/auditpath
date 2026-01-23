import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
}

// Debug check for key validity
try {
    const payload = JSON.parse(Buffer.from(supabaseKey.split('.')[1], 'base64').toString());
    console.log(`🔑 Key Role: ${payload.role}, Project Ref: ${payload.ref}`);
} catch (e) {
    console.error("❌ Failed to decode Supabase Key");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function processPending() {
    console.log("🔍 Pending ve Ready durumundaki chunklar aranıyor...");

    const { data: chunks, error } = await supabase
        .from('note_chunks')
        .select('id, section_title, course_name')
        .eq('status', 'PENDING')
        .eq('is_ready', true);

    if (error) {
        console.error("DB Error:", error);
        return;
    }

    if (!chunks || chunks.length === 0) {
        console.log("✅ İşlenecek bekleyen chunk yok.");
        return;
    }

    console.log(`🚀 Toplam ${chunks.length} adet chunk bulundu. İşlem başlıyor...`);

    for (const chunk of chunks) {
        console.log(`\n▶️ İşleniyor: [${chunk.course_name}] ${chunk.section_title} (${chunk.id})`);
        
        try {
            const { data, error: fnError } = await supabase.functions.invoke('quiz-generator', {
                body: { chunkId: chunk.id }
            });

            if (fnError) {
                console.error(`❌ Function Invoke Error:`, fnError);
            } else {
                console.log(`✅ Başarılı! Üretilen Soru: ${data?.generated || 0}`);
            }
        } catch (e) {
            console.error(`❌ Beklenmeyen Hata:`, e.message);
        }
    }

    console.log("\n🏁 Tüm işlemler tamamlandı.");
}

processPending();
