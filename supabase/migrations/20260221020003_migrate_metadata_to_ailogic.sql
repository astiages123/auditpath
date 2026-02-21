-- Move concept_map and difficulty_index from metadata to ai_logic

-- Note: metadata and ai_logic are both jsonb columns

UPDATE public.note_chunks
SET 
  ai_logic = COALESCE(ai_logic, '{}'::jsonb) || 
             jsonb_build_object(
               'concept_map', metadata->'concept_map',
               'difficulty_index', metadata->'difficulty_index'
             ),
  metadata = metadata - 'concept_map' - 'difficulty_index'
WHERE metadata ? 'concept_map' OR metadata ? 'difficulty_index';

-- Clean up any nulls we injected into ai_logic if they were missing in source
UPDATE public.note_chunks
SET ai_logic = ai_logic - 'concept_map'
WHERE ai_logic->>'concept_map' IS NULL;

UPDATE public.note_chunks
SET ai_logic = ai_logic - 'difficulty_index'
WHERE ai_logic->>'difficulty_index' IS NULL;
