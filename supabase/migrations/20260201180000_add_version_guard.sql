-- Add last_synced_at to note_chunks
ALTER TABLE "public"."note_chunks"
ADD COLUMN "last_synced_at" timestamp with time zone DEFAULT now();

-- Create trigger to update last_synced_at
CREATE OR REPLACE FUNCTION update_last_synced_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_synced_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_note_chunks_last_synced_at
    BEFORE UPDATE ON "public"."note_chunks"
    FOR EACH ROW
    EXECUTE FUNCTION update_last_synced_at();

-- RPC to get the latest version for a course
-- Returns the max last_synced_at for the given course
CREATE OR REPLACE FUNCTION get_course_content_version(p_course_id uuid)
RETURNS timestamp with time zone
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT MAX(last_synced_at)
  FROM note_chunks
  WHERE course_id = p_course_id;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION get_course_content_version(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_course_content_version(uuid) TO "service_role";
