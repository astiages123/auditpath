import { DRY_RUN } from './config';
import { n2m, supabase } from './clients';
import { processImagesInMarkdown } from './image-process';
import { chunkContent } from './chunk-service';
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
  existingChunksMap: Map<string, number>,
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

  if (status !== 'Tamamlandı') {
    return { status: 'SKIPPED', details: 'Draft or not ready' };
  }

  let courseName = '';
  if ('Ders' in props) {
    if (props.Ders.type === 'select') {
      courseName = props.Ders.select?.name || '';
    } else if (props.Ders.type === 'rich_text') {
      courseName = props.Ders.rich_text.map((t) => t.plain_text).join('');
    }
  }

  courseName = courseName.trim();

  if (!courseName) {
    console.warn(`Skipping page ${page.id}: 'Ders' name is empty.`);
    return { status: 'ERROR', details: 'Missing Course Name' };
  }

  const courseId = courseLookupMap.get(courseName);

  if (!courseId) {
    console.error(
      `Error: Course name '${courseName}' not found in courses table. Skipping.`
    );
    return { status: 'ERROR', details: 'Course Not Found' };
  }

  const titleProp = props['Konu'] || props['Name'];
  const sectionTitle =
    titleProp && titleProp.type === 'title'
      ? (titleProp.title as RichTextItemResponse[])
          .map((t) => t.plain_text)
          .join('')
      : 'Untitled Section';

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

  const lastEditedTimeStr = page.last_edited_time;
  const lastEditedTime = new Date(lastEditedTimeStr).getTime();
  const prevSyncedTime = existingChunksMap.get(uniqueKey);

  if (prevSyncedTime && lastEditedTime <= prevSyncedTime + TOLERANCE_MS) {
    console.log(`Skipping "${sectionTitle}": No changes detected.`);
    return { status: 'SKIPPED', details: 'Up to date' };
  }

  try {
    const mdBlocks = await n2m.pageToMarkdown(page.id, null);
    const mdString = n2m.toMarkdownString(mdBlocks);
    let rawContent = typeof mdString === 'string' ? mdString : mdString.parent;

    rawContent = rawContent.trim().replace(/\n{3,}/g, '\n\n');
    rawContent = rawContent.replace(
      /(^|\n)(\s*[-*+]\s+[^\n]+)\n{2,}(?=\s*[-*+]\s+)/g,
      '$1$2\n'
    );

    const { content, imageUrls } = await processImagesInMarkdown(
      rawContent,
      courseId,
      sectionTitle
    );

    const chunks = chunkContent(content);

    const baseMetadata = {
      images: imageUrls,
      notion_last_edited_time: lastEditedTimeStr,
    };

    for (let i = 0; i < chunks.length; i++) {
      const chunkObj = chunks[i];
      const chunkText = chunkObj.content;
      const displayText = chunkObj.displayContent;

      if (DRY_RUN) {
        console.log(`[DRY RUN] Would upsert chunk: ${sectionTitle}`);
        continue;
      }

      const { error: upsertError } = await supabase.from('note_chunks').upsert(
        [
          {
            course_id: courseId,
            course_name: courseName,
            section_title: sectionTitle,
            content: chunkText,
            display_content: displayText,
            chunk_order: chunkOrder,
            status: 'SYNCED',
            metadata: baseMetadata,
          } as NoteChunksInsert,
        ],
        { onConflict: 'course_id,section_title,chunk_order' }
      );

      if (upsertError) {
        console.error(
          `Upsert error for '${sectionTitle}' (seq: ${i}):`,
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
