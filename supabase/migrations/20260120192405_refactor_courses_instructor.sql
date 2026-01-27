-- 1. Add instructor column
ALTER TABLE courses ADD COLUMN instructor text;

-- 2. Migrate data
-- Update standard format "Name - Instructor"
UPDATE courses
SET 
  instructor = split_part(name, ' - ', 2),
  name = split_part(name, ' - ', 1)
WHERE name LIKE '% - %';

-- Update special case "Name (AÖF)"
UPDATE courses
SET 
  instructor = 'AÖF',
  name = replace(name, ' (AÖF)', '')
WHERE name LIKE '%(AÖF)';

-- Fallback: If still null (no dash, no AÖF), use lesson_type as instructor temporarily or keep null
-- Based on analysis, only the above 2 cases exist. 
-- But as a safeguard for any missed rows, we can just leave them null or set a default.

-- 3. Validation (Optional Step in logic, but good for enforcement)
-- ALTER TABLE courses ALTER COLUMN instructor SET NOT NULL; 
-- We won't enforce NOT NULL yet to avoid breaking if there's obscure data, 
-- but ideally it should be required.

-- 4. Drop lesson_type column
ALTER TABLE courses DROP COLUMN lesson_type;
