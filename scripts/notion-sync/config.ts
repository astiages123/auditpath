import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

export const NOTION_TOKEN = process.env.NOTION_TOKEN;
export const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
export const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const DRY_RUN =
  process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run');
export const MAX_CONCURRENT_IMAGES = 5;
export const MAX_CONCURRENT_PAGES = 3;

export function validateConfig(): void {
  if (
    !NOTION_TOKEN ||
    !NOTION_DATABASE_ID ||
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_KEY
  ) {
    console.error('❌ Missing required environment variables:');
    if (!NOTION_TOKEN) console.error('  - NOTION_TOKEN');
    if (!NOTION_DATABASE_ID) console.error('  - NOTION_DATABASE_ID');
    if (!SUPABASE_URL) console.error('  - SUPABASE_URL or VITE_SUPABASE_URL');
    if (!SUPABASE_SERVICE_KEY) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nPlease update your .env and .env.local files.');
    process.exit(1);
  }
}
