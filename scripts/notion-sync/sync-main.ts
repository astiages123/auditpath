import pLimit from 'p-limit';

import { DRY_RUN, MAX_CONCURRENT_PAGES, NOTION_DATABASE_ID } from './config';
import { notion, supabase } from './clients';
import { setupCalloutTransformer } from './clients';
import { processPage } from './page-processor';
import type {
  NoteChunksSelect,
  PageObjectResponse,
  SyncStatistics,
} from './types';

export async function syncNotionToSupabase(): Promise<SyncStatistics> {
  const startTime = new Date();
  console.log(`Starting sync... (Dry Run: ${DRY_RUN})`);

  await setupCalloutTransformer();

  console.log('Fetching courses from Supabase for lookup...');
  const { data: coursesData, error: coursesError } = await supabase
    .from('courses')
    .select('id, name');

  if (coursesError || !coursesData) {
    console.error(
      'Fatal Error: Could not fetch courses from Supabase.',
      coursesError
    );
    process.exit(1);
  }

  const courseLookupMap = new Map<string, string>();
  (coursesData as { id: string; name: string }[]).forEach((c) => {
    courseLookupMap.set(c.name.trim(), c.id);
  });
  console.log(`Loaded ${courseLookupMap.size} courses into lookup map.`);

  console.log('Fetching existing chunks for fast lookup...');
  const { data: allChunks, error: chunksError } = await supabase
    .from('note_chunks')
    .select('course_id, section_title, metadata, ai_logic');

  if (chunksError) {
    console.error('Error fetching existing chunks:', chunksError);
  }

  const existingChunksMap = new Map<
    string,
    { timestamp: number; metadata: Record<string, unknown>; aiLogic: unknown }
  >();
  if (allChunks && allChunks.length > 0) {
    (allChunks as NoteChunksSelect[]).forEach((chunk) => {
      const key = `${chunk.course_id}:::${chunk.section_title}`;
      const meta = chunk.metadata as Record<string, unknown> | null;
      const aiLogic = chunk.ai_logic;
      if (meta && meta.notion_last_edited_time) {
        const time = new Date(meta.notion_last_edited_time as string).getTime();
        if (!isNaN(time)) {
          const existing = existingChunksMap.get(key)?.timestamp || 0;
          if (time >= existing) {
            existingChunksMap.set(key, {
              timestamp: time,
              metadata: meta,
              aiLogic,
            });
          }
        }
      } else if (meta) {
        const existing = existingChunksMap.get(key);
        if (!existing) {
          existingChunksMap.set(key, { timestamp: 0, metadata: meta, aiLogic });
        }
      }
    });
  }
  console.log(
    `Loaded ${existingChunksMap.size} existing chunks into cache map.`
  );
  if (existingChunksMap.size === 0 && allChunks && allChunks.length > 0) {
    console.log(
      'Warning: Chunks found but no valid metadata. Check if metadata keys match.'
    );
  }

  console.log('Connecting to Notion...');
  const response = await notion.databases.query({
    database_id: NOTION_DATABASE_ID as string,
    filter: {
      property: 'Durum',
      status: { equals: 'Tamamlandı' },
    },
  });

  const pages = response.results.filter(
    (page): page is PageObjectResponse => 'properties' in page
  );

  console.log(
    `Found ${pages.length} pages (rows) in Notion with Status='Tamamlandı'.`
  );

  const touchedCourses = new Set<string>();
  const activeSections = new Set<string>();

  console.log('Starting parallel processing...');
  const limit = pLimit(MAX_CONCURRENT_PAGES);

  const promises = pages.map((page, index) =>
    limit(() =>
      processPage(
        page,
        index,
        courseLookupMap,
        existingChunksMap,
        touchedCourses,
        activeSections
      )
    )
  );

  const results = await Promise.all(promises);

  const totalProcessed = results.filter((r) => r.status === 'SYNCED').length;
  const skippedCount = results.filter((r) => r.status === 'SKIPPED').length;
  const errorCount = results.filter((r) => r.status === 'ERROR').length;

  let deletedCount = 0;
  if (touchedCourses.size > 0) {
    console.log('\n--- Checking for orphaned records ---');
    try {
      const { data: dbChunks, error: fetchError } = await supabase
        .from('note_chunks')
        .select('id, course_id, section_title')
        .in('course_id', Array.from(touchedCourses))
        .eq('status', 'SYNCED');

      if (fetchError) {
        console.error('Error fetching chunks for cleanup:', fetchError);
      } else if (dbChunks) {
        interface DbChunk {
          id: string;
          course_id: string;
          section_title: string;
        }
        const chunksToDelete = (dbChunks as DbChunk[]).filter((chunk) => {
          const key = `${chunk.course_id}:::${chunk.section_title}`;
          return !activeSections.has(key);
        });

        if (chunksToDelete.length > 0) {
          console.log(`Found ${chunksToDelete.length} orphaned sections.`);

          if (DRY_RUN) {
            chunksToDelete.forEach((c) => {
              console.log(
                `[DRY RUN] Would delete orphaned section: [${c.course_id}] ${c.section_title}`
              );
              deletedCount++;
            });
          } else {
            const idsToDelete = chunksToDelete.map((c) => c.id);
            const { error: deleteError } = await supabase
              .from('note_chunks')
              .delete()
              .in('id', idsToDelete);

            if (deleteError) {
              console.error('Error deleting orphaned records:', deleteError);
            } else {
              chunksToDelete.forEach((c) => {
                console.log(
                  `Deleted orphaned section: [${c.course_id}] ${c.section_title}`
                );
                deletedCount++;
              });
            }
          }
        } else {
          console.log('No orphaned records found.');
        }
      }
    } catch (cleanupErr) {
      console.error('Cleanup process failed:', cleanupErr);
    }
  }

  const endTime = new Date();
  const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
  const finalStatus =
    errorCount > 0 ? 'FAILED' : DRY_RUN ? 'DRY_RUN' : 'SUCCESS';

  console.log('\n-----------------------------------');
  console.log(`Sync Completed (${finalStatus}). Duration: ${durationSeconds}s`);
  console.log(`Processed (Synced): ${totalProcessed}`);
  console.log(`Skipped (Up-to-date/Draft): ${skippedCount}`);
  console.log(`Deleted: ${deletedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('-----------------------------------');

  if (DRY_RUN) {
    console.log('[DRY RUN] Sync finished without DB logging.');
  }

  return {
    totalProcessed,
    skipped: skippedCount,
    deleted: deletedCount,
    errors: errorCount,
    durationSeconds,
    status: finalStatus,
  };
}
