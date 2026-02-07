/**
 * AI Knowledge Base Module
 * 
 * DEPRECATED: Static subject files have been migrated to the database.
 * Use SubjectKnowledgeService for retrieving guidelines.
 */

import type { SubjectKnowledge } from "./types";

// Re-export types
export type { SubjectKnowledge } from "./types";

/**
 * Default fallback knowledge for unknown subjects
 */
const DEFAULT_KNOWLEDGE: SubjectKnowledge = {
  id: "default",
  constitution: "",
  fewShot: ""
};

/**
 * DEPRECATED: Do not use.
 */
export const SUBJECT_REGISTRY: Record<string, SubjectKnowledge> = {
  default: DEFAULT_KNOWLEDGE,
};

/**
 * Minifies text by removing excess whitespace while preserving structure.
 * Reduces token usage when injecting knowledge into API requests.
 */
export function minify(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .replace(/[ \t]+/g, " ");
}

/**
 * DEPRECATED: Use SubjectKnowledgeService
 */
export function getSubjectKnowledge(courseId: string): SubjectKnowledge {
  console.warn(`[DEPRECATED] getSubjectKnowledge called for ${courseId}. Use SubjectKnowledgeService.`);
  return DEFAULT_KNOWLEDGE;
}

/**
 * DEPRECATED
 */
export function listSubjectIds(): string[] {
  return [];
}
