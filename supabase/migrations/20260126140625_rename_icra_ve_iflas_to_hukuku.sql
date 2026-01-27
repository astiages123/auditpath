-- Rename "İcra ve İflas" to "İcra ve İflas Hukuku"
UPDATE courses 
SET name = 'İcra ve İflas Hukuku' 
WHERE name = 'İcra ve İflas';

UPDATE subject_guidelines 
SET subject_name = 'İcra ve İflas Hukuku' 
WHERE subject_name = 'İcra ve İflas';

UPDATE note_chunks 
SET course_name = 'İcra ve İflas Hukuku' 
WHERE course_name = 'İcra ve İflas';

UPDATE pomodoro_sessions 
SET course_name = 'İcra ve İflas Hukuku' 
WHERE course_name = 'İcra ve İflas';

UPDATE weekly_schedule 
SET subject = 'İcra ve İflas Hukuku' 
WHERE subject = 'İcra ve İflas';
