import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function linkOrphans() {
    console.log("🔍 Checking for orphaned questions (via PG)...");
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Get all chunks
        const resChunks = await client.query('SELECT id, section_title, course_id FROM note_chunks');
        const chunks = resChunks.rows;

        let updatedCount = 0;

        for (const chunk of chunks) {
            // Find questions with matching title but NO chunk_id
            const resOrphans = await client.query(
                'SELECT id FROM questions WHERE section_title = $1 AND chunk_id IS NULL',
                [chunk.section_title]
            );
            const orphans = resOrphans.rows;

            if (orphans.length > 0) {
                console.log(`🔗 Linking ${orphans.length} questions to chunk: ${chunk.section_title}`);
                const orphanIds = orphans.map(o => o.id);

                // Update questions
                await client.query(
                    'UPDATE questions SET chunk_id = $1, course_id = $2 WHERE id = ANY($3)',
                    [chunk.id, chunk.course_id, orphanIds]
                );

                updatedCount += orphans.length;
                
                // Mark chunk as COMPLETED
                await client.query(
                    "UPDATE note_chunks SET status = 'COMPLETED', is_ready = true WHERE id = $1",
                    [chunk.id]
                );
            }
        }

        await client.query('COMMIT');
        console.log(`✅ Linked total ${updatedCount} orphaned questions.`);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Error:", e);
    } finally {
        client.release();
        await pool.end();
    }
}

linkOrphans();
