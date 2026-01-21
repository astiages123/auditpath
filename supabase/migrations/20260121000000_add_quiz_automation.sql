-- Create enum for chunk generation status
CREATE TYPE public.chunk_generation_status AS ENUM (
  'DRAFT',
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED'
);

-- Add automated generation columns to note_chunks
ALTER TABLE public.note_chunks
ADD COLUMN IF NOT EXISTS is_ready boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS status public.chunk_generation_status DEFAULT 'DRAFT',
ADD COLUMN IF NOT EXISTS process_at_night boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_message text,
ADD COLUMN IF NOT EXISTS heading_order integer;

-- Update existing rows to appear as completed (so we don't re-process old stuff unnecessarily, or user can manually reset them)
-- We assume existing content is 'COMPLETED' to avoid breaking the UI or triggering mass generation
UPDATE public.note_chunks
SET status = 'COMPLETED', is_ready = true
WHERE status IS NULL OR status = 'DRAFT'; 
