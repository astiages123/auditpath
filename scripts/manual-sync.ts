import "dotenv/config";
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
const NOTION_TOKEN = process.env.NOTION_TOKEN!;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID!;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Validate Environment Variables
if (
    !NOTION_TOKEN || !NOTION_DATABASE_ID || !SUPABASE_URL ||
    !SUPABASE_SERVICE_KEY
) {
    console.error(
        "Missing required environment variables. Please check your .env file.",
    );
    process.exit(1);
}

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
    status: "SYNCED"; // Trigger tetiklenmemesi için SYNCED
    char_count: number;
    word_count: number;
    metadata: { images: string[] };
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
        console.log(
            `Processing image ${
                i + 1
            }/${matches.length} for section "${sectionTitle}"...`,
        );

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
                console.log(`Found section: "${sectionTitle}"`);

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
                    status: "SYNCED",
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

// --- Main Execution ---

function slugify(text: string): string {
    // Türkçe karakter dönüşüm haritası
    const turkishMap: Record<string, string> = {
        "ş": "s",
        "Ş": "S",
        "ı": "i",
        "I": "I", // Türkçe 'I' ASCII 'I' olarak kalacak
        "İ": "I",
        "ğ": "g",
        "Ğ": "G",
        "ü": "u",
        "Ü": "U",
        "ö": "o",
        "Ö": "O",
        "ç": "c",
        "Ç": "C",
    };

    return text
        .toString()
        .split("")
        .map((char) => turkishMap[char] || char)
        .join("")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-") // Replace spaces with -
        .replace(/[^\w-]+/g, "") // Remove all non-word chars
        .replace(/-+/g, "-") // Replace multiple - with single -
        .replace(/^-+/, "") // Trim - from start of text
        .replace(/-+$/, ""); // Trim - from end of text
}

async function ensureCourseExists(courseId: string, courseName: string) {
    const slug = slugify(courseName);

    // Check if course exists first to avoid unnecessary updates if possible,
    // or just upsert. Upsert is safer.
    // courses table requires: id, course_slug, name.

    const { error } = await supabase.from("courses").upsert({
        id: courseId,
        name: courseName,
        course_slug: slug,
        // Optional fields can be left null or default
    }, { onConflict: "id" });

    if (error) {
        console.error(
            `Error ensuring course exists (${courseName}):`,
            error.message,
        );
        throw error;
    } else {
        console.log(`Verified course: ${courseName}`);
    }
}

async function syncNotionToSupabase() {
    console.log("Connecting to Notion...");
    const pages = await notion.databases.query({
        database_id: NOTION_DATABASE_ID,
    });
    console.log(`Found ${pages.results.length} pages in Notion.`);

    let totalProcessed = 0;
    let totalErrors = 0;

    for (const page of pages.results) {
        if (!("properties" in page)) continue;

        // Page properties'den course bilgilerini al
        const props = page.properties;
        const courseId =
            "course_id" in props && props.course_id.type === "rich_text"
                ? (props.course_id.rich_text as RichTextItemResponse[]).map((
                    t,
                ) => t.plain_text).join("")
                : page.id;

        // FIXED: Property adı "Name" değil "Ders Adı" olarak geliyor.
        const titleProp = props["Ders Adı"] || props["Name"]; // Fallback'li yapı
        const courseName = titleProp && titleProp.type === "title"
            ? (titleProp.title as RichTextItemResponse[]).map((t) =>
                t.plain_text
            ).join("")
            : "Untitled Course";

        console.log(`\nProcessing Course: ${courseName} (${courseId})`);

        try {
            await ensureCourseExists(courseId, courseName);
        } catch (err) {
            console.error(
                `Skipping course ${courseName} due to database error.`,
                err,
            );
            continue;
        }

        // Toggle H1'ları parse et
        const chunks = await parseNotionPage(page.id, courseId, courseName);
        console.log(
            `Found ${chunks.length} chunks for course ${courseName}. Syncing to Supabase...`,
        );

        // Supabase'e incremental sync (Merge Metadata)
        for (const chunk of chunks) {
            // 1. Check if chunk exists to preserve metadata (concept_map etc.)
            const { data: existingChunk } = await supabase
                .from("note_chunks")
                .select("metadata")
                .eq("course_id", chunk.course_id)
                .eq("section_title", chunk.section_title)
                .maybeSingle();

            // 2. Merge metadata
            let finalMetadata = chunk.metadata; // Contains new images from this run

            if (existingChunk && existingChunk.metadata) {
                // Cast to any to merge safely
                const existingMeta = existingChunk.metadata as Record<
                    string,
                    unknown
                >;

                finalMetadata = {
                    ...existingMeta, // Keep existing fields (concept_map, etc.)
                    ...chunk.metadata, // Overwrite with new fields from this run (images)
                    // Explicitly ensure images are updated from the new run
                    images: chunk.metadata.images,
                };
            }

            // 3. Upsert
            const { error } = await supabase.from("note_chunks").upsert(
                {
                    course_id: chunk.course_id,
                    course_name: chunk.course_name,
                    section_title: chunk.section_title,
                    content: chunk.content,
                    chunk_order: chunk.chunk_order,
                    is_ready: chunk.is_ready,
                    status: chunk.status,
                    char_count: chunk.char_count,
                    word_count: chunk.word_count,
                    metadata: finalMetadata,
                },
                {
                    onConflict: "course_id,section_title",
                },
            );

            if (error) {
                console.error(
                    `Upsert error for ${chunk.section_title}:`,
                    error.message,
                );
                totalErrors++;
            } else {
                console.log(`Processed (Synced): ${chunk.section_title}`);
                totalProcessed++;
            }
        }
    }

    console.log("\n-----------------------------------");
    console.log("Sync Completed.");
    console.log(`Total Chunks Processed: ${totalProcessed}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log("-----------------------------------");
}

// --- Main Execution ---
async function main() {
    try {
        await syncNotionToSupabase();
    } catch (error) {
        console.error("Fatal Error during sync:", error);
        process.exit(1);
    }
}

main();
