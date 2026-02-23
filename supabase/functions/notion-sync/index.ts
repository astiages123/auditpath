import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Client } from 'https://esm.sh/@notionhq/client@3.1.1';
import { NotionToMarkdown } from 'https://esm.sh/notion-to-md@3.1.9';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';
import pLimit from 'https://esm.sh/p-limit@4.0.0';
import { corsHeaders } from '../_shared/cors.ts';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

// --- CONFIG & UTILS ---
const NOTION_TOKEN = Deno.env.get('NOTION_TOKEN');
const NOTION_DATABASE_ID = Deno.env.get('NOTION_DATABASE_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const MAX_CONCURRENT_PAGES = 3;
const TOLERANCE_MS = 2000;

const notion = new Client({ auth: NOTION_TOKEN });
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
const n2m = new NotionToMarkdown({ notionClient: notion });

// --- TYPES ---
interface NotionBlock {
  id: string;
  has_children: boolean;
  type: string;
  callout?: {
    rich_text: Array<{ plain_text: string }>;
    icon?: {
      type: 'emoji' | 'external' | 'file';
      emoji?: string;
    };
  };
  children?: NotionBlock[];
}

interface PageProperties {
  Durum?:
    | { type: 'status'; status: { name: string } }
    | { type: 'select'; select: { name: string } };
  Konu?: { type: 'title'; title: Array<{ plain_text: string }> };
  Name?: { type: 'title'; title: Array<{ plain_text: string }> };
  Ders?:
    | { type: 'select'; select: { name: string } }
    | { type: 'rich_text'; rich_text: Array<{ plain_text: string }> };
  Sıra?: { type: 'number'; number: number | null };
}

interface NotionPage {
  id: string;
  properties: PageProperties;
  last_edited_time: string;
}

interface ChunkMeta {
  notion_last_edited_time?: string;
  [key: string]: unknown;
}

interface ExistingChunk {
  timestamp: number;
  metadata: ChunkMeta;
  aiLogic: unknown;
}

interface ProcessResult {
  status: 'SYNCED' | 'SKIPPED' | 'ERROR';
  details?: string;
}

// --- ZOD SCHEMAS ---
const NotionBlockSchema = z.object({
  id: z.string(),
  has_children: z.boolean(),
  type: z.string(),
  callout: z
    .object({
      rich_text: z.array(z.object({ plain_text: z.string() })),
      icon: z
        .object({
          type: z.enum(['emoji', 'external', 'file']),
          emoji: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

const NotionPageSchema = z.object({
  id: z.string(),
  properties: z.record(z.unknown()),
  last_edited_time: z.string(),
});

function parseAsNotionBlock(data: unknown) {
  return NotionBlockSchema.safeParse(data);
}

function parseAsNotionBlocks(data: unknown) {
  return z.array(NotionBlockSchema).safeParse(data);
}

function parseAsNotionPages(data: unknown) {
  return z.array(NotionPageSchema).safeParse(data);
}

// --- CUSTOM TRANSFORMERS ---
function setupCalloutTransformer() {
  n2m.setCustomTransformer('callout', (block) => {
    const parsed = parseAsNotionBlock(block);
    if (!parsed.success) return false;
    const notionBlock = parsed.data;
    const callout = notionBlock.callout;
    if (!callout || !callout.rich_text) return false;

    let icon = '';
    if (callout.icon) {
      if (callout.icon.type === 'emoji') {
        icon = callout.icon.emoji || '';
      }
    }

    return (async () => {
      let titleContent = '';
      try {
        const tempBlock = {
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: callout.rich_text },
        };
        const mdResult = await n2m.blockToMarkdown(
          tempBlock as Parameters<typeof n2m.blockToMarkdown>[0]
        );
        titleContent =
          typeof mdResult === 'string'
            ? mdResult
            : (mdResult as { parent: string }).parent || '';
      } catch {
        titleContent = callout.rich_text.map((t) => t.plain_text).join('');
      }

      let childrenContent = '';
      if (notionBlock.has_children) {
        const children = (notionBlock as NotionBlock).children;
        if (children && children.length > 0) {
          const mdBlocks = await n2m.blocksToMarkdown(
            children as Parameters<typeof n2m.blocksToMarkdown>[0]
          );
          const mdStringObj = n2m.toMarkdownString(mdBlocks);
          childrenContent =
            typeof mdStringObj === 'string' ? mdStringObj : mdStringObj.parent;
        }
      }

      const trimmedTitle = titleContent.trim();
      const firstPart = icon ? `${icon} ${trimmedTitle}` : trimmedTitle;
      let combined = firstPart;

      if (childrenContent) combined += `\n${childrenContent}`;

      return combined
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
    })();
  });
}

// --- HELPER FUNCTIONS ---
async function getBlocksWithChildren(blockId: string): Promise<NotionBlock[]> {
  const response = await notion.blocks.children.list({ block_id: blockId });
  const parsed = parseAsNotionBlocks(response.results);
  const blocks = (parsed.success ? parsed.data : []) as NotionBlock[];

  const childPromises = blocks.map((block: NotionBlock) => {
    if (block.has_children) {
      return (async () => {
        block.children = await getBlocksWithChildren(block.id);
      })();
    }
    return Promise.resolve();
  });

  await Promise.all(childPromises);
  return blocks;
}

async function processPage(
  page: NotionPage,
  index: number,
  courseLookupMap: Map<string, string>,
  existingChunksMap: Map<string, ExistingChunk>,
  touchedCourses: Set<string>,
  activeSections: Set<string>
): Promise<ProcessResult> {
  const props = page.properties;

  let status = 'Taslak';
  if (props.Durum) {
    if (props.Durum.type === 'status') {
      status = props.Durum.status?.name || 'Taslak';
    } else if (props.Durum.type === 'select') {
      status = props.Durum.select?.name || 'Taslak';
    }
  }

  const lastEditedTimeStr = page.last_edited_time;
  const lastEditedTime = new Date(lastEditedTimeStr).getTime();

  const titleProp = props.Konu || props.Name;
  const sectionTitle =
    titleProp && titleProp.type === 'title'
      ? titleProp.title.map((t) => t.plain_text).join('')
      : 'Untitled Section';

  let courseName = '';
  if (props.Ders) {
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
    if (
      prevData?.timestamp &&
      lastEditedTime <= prevData.timestamp + TOLERANCE_MS
    ) {
      activeSections.add(uniqueKey);
      touchedCourses.add(courseId);
      return { status: 'SKIPPED', details: 'Up to date' };
    }
  }

  if (status !== 'Tamamlandı') return { status: 'SKIPPED', details: 'Draft' };
  if (!courseId) {
    return { status: 'ERROR', details: `Course '${courseName}' not found` };
  }

  let chunkOrder = index;
  if (
    props.Sıra &&
    props.Sıra.type === 'number' &&
    props.Sıra.number !== null
  ) {
    chunkOrder = props.Sıra.number;
  }

  touchedCourses.add(courseId);
  const uniqueKey = `${courseId}:::${sectionTitle}`;
  activeSections.add(uniqueKey);

  try {
    const blocks = await getBlocksWithChildren(page.id);
    const mdBlocks = await n2m.blocksToMarkdown(
      blocks as Parameters<typeof n2m.blocksToMarkdown>[0]
    );
    const mdString = n2m.toMarkdownString(mdBlocks);
    let rawContent = typeof mdString === 'string' ? mdString : mdString.parent;

    rawContent = rawContent.trim().replace(/\n{3,}/g, '\n\n');
    rawContent = rawContent.replace(
      /(^|\n)(\s*[-*+]\s+[^\n]+)\n{2,}(?=\s*[-*+]\s+)/g,
      '$1$2\n'
    );

    const baseMetadata = {
      ...(existingChunksMap.get(uniqueKey)?.metadata || {}),
      notion_last_edited_time: lastEditedTimeStr,
    };

    const { error: upsertError } = await supabase.from('note_chunks').upsert(
      [
        {
          course_id: courseId,
          course_name: courseName,
          section_title: sectionTitle,
          content: rawContent,
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
        },
      ],
      { onConflict: 'course_id,section_title,chunk_order' }
    );

    if (upsertError) throw upsertError;

    // Cleanup stale chunks
    await supabase
      .from('note_chunks')
      .delete()
      .eq('course_id', courseId)
      .eq('section_title', sectionTitle)
      .neq('chunk_order', chunkOrder);

    return { status: 'SYNCED' };
  } catch (err) {
    console.error(`Error processing page ${page.id}:`, err);
    return { status: 'ERROR', details: String(err) };
  }
}

// --- MAIN HANDLER ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    setupCalloutTransformer();

    // 1. Load context
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, name');
    const courseLookupMap = new Map<string, string>();
    coursesData?.forEach((c) => courseLookupMap.set(c.name.trim(), c.id));

    const { data: allChunks } = await supabase
      .from('note_chunks')
      .select('course_id, section_title, metadata, ai_logic');
    const existingChunksMap = new Map<string, ExistingChunk>();
    allChunks?.forEach((chunk) => {
      const key = `${chunk.course_id}:::${chunk.section_title}`;
      const meta = chunk.metadata as ChunkMeta;
      if (meta?.notion_last_edited_time) {
        const time = new Date(meta.notion_last_edited_time).getTime();
        if (!isNaN(time)) {
          const existing = existingChunksMap.get(key)?.timestamp || 0;
          if (time >= existing) {
            existingChunksMap.set(key, {
              timestamp: time,
              metadata: meta,
              aiLogic: chunk.ai_logic,
            });
          }
        }
      }
    });

    // 2. Fetch from Notion
    const response = await notion.databases.query({
      database_id: NOTION_DATABASE_ID!,
      filter: { property: 'Durum', status: { equals: 'Tamamlandı' } },
    });

    const filteredPages = response.results.filter(
      (page) => 'properties' in page
    );
    const parsed = parseAsNotionPages(filteredPages);
    const pages = (parsed.success ? parsed.data : []) as NotionPage[];
    const touchedCourses = new Set<string>();
    const activeSections = new Set<string>();

    // 3. Process Pages
    const limit = pLimit(MAX_CONCURRENT_PAGES);
    const results = await Promise.all(
      pages.map((page: NotionPage, index: number) =>
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
      )
    );

    // 4. Cleanup Orphans
    let deletedCount = 0;
    if (touchedCourses.size > 0) {
      const { data: dbChunks } = await supabase
        .from('note_chunks')
        .select('id, course_id, section_title')
        .in('course_id', Array.from(touchedCourses))
        .eq('status', 'SYNCED');

      if (dbChunks) {
        const toDelete = dbChunks.filter(
          (c) => !activeSections.has(`${c.course_id}:::${c.section_title}`)
        );
        if (toDelete.length > 0) {
          const { error: delErr } = await supabase
            .from('note_chunks')
            .delete()
            .in(
              'id',
              toDelete.map((c) => c.id)
            );
          if (!delErr) deletedCount = toDelete.length;
        }
      }
    }

    const stats = {
      synced: results.filter((r: ProcessResult) => r.status === 'SYNCED')
        .length,
      skipped: results.filter((r: ProcessResult) => r.status === 'SKIPPED')
        .length,
      deleted: deletedCount,
      errors: results.filter((r: ProcessResult) => r.status === 'ERROR').length,
    };

    return new Response(JSON.stringify({ success: true, stats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
