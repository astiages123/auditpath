// Script to export notes from database to markdown files
// Run with: npx tsx scripts/export-notes.ts
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F\u0100-\u017F\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

async function exportNotes() {
  console.log("📚 Notları export ediyorum...");

  const notesDir = join(process.cwd(), "src", "content", "notes");

  // Ensure directory exists
  mkdirSync(notesDir, { recursive: true });

  // Fetch all notes from database
  const { data: notes, error } = await supabase
    .from("Notes")
    .select("lessonType, updatedAt, content");

  if (error) {
    console.error("❌ Veri çekme hatası:", error);
    process.exit(1);
  }

  if (!notes || notes.length === 0) {
    console.log("📝 Hiç not bulunamadı.");
    process.exit(0);
  }

  console.log(`📝 ${notes.length} not bulundu.`);

  for (const note of notes) {
    const fileName = `${slugify(note.lessonType)}.md`;
    const filePath = join(notesDir, fileName);

    // Create frontmatter + content
    const fileContent = `---
lessonType: "${note.lessonType}"
updatedAt: "${new Date(note.updatedAt).toISOString()}"
---

${note.content}`;

    writeFileSync(filePath, fileContent, "utf-8");
    console.log(`  ✅ ${fileName}`);
  }

  console.log("\n🎉 Export tamamlandı!");
  process.exit(0);
}

exportNotes().catch((err) => {
  console.error("❌ Hata:", err);
  process.exit(1);
});
