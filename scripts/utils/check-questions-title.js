import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const sectionTitle = "Medeni Hukuk'a Giriş";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log(`Searching for questions with title: "${sectionTitle}"`);
    
    const { data, error } = await supabase
        .from('questions')
        .select('id, chunk_id, section_title')
        .eq('section_title', sectionTitle);
    
    if (error) console.error(error);
    else {
        console.log(`Found ${data.length} questions.`);
        if (data.length > 0) console.log("Sample:", data[0]);
    }
}

check();
