import type { Database } from '../../src/types/database.types';

import type {
  PageObjectResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';

export type { PageObjectResponse, RichTextItemResponse };

export interface ChunkData {
  content: string;
  displayContent: string;
}

export interface ProcessedImageResult {
  content: string;
  imageUrls: string[];
}

export type SyncStatus = 'SYNCED' | 'SKIPPED' | 'ERROR';

export interface PageProcessResult {
  status: SyncStatus;
  details?: string;
}

export interface SyncStatistics {
  totalProcessed: number;
  skipped: number;
  deleted: number;
  errors: number;
  durationSeconds: number;
  status: 'SUCCESS' | 'FAILED' | 'DRY_RUN';
}

export type NoteChunksInsert =
  Database['public']['Tables']['note_chunks']['Insert'];

export interface ChunkMetadata {
  images: string[];
  notion_last_edited_time: string;
}

export type { Database };
