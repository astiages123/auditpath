-- Add SYNCED value to chunk_generation_status enum
-- This value is used by the Notion sync script to mark chunks as synced
-- without triggering any automatic quiz generation

ALTER TYPE public.chunk_generation_status ADD VALUE IF NOT EXISTS 'SYNCED';
