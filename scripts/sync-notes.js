
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
        await triggerWorker();
    } catch (err) {
        console.error("Sync failed:", err);
    } finally {
        await pool.end();
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

    const courseRes = await pool.query('SELECT id, name, last_hash FROM courses WHERE course_slug = $1', [slug]);
    if (courseRes.rows.length === 0) return;

    const course = courseRes.rows[0];
    // Check if chunks actually exist (in case of previous partial failure or manual deletion)
    const chunkCountRes = await pool.query('SELECT COUNT(*) as count FROM note_chunks WHERE course_id = $1', [course.id]);
    const chunkCount = parseInt(chunkCountRes.rows[0].count, 10);

    // Force sync if structure is changing, but user passed flag control... we assume if hash matches and chunkCount > 0, it's fine.
    // However, since we are changing logic, all files *should* be reprocessed.
    // The user will likely run with --force manually or we rely on hash change.
    // Since this is a structural change, existing hashes might match but content structure is different.
    // We recommend running with --force for full migration.
    if (course.last_hash === fileHash && !forceSync && chunkCount > 0) {
        console.log(`[${filename}] Değişiklik yok.`);
        return;
    }

    const chunks = parseMarkdownChunks(content, course.name);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Mevcut chunk başlıklarını takip etmek için bir liste
        const currentSectionTitles = chunks.map(c => c.title);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const charCount = chunk.content.length;
            const wordCount = chunk.content.split(/\s+/).filter(Boolean).length;
            const chunkChecksum = crypto.createHash('md5').update(chunk.content).digest('hex');

            // UPSERT Mekanizması: Çakışma (Conflict) durumunda checksum farklıysa GÜNCELLE
            await client.query(
                `INSERT INTO note_chunks 
                (course_id, course_name, section_title, content, chunk_order, char_count, word_count, checksum, parent_h1_id, parent_h2) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (course_id, section_title) 
                DO UPDATE SET 
                    content = EXCLUDED.content,
                    chunk_order = EXCLUDED.chunk_order,
                    char_count = EXCLUDED.char_count,
                    word_count = EXCLUDED.word_count,
                    checksum = EXCLUDED.checksum,
                    parent_h1_id = EXCLUDED.parent_h1_id,
                    parent_h2 = EXCLUDED.parent_h2
                WHERE note_chunks.checksum IS DISTINCT FROM EXCLUDED.checksum`, 
                [course.id, course.name, chunk.title, chunk.content, i, charCount, wordCount, chunkChecksum, chunk.h1, chunk.h2]
            );


            // AUTO-GENERATION TRIGGER (Linear Logic)
            // min(30, 8 + ((wordCount / 100) * 1.1))
            const MIN_BASE = 8;
            const GROWTH = 1.1;
            const MAX_BASE = 30;
            
            const rawBase = MIN_BASE + (Math.max(0, wordCount) / 100 * GROWTH);
            const quota = Math.ceil(Math.min(MAX_BASE, rawBase)); // Assuming multiplier=1.0 for initial sync



            // Insert Job if not exists and needed
            await client.query(`
                INSERT INTO generation_jobs (chunk_id, job_type, target_count, priority)
                SELECT 
                    id, 
                    'ANTRENMAN', 
                    ($3 - (SELECT COUNT(*) FROM questions WHERE chunk_id = note_chunks.id AND usage_type = 'antrenman')), 
                    1
                FROM note_chunks 
                WHERE course_id=$1 AND section_title=$2
                AND ($3 - (SELECT COUNT(*) FROM questions WHERE chunk_id = note_chunks.id AND usage_type = 'antrenman')) > 0
                AND NOT EXISTS (
                    SELECT 1 FROM generation_jobs 
                    WHERE chunk_id=note_chunks.id 
                    AND job_type='ANTRENMAN' 
                    AND status IN ('PENDING', 'PROCESSING')
                )
            `, [course.id, chunk.title, quota]);
        }

        // TEMİZLİK: Dosyadan silinen başlıklarını veritabanından da sil
        await client.query(
            `DELETE FROM note_chunks 
             WHERE course_id = $1 AND section_title != ALL($2)`,
            [course.id, currentSectionTitles]
        );

        await client.query('UPDATE courses SET last_hash = $1 WHERE id = $2', [fileHash, course.id]);
        await client.query('COMMIT');
        console.log(`[${slug}] Akıllı UPSERT tamamlandı (H3 Tabanlı).`);
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

async function triggerWorker() {
    console.log("Triggering generation worker...");
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !anonKey) {
        console.log("Worker trigger skipped: Missing ENV");
        return;
    }
    
    try {
        await fetch(`${supabaseUrl}/functions/v1/process-queue`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${anonKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ trigger: 'sync' })
        });
        console.log("Worker triggered successfully.");
    } catch (e) { 
        console.error("Worker trigger failed (non-fatal):", e.message); 
    }
}

function createChunkObj(title, lines, h1, h2) {
    // Unused legacy helper, keeping just in case or remove if strict
    return {}; 
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    syncNotes();
}
