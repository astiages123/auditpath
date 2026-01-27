import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import type { Database } from "../src/shared/types/supabase";
import type {
    BlockObjectResponse,
    RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";

// --- Environment Variables ---
const CRON_SECRET = process.env.CRON_SECRET!;
const NOTION_TOKEN = process.env.NOTION_TOKEN!;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID!;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// --- Clients ---
const notion = new Client({ auth: NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- Types ---
interface ProcessedChunk {
    course_id: string;
    course_name: string;
    section_title: string;
    content: string;
    chunk_order: number;
    is_ready: boolean;
    status: "SYNCED"; // Trigger tetiklenmemesi için SYNCED (enum'a eklendi)
    char_count: number;
    word_count: number;
    metadata: { images: string[] };
}

interface SyncResult {
    success: boolean;
    processed: number;
    errors: string[];
}

// --- Helpers ---

/**
 * Supabase Storage'a WebP olarak görsel yükler
 */
async function uploadImageAsWebP(
    imageUrl: string,
    courseId: string,
    sectionTitle: string,
    index: number,
): Promise<string | null> {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) return null;

        const buffer = await response.arrayBuffer();
        const webpBuffer = await sharp(Buffer.from(buffer))
            .resize({ width: 1200, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

        const sanitizedSection = sectionTitle.replace(/[^a-zA-Z0-9-_]/g, "_");
        const path =
            `lessons/${courseId}/${sanitizedSection}/img_${index}.webp`;

        const { error } = await supabase.storage
            .from("lessons")
            .upload(path, webpBuffer, {
                contentType: "image/webp",
                upsert: true,
            });

        if (error) {
            console.error("Storage upload error:", error);
            return null;
        }

        const { data: urlData } = supabase.storage.from("lessons").getPublicUrl(
            path,
        );
        return urlData.publicUrl;
    } catch (err) {
        console.error("Image processing error:", err);
        return null;
    }
}

/**
 * Markdown içindeki görselleri işler ve URL'lerini WebP olarak değiştirir
 */
async function processImagesInMarkdown(
    markdown: string,
    courseId: string,
    sectionTitle: string,
): Promise<{ content: string; imageUrls: string[] }> {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const matches = Array.from(markdown.matchAll(imageRegex));
    const imageUrls: string[] = [];
    let processedContent = markdown;

    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const originalUrl = match[2];
        const webpUrl = await uploadImageAsWebP(
            originalUrl,
            courseId,
            sectionTitle,
            i,
        );

        if (webpUrl) {
            imageUrls.push(webpUrl);
            processedContent = processedContent.replace(
                match[0],
                `![${match[1]}](${webpUrl})`,
            );
        }
    }

    return { content: processedContent, imageUrls };
}

/**
 * Toggle H1 bloğunun içinde Divider olup olmadığını kontrol eder
 */
async function checkForDividerInToggle(blockId: string): Promise<boolean> {
    try {
        const children = await notion.blocks.children.list({
            block_id: blockId,
        });
        return children.results.some(
            (block) => "type" in block && block.type === "divider",
        );
    } catch {
        return false;
    }
}

/**
 * Notion page'inden toggle H1 bloklarını parse eder
 */
async function parseNotionPage(
    pageId: string,
    courseId: string,
    courseName: string,
): Promise<ProcessedChunk[]> {
    const chunks: ProcessedChunk[] = [];

    try {
        const blocks = await notion.blocks.children.list({ block_id: pageId });
        let chunkOrder = 0;

        for (const block of blocks.results) {
            if (!("type" in block)) continue;
            const typedBlock = block as BlockObjectResponse;

            if (typedBlock.type === "heading_1" && "heading_1" in typedBlock) {
                const h1 = typedBlock.heading_1;
                const isToggle = h1.is_toggleable;

                if (!isToggle) continue;

                // Section title'ı al
                const sectionTitle = h1.rich_text.map((t) =>
                    t.plain_text
                ).join("") || "Untitled";

                // Toggle içeriğini markdown'a çevir
                const mdBlocks = await n2m.pageToMarkdown(typedBlock.id);
                const mdString = n2m.toMarkdownString(mdBlocks);
                const rawContent = typeof mdString === "string"
                    ? mdString
                    : mdString.parent;

                // Divider kontrolü
                const hasDivider = await checkForDividerInToggle(typedBlock.id);

                // Görselleri işle
                const { content, imageUrls } = await processImagesInMarkdown(
                    rawContent,
                    courseId,
                    sectionTitle,
                );

                chunks.push({
                    course_id: courseId,
                    course_name: courseName,
                    section_title: sectionTitle,
                    content,
                    chunk_order: chunkOrder++,
                    is_ready: hasDivider,
                    status: "SYNCED", // Trigger tetiklenmemesi için SYNCED
                    char_count: content.length,
                    word_count: content.split(/\s+/).filter(Boolean).length,
                    metadata: { images: imageUrls },
                });
            }
        }
    } catch (err) {
        console.error(`Error parsing page ${pageId}:`, err);
    }

    return chunks;
}

/**
 * Ana senkronizasyon fonksiyonu
 */
async function syncNotionToSupabase(): Promise<SyncResult> {
    const result: SyncResult = { success: true, processed: 0, errors: [] };

    try {
        // Notion database'inden sayfaları çek
        const pages = await notion.databases.query({
            database_id: NOTION_DATABASE_ID,
        });

        for (const page of pages.results) {
            if (!("properties" in page)) continue;

            // Page properties'den course bilgilerini al
            const props = page.properties;
            const courseId =
                "course_id" in props && props.course_id.type === "rich_text"
                    ? (props.course_id.rich_text as RichTextItemResponse[]).map(
                        (t: RichTextItemResponse) => t.plain_text,
                    ).join(
                        "",
                    )
                    : page.id;
            const courseName = "Name" in props && props.Name.type === "title"
                ? (props.Name.title as RichTextItemResponse[]).map((
                    t: RichTextItemResponse,
                ) => t.plain_text).join("")
                : "Untitled Course";

            // Toggle H1'ları parse et
            const chunks = await parseNotionPage(page.id, courseId, courseName);

            // Supabase'e upsert
            for (const chunk of chunks) {
                const { error } = await supabase.from("note_chunks").upsert(
                    {
                        course_id: chunk.course_id,
                        course_name: chunk.course_name,
                        section_title: chunk.section_title,
                        content: chunk.content,
                        chunk_order: chunk.chunk_order,
                        is_ready: chunk.is_ready,
                        // SYNCED migration uygulandıktan sonra as assertion kaldırılabilir
                        status: chunk.status as
                            | "DRAFT"
                            | "PENDING"
                            | "PROCESSING"
                            | "COMPLETED"
                            | "FAILED",
                        char_count: chunk.char_count,
                        word_count: chunk.word_count,
                        metadata: chunk.metadata,
                    },
                    {
                        onConflict: "course_id,section_title",
                    },
                );

                if (error) {
                    result.errors.push(
                        `Upsert error for ${chunk.section_title}: ${error.message}`,
                    );
                } else {
                    result.processed++;
                }
            }
        }
    } catch (err) {
        result.success = false;
        result.errors.push(
            `Sync failed: ${err instanceof Error ? err.message : String(err)}`,
        );
    }

    return result;
}

// --- Handler ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CRON_SECRET doğrulaması
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    // Sadece GET ve POST'a izin ver
    if (req.method !== "GET" && req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const result = await syncNotionToSupabase();

    return res.status(result.success ? 200 : 500).json(result);
}

// Force rebuild: 2026-01-27
