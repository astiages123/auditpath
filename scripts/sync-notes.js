
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config();

const { Pool } = pg;

// Connection string from env
// Connection string from env
const connectionString = process.env.VITE_SUPABASE_URL
    ? process.env.DATABASE_URL // Prefer direct DB URL if available
    : undefined;

if (!process.env.DATABASE_URL && process.argv[1] === fileURLToPath(import.meta.url)) {
    console.error("Error: DATABASE_URL is not defined in .env");
    console.error("Please add DATABASE_URL=postgres://postgres:[password]@[host]:[port]/postgres to your .env file");
    process.exit(1);
}

const NOTES_DIR = path.resolve('public/notes');
const forceSync = process.argv.includes('--force');

// Helper to normalize disk names to match slugs
function normalizeDiskStructure(baseDir) {
    if (!fs.existsSync(baseDir)) return;
    const items = fs.readdirSync(baseDir);
    for (const item of items) {
        if (item.startsWith('.')) continue;

        const oldPath = path.join(baseDir, item);
        const stat = fs.statSync(oldPath);
        
        // Skip normalization for media files or other non-md files, but normalize folders and .md files
        let newName = item;
        if (stat.isDirectory() || item.endsWith('.md')) {
            newName = slugify(item);
            if (stat.isFile() && item.endsWith('.md')) {
                newName = newName + '.md';
            }
        }

        const newPath = path.join(baseDir, newName);
        if (oldPath !== newPath) {
            console.log(`[Disk] Normalizing Name: ${item} -> ${newName}`);
            fs.renameSync(oldPath, newPath);
        }

        if (stat.isDirectory()) {
            normalizeDiskStructure(newPath);
        }
    }
}

export async function syncNotes() {
    console.log("Starting note sync...");

    // 0. Auto-normalize disk names (Sync folder/file names with slugs)
    normalizeDiskStructure(NOTES_DIR);

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        const files = findMarkdownFiles(NOTES_DIR);
        const diskSlugs = files.map(f => getSlug(path.basename(f)));

        console.log(`Found ${files.length} markdown files.`);

        // 1. Process existing files
        for (const filePath of files) {
            await processFile(filePath, pool);
        }

        // 2. Cleanup orphaned records in DB
        // Find courses that have chunks but are no longer on disk
        const orphanedRes = await pool.query(`
            SELECT id, course_slug FROM courses 
            WHERE id IN (SELECT DISTINCT course_id FROM note_chunks)
        `);

        for (const row of orphanedRes.rows) {
            if (!diskSlugs.includes(row.course_slug)) {
                console.log(`[${row.course_slug}] Dosya silinmiş, veritabanı temizleniyor...`);
                await pool.query('DELETE FROM note_chunks WHERE course_id = $1', [row.id]);
                await pool.query('UPDATE courses SET last_hash = NULL WHERE id = $1', [row.id]);
            }
        }

        console.log("Sync completed successfully.");

        // 3. Auto-Trigger for Immediate Processing (Antrenman/Standard)
        // We trigger the Edge Function for chunks that are PENDING and NOT marked for nightly processing.
        // This replaces the need for a Database Webhook for the "morning workflow".
        if (process.env.VITE_SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)) {
            await triggerInstantProcessing(pool);
        } else {
            console.warn("⚠️ Supabase credentials missing. Skipping auto-trigger.");
        }

    } catch (err) {
        console.error("Sync failed:", err);
    } finally {
        await pool.end();
    }
}

async function triggerInstantProcessing(pool) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🔍 [Auto-Trigger] Checking for chunks to process immediately...");

    // Fetch pending chunks that are NOT for nightly processing
    // We use the pool here for a direct efficient query, but we could also use supabase client.
    // Using pool to stay consistent with the existing connection.
    const res = await pool.query(`
        SELECT id, section_title, course_name 
        FROM note_chunks 
        WHERE status = 'PENDING' 
          AND is_ready = true 
          AND process_at_night = false
    `);

    if (res.rows.length === 0) {
        console.log("✅ No immediate chunks to process.");
        return;
    }

    console.log(`🚀 Found ${res.rows.length} chunks for immediate processing.`);

    for (const row of res.rows) {
        console.log(`▶️ Triggering: [${row.course_name}] ${row.section_title}`);
        
        // Fire and forget (or await if we want to throttle)? 
        // Awaiting is safer to avoid overwhelming the database/edge function limits 
        // since we are running this from a local script.
        const { error } = await supabase.functions.invoke('quiz-generator', {
            body: { chunkId: row.id }
        });

        if (error) {
            console.error(`❌ Failed to trigger for ${row.id}:`, error);
        } else {
            console.log(`✅ Triggered successfully.`);
        }
    }
}

function findMarkdownFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;

    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(findMarkdownFiles(fullPath));
        } else {
            if (file.endsWith('.md')) {
                results.push(fullPath);
            }
        }
    });
    return results;
}


// Helper to slugify Turkish text
function slugify(text) {
    const trMap = {
        'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'I': 'I', 'İ': 'i', 'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
    };
    let slug = text;
    for (const key in trMap) {
        slug = slug.replace(new RegExp(key, 'g'), trMap[key]);
    }
    return slug
        .toLowerCase()
        .replace(/\.md$/, '')
        .replace(/[^-a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

// We assume the filename IS the slug (courseId)
function getSlug(filename) {
    return slugify(filename);
}


    async function processFile(filePath, pool) {
    const filename = path.basename(filePath);
    const slug = getSlug(filename); 
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileHash = crypto.createHash('md5').update(content).digest('hex');

    // Archive/Trial detection (Gece Vardiyası)
    // Checks if "arsiv" or "deneme" is in the full path or filename
    const lowerPath = filePath.toLowerCase();
    const isNightly = lowerPath.includes('arsiv') || lowerPath.includes('deneme');

    const courseRes = await pool.query('SELECT id, name, last_hash FROM courses WHERE course_slug = $1', [slug]);
    if (courseRes.rows.length === 0) return;

    const course = courseRes.rows[0];
    
    // Check if chunks actually exist
    const chunkCountRes = await pool.query('SELECT COUNT(*) as count FROM note_chunks WHERE course_id = $1', [course.id]);
    const chunkCount = parseInt(chunkCountRes.rows[0].count, 10);

    // Force sync check
    if (course.last_hash === fileHash && !forceSync && chunkCount > 0) {
        console.log(`[${filename}] Değişiklik yok.`);
        return;
    }

    const chunks = parseMarkdownChunks(content, course.name);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Existing section titles list for cleanup
        const currentSectionTitles = chunks.map(c => c.title);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const charCount = chunk.content.length;
            const wordCount = chunk.content.split(/\s+/).filter(Boolean).length;
            const chunkChecksum = crypto.createHash('md5').update(chunk.content).digest('hex');

            // --- NEXT HEADING LOGIC ---
            // If it is NOT the last chunk, it means we have moved to the next heading.
            // So the previous one is likely "done" writing (unless we are editing the middle).
            // Logic: 
            // - Last chunk -> Always DRAFT (user is still writing)
            // - Not last chunk -> PENDING (ready for AI)
            const isLastChunk = (i === chunks.length - 1);
            
            // Default states for NEW chunks
            let newStatus = isLastChunk ? 'DRAFT' : 'PENDING';
            let newIsReady = !isLastChunk;

            // Override for nightly processing
            // If nightly, we still follow the DRAFT/PENDING logic, but we mark process_at_night=true
            // Note: If isLastChunk is true, it stays DRAFT. When user adds a new heading, 
            // this one will verify as !isLastChunk next time and become PENDING + Nightly.
            const processAtNight = isNightly;

            // UPSERT Logic with Status Transitions
            // We need to be careful NOT to reset 'COMPLETED', 'PROCESSING' or 'FAILED' statuses 
            // if the content hasn't meaningfully changed, OR if we are just "promoting" a DRAFT to PENDING.
            
            // The logic handles two main cases:
            // 1. Content Changed (checksum distinct): Update content, reset status if it was COMPLETED?? 
            //    - Usually if content changes, we might want to re-generate (reset to PENDING).
            //    - But if it's the last chunk, it goes to DRAFT.
            // 2. Content Same, but Position Changed (e.g. became not-last):
            //    - If it was DRAFT, promote to PENDING.
            
            await client.query(
                `INSERT INTO note_chunks 
                (course_id, course_name, section_title, content, chunk_order, heading_order, char_count, word_count, checksum, parent_h1_id, parent_h2, status, is_ready, process_at_night) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                ON CONFLICT (course_id, section_title) 
                DO UPDATE SET 
                    content = EXCLUDED.content,
                    chunk_order = EXCLUDED.chunk_order,
                    heading_order = EXCLUDED.heading_order,
                    char_count = EXCLUDED.char_count,
                    word_count = EXCLUDED.word_count,
                    checksum = EXCLUDED.checksum,
                    parent_h1_id = EXCLUDED.parent_h1_id,
                    parent_h2 = EXCLUDED.parent_h2,
                    process_at_night = EXCLUDED.process_at_night,
                    
                    -- Intelligent Status Update:
                    -- 1. If content changed (checksum mismatch):
                    --    - If it's now the last chunk: Force DRAFT, Not Ready
                    --    - If it's NOT the last chunk: Force PENDING, Ready (Re-generation needed)
                    -- 2. If content is SAME (checksum match):
                    --    - If older status was DRAFT and now it is NOT last chunk: Promote to PENDING, Ready
                    --    - Otherwise, keep existing status (don't re-run COMPLETED or processing)
                    
                    status = CASE 
                        WHEN note_chunks.checksum IS DISTINCT FROM EXCLUDED.checksum THEN
                             CASE WHEN $15 = true THEN 'DRAFT'::chunk_generation_status ELSE 'PENDING'::chunk_generation_status END
                        WHEN note_chunks.status = 'DRAFT' AND $15 = false THEN 'PENDING'::chunk_generation_status
                        ELSE note_chunks.status
                    END,

                    is_ready = CASE 
                        WHEN note_chunks.checksum IS DISTINCT FROM EXCLUDED.checksum THEN
                             CASE WHEN $15 = true THEN false ELSE true END
                        WHEN note_chunks.status = 'DRAFT' AND $15 = false THEN true
                        ELSE note_chunks.is_ready
                    END

                WHERE 
                    -- Update if content changed OR if we need to promote DRAFT->PENDING
                    note_chunks.checksum IS DISTINCT FROM EXCLUDED.checksum 
                    OR (note_chunks.status = 'DRAFT' AND $15 = false)
                    OR note_chunks.chunk_order IS DISTINCT FROM EXCLUDED.chunk_order
                    OR note_chunks.heading_order IS DISTINCT FROM EXCLUDED.heading_order
                `, 
                [
                    course.id, 
                    course.name, 
                    chunk.title, 
                    chunk.content, 
                    i,              // chunk_order
                    i,              // heading_order (same for now)
                    charCount, 
                    wordCount, 
                    chunkChecksum, 
                    chunk.h1, 
                    chunk.h2,
                    newStatus,      // for INSERT
                    newIsReady,     // for INSERT
                    processAtNight, // for INSERT
                    isLastChunk     // $15 param for logic
                ]
            );
        }

        // Clean up deleted chunks
        await client.query(
            `DELETE FROM note_chunks 
             WHERE course_id = $1 AND section_title != ALL($2)`,
            [course.id, currentSectionTitles]
        );

        await client.query('UPDATE courses SET last_hash = $1 WHERE id = $2', [fileHash, course.id]);
        await client.query('COMMIT');
        console.log(`[${slug}] Akıllı UPSERT tamamlandı (Status: ${isNightly ? 'Nightly' : 'Standard'}).`);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(`[${filename}] Sync Error:`, e);
    } finally {
        client.release();
    }
}

function parseMarkdownChunks(content, courseName) {
    const lines = content.split('\n');
    const chunks = [];
    
    let currentH1 = courseName;
    let currentH2 = "Genel"; // Varsayılan H2
    let currentH3Title = "Giriş"; // Varsayılan H3 (H2 altındaki içerik için)
    
    let currentBuffer = [];

    // Helper to flush current buffer as a chunk
    const flushChunk = () => {
        if (currentBuffer.length > 0 || currentH3Title !== "Giriş") {
            // "Giriş" başlığı altında boş içerik varsa kaydetme, ama diğer başlıklarda kaydet
             const finalContent = currentBuffer.join('\n').trim();
             if (finalContent.length > 0) {
                 chunks.push({
                     title: currentH3Title,
                     content: finalContent,
                     h1: currentH1,
                     h2: currentH2
                 });
             }
        }
        currentBuffer = [];
    };

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('# ')) {
            // Yeni H1 (Ders Adı değişimi - nadir ama mümkün)
            flushChunk();
            currentH1 = trimmed.replace('# ', '').trim();
            // H1 değişince alt bağlamları sıfırla
            currentH2 = "Genel"; 
            currentH3Title = "Giriş"; 
        } 
        else if (trimmed.startsWith('## ')) {
            // Yeni H2 (Bölüm)
            flushChunk();
            currentH2 = trimmed.replace('## ', '').trim();
            currentH3Title = `${currentH2} - Giriş`; // H2'nin hemen altındaki metin için örtülü başlık
        } 
        else if (trimmed.startsWith('### ')) {
            // Yeni H3 (Konu)
            flushChunk();
            currentH3Title = trimmed.replace('### ', '').trim();
        } 
        else {
            currentBuffer.push(line);
        }
    }
    // Son kalanları kaydet
    flushChunk();
    return chunks;
}



function createChunkObj(title, lines, h1, h2) {
    // Unused legacy helper, keeping just in case or remove if strict
    return {}; 
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    syncNotes();
}
