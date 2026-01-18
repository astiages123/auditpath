
import { analyzeNoteChunk } from "../src/lib/ai";
import "dotenv/config"; // Load .env for the script

const SAMPLE_TEXT = `
Hak Düşürücü Süre:
Bir hakkın kanunda belirtilen süre içinde kullanılmaması durumunda o hakkın sona ermesi sonucunu doğuran süredir.
Özellikleri:
1. Hakim tarafından re'sen (kendiliğinden) dikkate alınır.
2. Durması veya kesilmesi söz konusu değildir (Mücbir sebepler hariç).
3. Borcu sona erdirmez, hakkı ortadan kaldırır.
Örnek: İdare mahkemesinde dava açma süresi (60 gün) hak düşürücü süredir.
`;

async function main() {
  // Hack to make import.meta.env work in node environment with tsx if not using vite directly
  // But wait, src/lib/ai.ts uses import.meta.env which is Vite specific.
  // In a Node script via tsx, import.meta.env might be undefined.
  // I need to shim it or change ai.ts to support process.env as well?
  // Or just mock it for this test script.
  
  // @ts-expect-error - Mocking import.meta.env for Node.js environment during script execution
  global.import = { meta: { env: { VITE_OPENROUTER_API_KEY: process.env.VITE_OPENROUTER_API_KEY } } };
  // Actually, tsx might handle import.meta.env if configured, but let's be safe.
  // The cleanest way for a shared lib is to check for import.meta.env OR process.env,
  // but since the project is Vite, I shouldn't pollute the source code with process.env if I can avoid it.
  // I will just define it globally for this script.

  console.log("Testing Model A with sample text...");
  console.log("Note Chunk Length:", SAMPLE_TEXT.length);
  
  try {
    // We need to allow the function to read from the shimmed env
    // But since the module is already imported, it might have issues if it captured import.meta.env at top level?
    // In valid JS module, import.meta is per module. 
    // The src/lib/ai.ts accesses import.meta.env inside the function, so setting it on the global/process might not work 
    // directly if tsx doesn't transpile it to process.env.
    
    // Let's try to overwrite the behavior by modifying the function usage or assume tsx handles .env
    // Actually, tsx does not automatically load .env into import.meta.env.
    
    // Simplest fix for Verification: 
    // I will use a different approach. I will pass the key if I can, or use a testing utility.
    // However, since I can't easily change the code structure just for this script without making it messy...
    // I'll try to run it. If `import.meta.env` fails, I'll update `ai.ts` to be more robust for testing (e.g. accept key as optional arg).
    
    // Let's try calling it.
    const result = await analyzeNoteChunk(SAMPLE_TEXT);
    console.log("✅ Analysis Successful!");
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error("❌ Analysis Failed:", error);
    process.exit(1);
  }
}

main();
