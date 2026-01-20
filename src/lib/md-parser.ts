import fs from "fs";
import path from "path";

export interface MarkdownChunk {
  header: string;
  content: string;
  sourceFile: string;
  h1?: string;
  h2?: string;
}

export class MarkdownParser {
  /**
   * Reads a markdown file and splits it into chunks based on H2 headers (##).
   * @param filePath Absolute path to the markdown file
   */
  static parseFile(filePath: string): MarkdownChunk[] {
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const lines = fileContent.split("\n");
      const chunks: MarkdownChunk[] = [];
      
      let currentH1 = "";
      let currentH2 = "Genel";
      let currentHeader = "Giriş";
      let currentContent: string[] = [];

      const flushChunk = () => {
        if (currentContent.length > 0 || currentHeader !== "Giriş") {
            const contentJoined = currentContent.join("\n").trim();
            if (contentJoined.length > 0) {
                 const metadata: string[] = [];
                 if (currentH1) metadata.push(`Kategori: ${currentH1}`);
                 if (currentH2 && currentH2 !== "Genel") metadata.push(`Bölüm: ${currentH2}`);
                 
                 // Add metadata to content for context if needed, but the parser contract primarily returns raw content + metadata fields
                 // We will prepend it like before for consistency with how the app might display it directly
                 const metaText = metadata.length > 0 ? `> **Kılavuz:** ${metadata.join(" | ")}\n\n` : "";

                 chunks.push({
                    header: currentHeader,
                    content: metaText + contentJoined,
                    sourceFile: path.basename(filePath),
                    h1: currentH1 || undefined,
                    h2: currentH2 || undefined,
                 });
            }
        }
        currentContent = [];
      };

      lines.forEach((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith("# ")) {
          flushChunk();
           currentH1 = trimmedLine.replace("# ", "").trim();
           currentH2 = "Genel";
           currentHeader = "Giriş";
        } else if (trimmedLine.startsWith("## ")) {
           flushChunk();
           currentH2 = trimmedLine.replace("## ", "").trim();
           currentHeader = `${currentH2} - Giriş`; 
        } else if (trimmedLine.startsWith("### ")) {
           flushChunk();
           currentHeader = trimmedLine.replace("### ", "").trim();
        } else {
           currentContent.push(line);
        }
      });

      // Push the last chunk
      flushChunk();

      return chunks;
    } catch (error) {
      console.error(`Error parsing markdown file ${filePath}:`, error);
      return [];
    }
  }

  static parseCourseContent(): MarkdownChunk[] {
    // implementation to scan dir and parse all md files
    // This is a placeholder for future expansion if needed
    return [];
  }
}
