import { DRY_RUN } from './config';
import { getBlocksWithChildren, n2m, supabase } from './clients';
import { processImagesInMarkdown } from './image-process';
import type {
  NoteChunksInsert,
  PageObjectResponse,
  PageProcessResult,
  RichTextItemResponse,
} from './types';

const TOLERANCE_MS = 2000;

export async function processPage(
  page: PageObjectResponse,
  index: number,
  courseLookupMap: Map<string, string>,
  existingChunksMap: Map<
    string,
    { timestamp: number; metadata: Record<string, unknown>; aiLogic: unknown }
  >,
  touchedCourses: Set<string>,
  activeSections: Set<string>
): Promise<PageProcessResult> {
  const props = page.properties;

  let status = 'Taslak';
  if ('Durum' in props) {
    if (props.Durum.type === 'status') {
      status = props.Durum.status?.name || 'Taslak';
    } else if (props.Durum.type === 'select') {
      status = props.Durum.select?.name || 'Taslak';
    }
  }

  const lastEditedTimeStr = page.last_edited_time;
  const lastEditedTime = new Date(lastEditedTimeStr).getTime();

  const titleProp = props['Konu'] || props['Name'];
  const sectionTitle =
    titleProp && titleProp.type === 'title'
      ? (titleProp.title as RichTextItemResponse[])
          .map((t) => t.plain_text)
          .join('')
      : 'Untitled Section';

  // Find courseId to check cache
  let courseName = '';
  if ('Ders' in props) {
    if (props.Ders.type === 'select') {
      courseName = props.Ders.select?.name || '';
    } else if (props.Ders.type === 'rich_text') {
      courseName = props.Ders.rich_text.map((t) => t.plain_text).join('');
    }
  }
  courseName = courseName.trim();
  const courseId = courseName ? courseLookupMap.get(courseName) : undefined;

  if (courseId) {
    const uniqueKey = `${courseId}:::${sectionTitle}`;
    const prevData = existingChunksMap.get(uniqueKey);
    const prevSyncedTime = prevData?.timestamp;
    if (prevSyncedTime && lastEditedTime <= prevSyncedTime + TOLERANCE_MS) {
      // Still need to add to activeSections for cleanup logic
      activeSections.add(uniqueKey);
      touchedCourses.add(courseId);
      console.log(`Skipping "${sectionTitle}": No changes detected.`);
      return { status: 'SKIPPED', details: 'Up to date' };
    }
  }

  if (status !== 'Tamamlandı') {
    return { status: 'SKIPPED', details: 'Draft or not ready' };
  }

  if (!courseName) {
    console.warn(`Skipping page ${page.id}: 'Ders' name is empty.`);
    return { status: 'ERROR', details: 'Missing Course Name' };
  }

  if (!courseId) {
    console.error(
      `Error: Course name '${courseName}' not found in courses table. Skipping.`
    );
    return { status: 'ERROR', details: 'Course Not Found' };
  }

  let chunkOrder = index;
  if (
    'Sıra' in props &&
    props.Sıra.type === 'number' &&
    props.Sıra.number !== null
  ) {
    chunkOrder = props.Sıra.number;
  }

  touchedCourses.add(courseId);
  const uniqueKey = `${courseId}:::${sectionTitle}`;
  activeSections.add(uniqueKey);

  console.log(
    `Processing Chunk: [${courseId}] ${sectionTitle} (Order: ${chunkOrder})`
  );

  try {
    const blocks = await getBlocksWithChildren(page.id);
    const mdBlocks = await n2m.blocksToMarkdown(blocks);
    const mdString = n2m.toMarkdownString(mdBlocks);
    let rawContent = typeof mdString === 'string' ? mdString : mdString.parent;

    rawContent = rawContent.trim().replace(/\n{3,}/g, '\n\n');
    rawContent = rawContent.replace(
      /(^|\n)(\s*[-*+]\s+[^\n]+)\n{2,}(?=\s*[-*+]\s+)/g,
      '$1$2\n'
    );

    const { content: processedContent, imageUrls } =
      await processImagesInMarkdown(rawContent, courseId, sectionTitle);

    const baseMetadata = {
      ...(existingChunksMap.get(uniqueKey)?.metadata || {}),
      images: imageUrls,
      notion_last_edited_time: lastEditedTimeStr,
    };

    if (DRY_RUN) {
      console.log(`[DRY RUN] Would upsert section: ${sectionTitle}`);
    } else {
      const { error: upsertError } = await supabase.from('note_chunks').upsert(
        [
          {
            course_id: courseId,
            course_name: courseName,
            section_title: sectionTitle,
            content: processedContent,
            chunk_order: chunkOrder,
            status: 'SYNCED',
            metadata: baseMetadata,
            ai_logic: existingChunksMap.get(uniqueKey)?.aiLogic
              ? {
                  ...(existingChunksMap.get(uniqueKey)?.aiLogic as Record<
                    string,
                    unknown
                  >),
                  invalidated_at: new Date().toISOString(),
                }
              : null,
          } as NoteChunksInsert,
        ],
        { onConflict: 'course_id,section_title,chunk_order' }
      );

      if (upsertError) {
        console.error(
          `Upsert error for '${sectionTitle}':`,
          upsertError.message
        );
        return { status: 'ERROR', details: upsertError.message };
      }
    }

    if (!DRY_RUN) {
      const { error: cleanupError } = await supabase
        .from('note_chunks')
        .delete()
        .eq('course_id', courseId)
        .eq('section_title', sectionTitle)
        .neq('chunk_order', chunkOrder);

      if (cleanupError) {
        console.warn('Error cleaning up stale chunks:', cleanupError);
      }
    } else {
      console.log(
        `[DRY RUN] Would cleanup stale chunks for [${courseId}] ${sectionTitle}`
      );
    }

    return { status: 'SYNCED' };
  } catch (err) {
    console.error(`Error processing page ${page.id}:`, err);
    return { status: 'ERROR', details: String(err) };
  }
}
