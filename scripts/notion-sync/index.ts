import { syncNotionToSupabase } from './sync-main';

async function main() {
  try {
    await syncNotionToSupabase();
  } catch (error) {
    console.error('Fatal Error during main:', error);
    process.exit(1);
  }
}

main();
