import { useEffect, useMemo, useState } from 'react';

export interface SearchResult {
  id: string;
  before: string;
  match: string;
  after: string;
  index: number;
}

interface UseSearchProps {
  content: string;
  query: string;
  debounceMs?: number;
}

// Helper to strip Markdown but KEEP LaTeX for rendering
// Improved to handle partial math tags which cause italicizing leaks
function cleanSnippetText(text: string): string {
  let cleaned = text
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // Bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // Italic
    .replace(/#+\s+/g, '') // Headers
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
    .replace(/`{1,3}[\s\S]*?`{1,3}/g, '[Kod]') // Code
    .replace(/>\s+/g, '') // Blockquotes
    .replace(/-\s+/g, '') // List items
    .replace(/\n+/g, ' '); // Newlines

  // Ensure LaTeX markers are balanced or removed if they would leak
  // If there's an odd number of $, remove them all to avoid breaking the markdown renderer in the sidebar
  const dollarCount = (cleaned.match(/\$/g) || []).length;
  if (dollarCount % 2 !== 0) {
    cleaned = cleaned.replace(/\$/g, '');
  }

  return cleaned;
}

// Escape regex special characters
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function useSearch({
  content,
  query,
  debounceMs = 300,
}: UseSearchProps) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [query, debounceMs]);

  const results = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) return [];

    const searchResults: SearchResult[] = [];

    // Use RegExp with case-insensitive flag which is safer for Turkish character indexing
    // compared to .toLowerCase().indexOf(...)
    const escapedQuery = escapeRegExp(debouncedQuery);
    const searchRegex = new RegExp(escapedQuery, 'gi');

    // Identify LaTeX segments to ignore (we don't want to highlight inside LaTeX code usually
    // unless the user is specifically searching for LaTeX, but here we prioritize content)
    const protectedRanges: [number, number][] = [];
    const latexRegex = /\$\$[\s\S]*?\$\$|\$[\s\S]*?\$/g;
    let latexMatch;
    while ((latexMatch = latexRegex.exec(content)) !== null) {
      protectedRanges.push([
        latexMatch.index,
        latexMatch.index + latexMatch[0].length,
      ]);
    }

    let match;
    while ((match = searchRegex.exec(content)) !== null) {
      const pos = match.index;
      const matchTextOriginal = match[0];

      // Check if this position is inside a protected range (LaTeX)
      const isProtected = protectedRanges.some(
        ([start, end]) => pos >= start && pos < end
      );

      if (!isProtected) {
        // Find boundaries of the current line
        const contentBefore = content.substring(0, pos);
        const contentAfter = content.substring(pos + matchTextOriginal.length);

        const lastNewlineBefore = contentBefore.lastIndexOf('\n');
        const firstNewlineAfter = contentAfter.indexOf('\n');

        const lineStart = lastNewlineBefore === -1 ? 0 : lastNewlineBefore + 1;
        const lineEnd =
          firstNewlineAfter === -1
            ? content.length
            : pos + matchTextOriginal.length + firstNewlineAfter;

        // Extract context (2 words before and after, but within the line)
        const beforeContent = content.substring(lineStart, pos);
        const afterContent = content.substring(
          pos + matchTextOriginal.length,
          lineEnd
        );

        const wordRegex = /\S+/g;
        const beforeMatches = Array.from(beforeContent.matchAll(wordRegex));
        const afterMatches = Array.from(afterContent.matchAll(wordRegex));

        const startInBefore =
          beforeMatches.length >= 2
            ? (beforeMatches[beforeMatches.length - 2].index ?? 0)
            : 0;

        const endInAfter =
          afterMatches.length >= 2
            ? (afterMatches[1].index ?? 0) + afterMatches[1][0].length
            : afterContent.length;

        const beforeRaw = beforeContent.substring(startInBefore);
        const afterRaw = afterContent.substring(0, endInAfter);

        searchResults.push({
          id: `search-result-${pos}`,
          before: cleanSnippetText(beforeRaw),
          match: matchTextOriginal,
          after: cleanSnippetText(afterRaw),
          index: pos,
        });
      }

      if (searchResults.length >= 30) break;
    }

    return searchResults;
  }, [content, debouncedQuery]);

  return { results, debouncedQuery };
}
