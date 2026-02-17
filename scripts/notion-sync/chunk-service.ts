import type { ChunkData } from './types';

export function chunkContent(content: string): ChunkData[] {
  return [
    {
      content: content,
      displayContent: content,
    },
  ];
}
