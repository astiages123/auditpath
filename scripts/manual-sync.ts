import dotenv from "dotenv";
import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import pLimit from "p-limit";

import type { Database } from "@/types/database.types";

import type {
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";

// Load environment variables explicitly
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

// --- Environment Variables ---
const NOTION_TOKEN = process.env.NOTION_TOKEN!;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID!;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// --- Configuration ---
const DRY_RUN = process.argv.includes("--dry-run");
const MAX_CONCURRENT_IMAGES = 5;

// Validate Environment Variables
if (
  !NOTION_TOKEN ||
  !NOTION_DATABASE_ID ||
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_KEY
) {
  console.error("❌ Missing required environment variables:");
  if (!NOTION_TOKEN) console.error("  - NOTION_TOKEN (Missing in .env.local)");
  if (!NOTION_DATABASE_ID) {
    console.error("  - NOTION_DATABASE_ID (Missing in .env.local)");
  }
  if (!SUPABASE_URL) {
    console.error("  - SUPABASE_URL or VITE_SUPABASE_URL (Missing in .env)");
  }
  if (!SUPABASE_SERVICE_KEY) {
    console.error("  - SUPABASE_SERVICE_ROLE_KEY (Missing in .env.local)");
  }
  console.error("\nPlease update your .env and .env.local files.");
  process.exit(1);
}

// --- Clients ---
const notion = new Client({ auth: NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- Custom Transformers ---
n2m.setCustomTransformer("callout", async (block) => {
  const { id, has_children } = block as { id: string; has_children: boolean };
  const { callout } = block as {
    callout: {
      icon: { type: string; emoji?: string; external?: { url: string } } | null;
      rich_text: RichTextItemResponse[];
    };
  };
  if (!callout || !callout.rich_text) return false;

  // 1. Get Icon
  let icon = "";
  if (callout.icon) {
    if (callout.icon.type === "emoji") {
      icon = callout.icon.emoji || "";
    }
  }

  // 2. Get Title Content (using paragraph simulation)
  let titleContent = "";
  try {
    const tempBlock = {
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: callout.rich_text },
    };
    const mdResult = await n2m.blockToMarkdown(
      tempBlock as Parameters<typeof n2m.blockToMarkdown>[0],
    );

    if (typeof mdResult === "string") {
      titleContent = mdResult;
    } else if (
      mdResult &&
      typeof mdResult === "object" &&
      "parent" in mdResult
    ) {
      titleContent = (mdResult as { parent: string }).parent;
    } else {
      // Fallback array handling
      const strObj = n2m.toMarkdownString(
        mdResult as Parameters<typeof n2m.toMarkdownString>[0],
      );
      titleContent = typeof strObj === "string" ? strObj : strObj.parent;
    }
  } catch {
    titleContent = callout.rich_text
      .map((t: RichTextItemResponse) => t.plain_text)
      .join("");
  }

  // 3. Process Children
  let childrenContent = "";
  if (has_children) {
    let children = (block as { children?: Record<string, unknown>[] }).children;
    // If children are missing but has_children is true, fetch manually
    if (!children || children.length === 0) {
      try {
        const response = await notion.blocks.children.list({
          block_id: id,
        });
        children = response.results as Record<string, unknown>[];
      } catch (err) {
        console.error(`Error fetching children for callout ${id}:`, err);
      }
    }

    if (children && children.length > 0) {
      const mdBlocks = await n2m.blocksToMarkdown(
        children as Parameters<typeof n2m.blocksToMarkdown>[0],
      );
      const mdStringObj = n2m.toMarkdownString(mdBlocks);
      childrenContent = typeof mdStringObj === "string"
        ? mdStringObj
        : mdStringObj.parent;
    }
  }

  // 4. Assemble and Format
  // "Oluşturulan tüm içeriği (İkon + Başlık + Alt Bloklar) tek bir metin bloğu haline getir."

  // Fix: Trim titleContent to remove trailing newlines that cause separation
  const trimmedTitle = titleContent.trim();

  // Ensure icon and title are on the SAME line
  // Format: "${icon} ${trimmedTitle}"
  const firstPart = icon ? `${icon} ${trimmedTitle}` : trimmedTitle;

  let combined = firstPart;

  if (childrenContent) {
    // Add children content with a newline separator
    combined += `\n${childrenContent}`;
  }

  // "İSTİSNASIZ her satırın başına > (büyük işareti ve bir boşluk) ekle."
  const formatted = combined
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

  return formatted;
});

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
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would upload image: ${imageUrl}`);
    return "https://dry-run-placeholder.com/image.webp";
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const webpBuffer = await sharp(Buffer.from(buffer))
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const sanitizedSection = sectionTitle.replace(/[^a-zA-Z0-9-_]/g, "_");
    const path = `lessons/${courseId}/${sanitizedSection}/img_${index}.webp`;

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

    const { data: urlData } = supabase.storage
      .from("lessons")
      .getPublicUrl(path);
    return urlData.publicUrl;
  } catch (err) {
    console.error("Image processing error:", err);
    return null;
  }
}

/**
 * Markdown içindeki görselleri işler ve URL'lerini WebP olarak değiştirir.
 * Concurrency Control (Batching) kullanır.
 */
async function processImagesInMarkdown(
  markdown: string,
  courseId: string,
  sectionTitle: string,
): Promise<{ content: string; imageUrls: string[] }> {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const matches = Array.from(markdown.matchAll(imageRegex));
  const results: (string | null)[] = [];

  // Batching logic for concurrency control
  for (let i = 0; i < matches.length; i += MAX_CONCURRENT_IMAGES) {
    const chunk = matches.slice(i, i + MAX_CONCURRENT_IMAGES);
    const chunkPromises = chunk.map((match, chunkIndex) => {
      const originalUrl = match[2];
      const globalIndex = i + chunkIndex;
      console.log(
        `Processing image ${
          globalIndex + 1
        }/${matches.length} for section "${sectionTitle}"...`,
      );
      return uploadImageAsWebP(
        originalUrl,
        courseId,
        sectionTitle,
        globalIndex,
      );
    });

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }

  // Reconstruction with correct indexing
  let processedContent = markdown;

  // Calculate mapping from original index to 'validUrls' index
  let validIndex = 0;
  const indexMapping = new Map<number, number>();
  for (let i = 0; i < matches.length; i++) {
    if (results[i]) {
      indexMapping.set(i, validIndex);
      validIndex++;
    }
  }

  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const webpUrl = results[i];

    if (webpUrl) {
      const finalIndex = indexMapping.get(i);
      const before = processedContent.slice(0, match.index);
      const after = processedContent.slice(match.index! + match[0].length);
      // Use the mapped index which corresponds to the position in validUrls
      const newImageTag = `[GÖRSEL: ${finalIndex}]`;
      processedContent = before + newImageTag + after;
    }
  }

  const validUrls = results.filter((url): url is string => url !== null);

  return { content: processedContent, imageUrls: validUrls };
}

/**
 * Returns the content as a single chunk.
 * No splitting by headers, no overlap.
 * 1 Notion Page = 1 Chunk.
 */
export function chunkContent(
  content: string,
): { content: string; displayContent: string }[] {
  // Return the full content as a single chunk.
  // displayContent is same as content since there's no overlap to hide.
  return [
    {
      content: content,
      displayContent: content,
    },
  ];
}

// --- Main Execution ---

/**
 * Tek bir Notion sayfasını işleyen, kapsüllenmiş fonksiyon.
 * Paralel çalıştırılmaya uygundur.
 */
async function processPage(
  page: PageObjectResponse,
  index: number,
  courseLookupMap: Map<string, string>,
  existingChunksMap: Map<string, number>, // Key: `${courseId}:::${sectionTitle}`, Value: notion_last_edited_time timestamp from metadata
  touchedCourses: Set<string>,
  activeSections: Set<string>,
): Promise<{ status: "SYNCED" | "SKIPPED" | "ERROR"; details?: string }> {
  const props = page.properties;

  // 1. Status Check (API filtreliyor ama güvenlik için kalsın)
  let status = "Taslak";
  if ("Durum" in props) {
    if (props.Durum.type === "status") {
      status = props.Durum.status?.name || "Taslak";
    } else if (props.Durum.type === "select") {
      status = props.Durum.select?.name || "Taslak";
    }
  }

  if (status !== "Tamamlandı") {
    return { status: "SKIPPED", details: "Draft or not ready" };
  }

  // 2. Extract Course Name and Lookup ID
  let courseName = "";
  if ("Ders" in props) {
    if (props.Ders.type === "select") {
      courseName = props.Ders.select?.name || "";
    } else if (props.Ders.type === "rich_text") {
      courseName = props.Ders.rich_text.map((t) => t.plain_text).join("");
    }
  }

  courseName = courseName.trim();

  if (!courseName) {
    console.warn(`Skipping page ${page.id}: 'Ders' name is empty.`);
    return { status: "ERROR", details: "Missing Course Name" };
  }

  const courseId = courseLookupMap.get(courseName);

  if (!courseId) {
    console.error(
      `Error: Course name '${courseName}' not found in courses table. Skipping.`,
    );
    return { status: "ERROR", details: "Course Not Found" };
  }

  // Section Title
  const titleProp = props["Konu"] || props["Name"];
  const sectionTitle = titleProp && titleProp.type === "title"
    ? (titleProp.title as RichTextItemResponse[])
      .map((t) => t.plain_text)
      .join("")
    : "Untitled Section";

  // Order
  let chunkOrder = index; // Default to query index if 'Sıra' is missing
  if (
    "Sıra" in props &&
    props.Sıra.type === "number" &&
    props.Sıra.number !== null
  ) {
    chunkOrder = props.Sıra.number;
  }

  // --- TRACKING FOR CLEANUP ---
  touchedCourses.add(courseId);
  const uniqueKey = `${courseId}:::${sectionTitle}`;
  activeSections.add(uniqueKey);
  // -----------------------------

  console.log(
    `Processing Chunk: [${courseId}] ${sectionTitle} (Order: ${chunkOrder})`,
  );

  // --- SMART SYNC CHECK ---
  const lastEditedTimeStr = page.last_edited_time;
  const lastEditedTime = new Date(lastEditedTimeStr).getTime();

  // Check against the timestamp stored in METADATA
  const prevSyncedTime = existingChunksMap.get(uniqueKey);

  if (prevSyncedTime) {
    // 2 saniye tolerans
    const TOLERANCE_MS = 2000;
    if (lastEditedTime <= prevSyncedTime + TOLERANCE_MS) {
      console.log(`Skipping "${sectionTitle}": No changes detected.`);
      return { status: "SKIPPED", details: "Up to date" };
    }
  }
  // ------------------------

  // 3. Get Content (Page Body)
  try {
    const mdBlocks = await n2m.pageToMarkdown(
      page.id,
      null, // totalPage=null means fetch all blocks
    );

    const mdString = n2m.toMarkdownString(mdBlocks);
    let rawContent = typeof mdString === "string" ? mdString : mdString.parent;

    // --- MARKDOWN CLEANUP ---
    rawContent = rawContent.trim().replace(/\n{3,}/g, "\n\n");
    // Nested List Cleanup: Remove extra empty lines between list items (*, -, +)
    // This ensures lists remain tight and hierarchical rather than breaking into separate blocks
    rawContent = rawContent.replace(
      /(^|\n)(\s*[-*+]\s+[^\n]+)\n{2,}(?=\s*[-*+]\s+)/g,
      "$1$2\n",
    );
    // ------------------------

    // 4. Process Images
    const { content, imageUrls } = await processImagesInMarkdown(
      rawContent,
      courseId,
      sectionTitle,
    );

    // 5. Upsert to Supabase

    // Chunk the content
    const chunks = chunkContent(content);

    // Prepare metadata with notion_last_edited_time
    const baseMetadata = {
      images: imageUrls,
      notion_last_edited_time: lastEditedTimeStr, // Store ISO string
    };

    for (let i = 0; i < chunks.length; i++) {
      const chunkObj = chunks[i];
      const chunkText = chunkObj.content;
      const displayText = chunkObj.displayContent;

      if (DRY_RUN) {
        console.log(`[DRY RUN] Would upsert chunk: ${sectionTitle}`);
        continue;
      }

      const { error: upsertError } = await supabase.from("note_chunks").upsert(
        {
          course_id: courseId,
          course_name: courseName,
          section_title: sectionTitle,
          content: chunkText,
          display_content: displayText,
          chunk_order: chunkOrder,
          status: "SYNCED",
          metadata: baseMetadata,
        } as Database["public"]["Tables"]["note_chunks"]["Insert"],
        {
          onConflict: "course_id,section_title,chunk_order",
        },
      );

      if (upsertError) {
        console.error(
          `Upsert error for '${sectionTitle}' (seq: ${i}):`,
          upsertError.message,
        );
        return {
          status: "ERROR",
          details: upsertError.message,
        };
      }
    }

    // Cleanup stale chunks (if any) since we might have fewer chunks now
    if (!DRY_RUN) {
      const { error: cleanupError } = await supabase
        .from("note_chunks")
        .delete()
        .eq("course_id", courseId)
        .eq("section_title", sectionTitle)
        .neq("chunk_order", chunkOrder);

      if (cleanupError) {
        console.warn("Error cleaning up stale chunks:", cleanupError);
      }
    } else {
      console.log(
        `[DRY RUN] Would cleanup stale chunks for [${courseId}] ${sectionTitle}`,
      );
    }

    return { status: "SYNCED" };
  } catch (err) {
    console.error(`Error processing page ${page.id}:`, err);
    return { status: "ERROR", details: String(err) };
  }
}

async function syncNotionToSupabase() {
  const startTime = new Date();
  console.log(`Starting sync... (Dry Run: ${DRY_RUN})`);

  // --- 1. Fetch Courses for Lookup ---
  console.log("Fetching courses from Supabase for lookup...");
  const { data: coursesData, error: coursesError } = await supabase
    .from("courses")
    .select("id, name");

  if (coursesError || !coursesData) {
    console.error(
      "Fatal Error: Could not fetch courses from Supabase.",
      coursesError,
    );
    process.exit(1);
  }

  const courseLookupMap = new Map<string, string>();
  coursesData.forEach((c) => {
    courseLookupMap.set(c.name.trim(), c.id);
  });
  console.log(`Loaded ${courseLookupMap.size} courses into lookup map.`);
  // -----------------------------------

  // --- 1.1 Bulk Fetch Existing Chunks (CACHE) ---
  console.log("Fetching existing chunks for fast lookup...");
  // Retrieve metadata to get the last synced time
  const { data: allChunks, error: chunksError } = await supabase
    .from("note_chunks")
    .select("course_id, section_title, metadata");

  if (chunksError) {
    console.error("Error fetching existing chunks:", chunksError);
  }

  const existingChunksMap = new Map<string, number>();
  if (allChunks) {
    allChunks.forEach((chunk) => {
      const key = `${chunk.course_id}:::${chunk.section_title}`;
      if (chunk.metadata) {
        const meta = chunk.metadata as {
          notion_last_edited_time?: string;
        } | null;
        if (meta && meta.notion_last_edited_time) {
          existingChunksMap.set(
            key,
            new Date(meta.notion_last_edited_time).getTime(),
          );
        }
      }
    });
  }
  console.log(
    `Loaded ${existingChunksMap.size} existing chunks into cache map.`,
  );
  // ----------------------------------------------

  console.log("Connecting to Notion...");
  // --- 2. Notion API Filtering ---
  const response = await notion.databases.query({
    database_id: NOTION_DATABASE_ID,
    filter: {
      property: "Durum",
      status: {
        equals: "Tamamlandı",
      },
    },
  });
  // -------------------------------

  const pages = response.results.filter(
    (page): page is PageObjectResponse => "properties" in page,
  );

  console.log(
    `Found ${pages.length} pages (rows) in Notion with Status='Tamamlandı'.`,
  );

  const touchedCourses = new Set<string>();
  const activeSections = new Set<string>(); // Format: `${courseId}:::${sectionTitle}`

  // --- 3. Parallel Processing ---
  console.log("Starting parallel processing...");
  const limit = pLimit(5); // Aynı anda en fazla 5 sayfa işlensin

  const promises = pages.map((page, index) =>
    limit(() =>
      processPage(
        page,
        index,
        courseLookupMap,
        existingChunksMap,
        touchedCourses,
        activeSections,
      )
    )
  );

  const results = await Promise.all(promises);

  const totalProcessed = results.filter((r) => r.status === "SYNCED").length;
  const skippedCount = results.filter((r) => r.status === "SKIPPED").length;
  const errorCount = results.filter((r) => r.status === "ERROR").length;
  // ------------------------------

  // --- ORPHAN CLEANUP ---
  let deletedCount = 0;
  if (touchedCourses.size > 0) {
    console.log("\n--- Checking for orphaned records ---");
    try {
      const { data: dbChunks, error: fetchError } = await supabase
        .from("note_chunks")
        .select("id, course_id, section_title")
        .in("course_id", Array.from(touchedCourses))
        .eq("status", "SYNCED");

      if (fetchError) {
        console.error("Error fetching chunks for cleanup:", fetchError);
      } else if (dbChunks) {
        const chunksToDelete = dbChunks.filter((chunk) => {
          const key = `${chunk.course_id}:::${chunk.section_title}`;
          return !activeSections.has(key);
        });

        if (chunksToDelete.length > 0) {
          console.log(`Found ${chunksToDelete.length} orphaned sections.`);

          if (DRY_RUN) {
            chunksToDelete.forEach((c) => {
              console.log(
                `[DRY RUN] Would delete orphaned section: [${c.course_id}] ${c.section_title}`,
              );
              deletedCount++;
            });
          } else {
            const idsToDelete = chunksToDelete.map((c) => c.id);
            const { error: deleteError } = await supabase
              .from("note_chunks")
              .delete()
              .in("id", idsToDelete);

            if (deleteError) {
              console.error("Error deleting orphaned records:", deleteError);
            } else {
              chunksToDelete.forEach((c) => {
                console.log(
                  `Deleted orphaned section: [${c.course_id}] ${c.section_title}`,
                );
                deletedCount++;
              });
            }
          }
        } else {
          console.log("No orphaned records found.");
        }
      }
    } catch (cleanupErr) {
      console.error("Cleanup process failed:", cleanupErr);
    }
  }

  // --- LOGGING ---
  const endTime = new Date();
  const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
  const finalStatus = errorCount > 0
    ? "FAILED"
    : DRY_RUN
    ? "DRY_RUN"
    : "SUCCESS";

  console.log("\n-----------------------------------");
  console.log(`Sync Completed (${finalStatus}). Duration: ${durationSeconds}s`);
  console.log(`Processed (Synced): ${totalProcessed}`);
  console.log(`Skipped (Up-to-date/Draft): ${skippedCount}`);
  console.log(`Deleted: ${deletedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log("-----------------------------------");

  if (DRY_RUN) {
    console.log("[DRY RUN] Sync finished without DB logging.");
  } else {
    console.log(
      "Sync finished. (Database logging skipped as 'sync_logs' table is removed)",
    );
  }
}

async function main() {
  try {
    await syncNotionToSupabase();
  } catch (error) {
    console.error("Fatal Error during main:", error);
    process.exit(1);
  }
}

main();
