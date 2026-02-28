import { useMemo } from 'react';
import { type CourseTopic } from '@/features/courses/types/courseTypes';

interface UseNotesHighlightProps {
  currentChunk: CourseTopic | undefined;
  debouncedQuery: string;
}

export function useNotesHighlight({
  currentChunk,
  debouncedQuery,
}: UseNotesHighlightProps) {
  // Transform content to inject <mark> tags for debounced query
  const transformedContent = useMemo(() => {
    if (!currentChunk || !debouncedQuery || debouncedQuery.length < 2) {
      return currentChunk?.content || '';
    }

    const content = currentChunk.content;

    // 1. Identify "protected" zones like LaTeX ($...$ or $$...$$) and code blocks (```...```)
    const protectedZones: { start: number; end: number }[] = [];
    const protectionRegex =
      /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|`{3}[\s\S]*?`{3}|`[\s\S]*?`)/g;
    let match;
    while ((match = protectionRegex.exec(content)) !== null) {
      protectedZones.push({
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    // 2. Find all match positions that are NOT in a protected zone using RegExp
    // This must match exactly the logic in useSearch.ts
    const matchPositions: { start: number; text: string }[] = [];
    const escapedQuery = debouncedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedQuery, 'gi');

    while ((match = searchRegex.exec(content)) !== null) {
      const pos = match.index;
      const isInsideProtected = protectedZones.some(
        (zone) => pos >= zone.start && pos < zone.end
      );

      if (!isInsideProtected) {
        matchPositions.push({ start: pos, text: match[0] });
      }
    }

    // 3. Inject <mark> tags at identified positions, working backwards to keep indices stable
    let result = content;
    for (let i = matchPositions.length - 1; i >= 0; i--) {
      const { start, text } = matchPositions[i];
      result =
        result.substring(0, start) +
        `<mark id="search-result-${start}">${text}</mark>` +
        result.substring(start + text.length);
    }

    return result;
  }, [currentChunk, debouncedQuery]);

  return transformedContent;
}
