-- Rename the old enum type to allow creating the new one
ALTER TYPE public.quiz_response_type RENAME TO quiz_response_type_old;

-- Create the new enum type without 'struggled'
CREATE TYPE public.quiz_response_type AS ENUM ('correct', 'incorrect', 'blank');

-- Update the table to use the new enum type, mapping 'struggled' to 'incorrect'
ALTER TABLE public.user_quiz_progress
ALTER COLUMN response_type TYPE public.quiz_response_type
USING (
  CASE
    WHEN response_type::text = 'struggled' THEN 'incorrect'::public.quiz_response_type
    ELSE response_type::text::public.quiz_response_type
  END
);

-- Drop the old enum type
DROP TYPE public.quiz_response_type_old;
