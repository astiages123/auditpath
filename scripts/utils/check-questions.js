import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const chunkId = 'e873a8b5-e1e2-4b91-bd7b-baa9c5ef91ac';

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing keys");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { count, error } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('chunk_id', chunkId);
    
    if (error) console.error(error);
    else console.log(`Question Count for ${chunkId}: ${count}`);
}

check();
