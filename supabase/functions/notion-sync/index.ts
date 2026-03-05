import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Client } from 'https://esm.sh/@notionhq/client@3.1.1';
import { NotionToMarkdown } from 'https://esm.sh/notion-to-md@3.1.9';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';
import pLimit from 'https://esm.sh/p-limit@4.0.0';
import { corsHeaders } from '../_shared/cors.ts';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

// --- CONFIG ---
const NOTION_TOKEN = Deno.env.get('NOTION_TOKEN');
const NOTION_DATABASE_ID = Deno.env.get('NOTION_DATABASE_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const NOTION_SYNC_TOKEN = Deno.env.get('NOTION_SYNC_TOKEN');

const MAX_CONCURRENT_PAGES = 3;
const TOLERANCE_MS = 2000;

const notion = new Client({ auth: NOTION_TOKEN });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const n2m = new NotionToMarkdown({ notionClient: notion });

// --- SCHEMAS ---
const NotionBlockSchema = z
  .object({
    id: z.string(),
    has_children: z.boolean(),
    type: z.string(),
    callout: z
      .object({
        rich_text: z.array(z.unknown()),
        icon: z.unknown().optional(),
      })
      .optional(),
  })
  .passthrough();

const NotionPageSchema = z
  .object({
    id: z.string(),
    properties: z.record(z.unknown()),
    last_edited_time: z.string(),
  })
  .passthrough();

type NotionBlock = z.infer<typeof NotionBlockSchema> & {
  children?: NotionBlock[];
};
type NotionPage = z.infer<typeof NotionPageSchema>;

// --- TRANSFORMERS ---
function setupCalloutTransformer() {
  n2m.setCustomTransformer('callout', async (block) => {
    const parsed = NotionBlockSchema.safeParse(block);
    if (!parsed.success) return false;

    const callout = parsed.data.callout;
    if (!callout) return false;

    const iconData = callout.icon as
      | { type?: string; emoji?: string }
      | undefined;
    const icon = iconData?.type === 'emoji' ? iconData.emoji : '';
    let titleContent = '';

    try {
      const mdResult = await n2m.blockToMarkdown({
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: callout.rich_text },
      } as Parameters<typeof n2m.blockToMarkdown>[0]);
      titleContent =
        typeof mdResult === 'string'
          ? mdResult
          : (mdResult as { parent: string }).parent || '';
    } catch {
      titleContent = (callout.rich_text as Array<{ plain_text?: string }>)
        .map((t) => t.plain_text || '')
        .join('');
    }

    let childrenContent = '';
    if (parsed.data.has_children) {
      const children = (block as NotionBlock).children;
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
    const combined =
      (icon ? `${icon} ${trimmedTitle}` : trimmedTitle) +
      (childrenContent ? `\n${childrenContent}` : '');
    return combined
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
  });
}

// --- HELPERS ---
async function getAllCompletedPages(): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let nextCursor: string | undefined;

  do {
    const response = await notion.databases.query({
      database_id: NOTION_DATABASE_ID!,
      filter: { property: 'Durum', status: { equals: 'Tamamlandı' } },
      page_size: 100,
      start_cursor: nextCursor,
    });

    const batch = z
      .array(NotionPageSchema)
      .parse(response.results.filter((p) => 'properties' in p));
    pages.push(...batch);

    if (response.has_more && !response.next_cursor) {
      throw new Error(
        'Notion database pagination returned has_more=true without next_cursor'
      );
    }

    nextCursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (nextCursor);

  return pages;
}

async function getBlocksWithChildren(blockId: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let nextCursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: nextCursor,
    });

    const batch = z
      .array(NotionBlockSchema)
      .parse(response.results) as NotionBlock[];
    blocks.push(...batch);

    if (response.has_more && !response.next_cursor) {
      throw new Error(
        `Notion block pagination returned has_more=true without next_cursor for block ${blockId}`
      );
    }

    nextCursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (nextCursor);

  await Promise.all(
    blocks.map(async (block) => {
      if (block.has_children) {
        block.children = await getBlocksWithChildren(block.id);
      }
    })
  );
  return blocks;
}

async function processPage(
  page: NotionPage,
  index: number,
  courseLookup: Map<string, string>,
  existingChunks: Map<
    string,
    { timestamp: number; metadata: unknown; aiLogic: unknown }
  >,
  touched: Set<string>,
  active: Set<string>
): Promise<{ status: string; details?: string }> {
  const props = page.properties as Record<string, unknown>;
  const lastTime = new Date(page.last_edited_time).getTime();

  const getPropName = (p: unknown) =>
    ((p as Record<string, unknown>)?.status as Record<string, string>)?.name ||
    ((p as Record<string, unknown>)?.select as Record<string, string>)?.name;

  const status = getPropName(props.Durum) || 'Taslak';

  const getTitle = (p: unknown) =>
    (p as Record<string, unknown>)?.title as Array<{ plain_text: string }>;

  const sectionTitle =
    (getTitle(props.Konu) || getTitle(props.Name))
      ?.map((t) => t.plain_text)
      .join('') || 'Untitled';

  const getDers = (p: unknown) => {
    const d = p as Record<string, unknown>;
    return (
      (d?.select as Record<string, string>)?.name ||
      (d?.rich_text as Array<{ plain_text: string }>)
        ?.map((t) => t.plain_text)
        .join('') ||
      ''
    );
  };
  const courseName = getDers(props.Ders).trim();
  const courseId = courseLookup.get(courseName);

  if (courseId) {
    const key = `${courseId}:::${sectionTitle}`;
    const prev = existingChunks.get(key);
    if (prev?.timestamp && lastTime <= prev.timestamp + TOLERANCE_MS) {
      active.add(key);
      touched.add(courseId);
      return { status: 'SKIPPED', details: 'Up to date' };
    }
  }

  if (status !== 'Tamamlandı') {
    return { status: 'SKIPPED', details: 'Not completed' };
  }
  if (!courseId) {
    console.log(
      `[DEBUG] Kurs bulunamadı: '${courseName}'. Supabase 'courses' tablosundaki 'name' alanı ile Notion'daki 'Ders' alanı birebir aynı olmalı.`
    );
    return { status: 'ERROR', details: `Course '${courseName}' not found` };
  }

  const getSıra = (p: unknown) =>
    (p as Record<string, unknown>)?.number as number | null;
  const chunkOrder = getSıra(props.Sıra) ?? index;
  touched.add(courseId);
  const uniqueKey = `${courseId}:::${sectionTitle}`;
  active.add(uniqueKey);

  try {
    const blocks = await getBlocksWithChildren(page.id);
    const mdBlocks = await n2m.blocksToMarkdown(
      blocks as Parameters<typeof n2m.blocksToMarkdown>[0]
    );
    const mdString = n2m.toMarkdownString(mdBlocks);
    const content = (typeof mdString === 'string' ? mdString : mdString.parent)
      .trim()
      .replace(/\n{3,}/g, '\n\n');

    const { error } = await supabase.from('note_chunks').upsert(
      [
        {
          course_id: courseId,
          course_name: courseName,
          section_title: sectionTitle,
          content,
          chunk_order: chunkOrder,
          status: 'SYNCED',
          metadata: {
            ...((existingChunks.get(uniqueKey)?.metadata as Record<
              string,
              unknown
            >) || {}),
            notion_last_edited_time: page.last_edited_time,
          },
          ai_logic: existingChunks.get(uniqueKey)?.aiLogic
            ? {
                ...(existingChunks.get(uniqueKey)?.aiLogic as Record<
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

    if (error) throw error;
    await supabase
      .from('note_chunks')
      .delete()
      .eq('course_id', courseId)
      .eq('section_title', sectionTitle)
      .neq('chunk_order', chunkOrder);
    return { status: 'SYNCED' };
  } catch (err) {
    return { status: 'ERROR', details: String(err) };
  }
}

// --- MAIN ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    setupCalloutTransformer();

    // --- AUTHORIZATION CHECK ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing Authorization header',
        }),
        {
          status: 401,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/, '');
    if (!NOTION_SYNC_TOKEN || token !== NOTION_SYNC_TOKEN) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid or missing sync token',
        }),
        {
          status: 403,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: courses } = await supabase.from('courses').select('id, name');
    const courseLookup = new Map(courses?.map((c) => [c.name.trim(), c.id]));

    const { data: chunks } = await supabase
      .from('note_chunks')
      .select('course_id, section_title, metadata, ai_logic');
    const existingMap = new Map<
      string,
      { timestamp: number; metadata: unknown; aiLogic: unknown }
    >();
    chunks?.forEach((c) => {
      const key = `${c.course_id}:::${c.section_title}`;
      const meta = c.metadata as Record<string, unknown>;
      const time = new Date(
        (meta?.notion_last_edited_time as string) || ''
      ).getTime();
      if (!isNaN(time) && time >= (existingMap.get(key)?.timestamp || 0)) {
        existingMap.set(key, {
          timestamp: time,
          metadata: c.metadata,
          aiLogic: c.ai_logic,
        });
      }
    });

    const pages = await getAllCompletedPages();

    console.log(
      `[DEBUG] Notion'dan 'Tamamlandı' durumunda ${pages.length} sayfa bulundu.`
    );

    const touched = new Set<string>();
    const active = new Set<string>();

    const limit = pLimit(MAX_CONCURRENT_PAGES);
    const results = await Promise.all(
      pages.map((p, i) =>
        limit(() =>
          processPage(p, i, courseLookup, existingMap, touched, active)
        )
      )
    );

    // --- Removed: Curriculum Sync (Now managed directly in DB) ---

    let deleted = 0;
    if (touched.size > 0) {
      const { data: dbChunks } = await supabase
        .from('note_chunks')
        .select('id, course_id, section_title')
        .in('course_id', Array.from(touched))
        .eq('status', 'SYNCED');
      const toDelete =
        dbChunks?.filter(
          (c) => !active.has(`${c.course_id}:::${c.section_title}`)
        ) || [];
      if (toDelete.length > 0) {
        const { error } = await supabase
          .from('note_chunks')
          .delete()
          .in(
            'id',
            toDelete.map((c) => c.id)
          );
        if (!error) {
          deleted = toDelete.length;
        }
      }
    }

    const stats = {
      synced: results.filter((r) => r.status === 'SYNCED').length,
      skipped: results.filter((r) => r.status === 'SKIPPED').length,
      deleted,
      errors: results.filter((r) => r.status === 'ERROR').length,
    };

    return new Response(JSON.stringify({ success: true, stats }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      }
    );
  }
});
