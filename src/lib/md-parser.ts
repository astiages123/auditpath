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
   * Reads a markdown file and splits it into chunks based on H3 headers (###).
   * @param filePath Absolute path to the markdown file
   */
  static parseFile(filePath: string): MarkdownChunk[] {
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const lines = fileContent.split("\n");
      const chunks: MarkdownChunk[] = [];
      let currentH1 = "";
      let currentH2 = "";
      let currentHeader = "Introduction";
      let currentContent: string[] = [];

      lines.forEach((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith("# ")) {
          currentH1 = trimmedLine.replace("# ", "").trim();
        } else if (trimmedLine.startsWith("## ")) {
          currentH2 = trimmedLine.replace("## ", "").trim();
        } else if (trimmedLine.startsWith("### ")) {
          // Verify if we have content for the previous header
          if (currentContent.length > 0) {
            const metadata: string[] = [];
            if (currentH1) metadata.push(`Kategori: ${currentH1}`);
            if (currentH2) metadata.push(`Alt-Kategori: ${currentH2}`);
            
            const metaText = metadata.length > 0 ? `> **Kılavuz:** ${metadata.join(" | ")}\n\n` : "";

            chunks.push({
              header: currentHeader,
              content: metaText + currentContent.join("\n").trim(),
              sourceFile: path.basename(filePath),
              h1: currentH1 || undefined,
              h2: currentH2 || undefined,
            });
          }
          currentHeader = trimmedLine.replace("### ", "").trim();
          currentContent = [];
        } else {
          currentContent.push(line);
        }
      });

      // Push the last chunk
      if (currentContent.length > 0) {
        const metadata: string[] = [];
        if (currentH1) metadata.push(`Kategori: ${currentH1}`);
        if (currentH2) metadata.push(`Alt-Kategori: ${currentH2}`);
        
            const metaText = metadata.length > 0 ? `> **Kılavuz:** ${metadata.join(" | ")}\n\n` : "";

        chunks.push({
          header: currentHeader,
          content: metaText + currentContent.join("\n").trim(),
          sourceFile: path.basename(filePath),
          h1: currentH1 || undefined,
          h2: currentH2 || undefined,
        });
      }

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
