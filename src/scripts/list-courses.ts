
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Try loading .env.local first, then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  console.error('Tried loading .env.local and .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, name, course_slug');

  if (error) {
    console.error('Error fetching courses:', error);
    return;
  }

  console.log('All Courses:');
  courses.forEach(c => {
    console.log(`- [${c.id}] ${c.name} (${c.course_slug})`);
  });
}

main();
