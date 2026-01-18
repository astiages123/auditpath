
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
                (course_id, course_name, section_title, content, chunk_order, char_count, word_count, checksum, parent_h1_id, parent_h2_id) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (course_id, section_title) 
                DO UPDATE SET 
                    content = EXCLUDED.content,
                    chunk_order = EXCLUDED.chunk_order,
                    char_count = EXCLUDED.char_count,
                    word_count = EXCLUDED.word_count,
                    checksum = EXCLUDED.checksum,
                    parent_h1_id = EXCLUDED.parent_h1_id,
                    parent_h2_id = EXCLUDED.parent_h2_id
                WHERE note_chunks.checksum IS DISTINCT FROM EXCLUDED.checksum`, 
                [course.id, course.name, chunk.title, chunk.content, i, charCount, wordCount, chunkChecksum, chunk.h1, chunk.h2]
            );
        }

        // TEMİZLİK: Dosyadan silinen H3 başlıklarını veritabanından da sil
        await client.query(
            `DELETE FROM note_chunks 
             WHERE course_id = $1 AND section_title != ALL($2)`,
            [course.id, currentSectionTitles]
        );

        await client.query('UPDATE courses SET last_hash = $1 WHERE id = $2', [fileHash, course.id]);
        await client.query('COMMIT');
        console.log(`[${slug}] Akıllı UPSERT tamamlandı. Değişmeyen chunk'lara dokunulmadı.`);
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
    let currentH1 = courseName; // Default H1 ders adıdır
    let currentH2 = "";
    let currentH3Title = "Giriş";
    let currentBuffer = [];

    const addChunk = (title, buffer, h1, h2) => {
        const chunk = createChunkObj(title, buffer, h1, h2);
        if (chunk.content.length > 0) {
            chunks.push(chunk);
        }
    };

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('# ')) {
            currentH1 = trimmed.replace('# ', '').trim();
        } else if (trimmed.startsWith('## ')) {
            currentH2 = trimmed.replace('## ', '').trim();
        } else if (trimmed.startsWith('### ')) {
            // Yeni H3 geldiğinde eldeki buffer'ı kaydet
            addChunk(currentH3Title, currentBuffer, currentH1, currentH2);
            
            currentH3Title = trimmed.replace('### ', '').trim();
            currentBuffer = [line]; // Başlığı içeriğe dahil et
        } else {
            currentBuffer.push(line);
        }
    }
    // Son kalan chunk
    addChunk(currentH3Title, currentBuffer, currentH1, currentH2);
    return chunks;
}

function createChunkObj(title, lines, h1, h2) {
    const content = lines.join('\n').trim();
    // LaTeX ve Tablolar zaten content içinde ham (raw) olarak korunur.
    return {
        title: title,
        content: content,
        h1: h1,
        h2: h2
    };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    syncNotes();
}
