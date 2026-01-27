-- Migration: Public Read Policy Düzeltmesi
-- videos ve courses tablolarının public okuma policy'lerini düzeltir

-- ====================================
-- VIDEOS TABLOSU
-- ====================================
DROP POLICY IF EXISTS "Anyone can read videos" ON public.videos;

CREATE POLICY "Anyone can read videos"
  ON public.videos
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

-- ====================================
-- COURSES TABLOSU
-- ====================================
DROP POLICY IF EXISTS "Anyone can read courses" ON public.courses;
DROP POLICY IF EXISTS "Allow public read access on Course" ON public.courses;

CREATE POLICY "Anyone can read courses"
  ON public.courses
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

-- ====================================
-- CATEGORIES TABLOSU
-- ====================================
DROP POLICY IF EXISTS "Anyone can read categories" ON public.categories;

CREATE POLICY "Anyone can read categories"
  ON public.categories
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

-- ====================================
-- NOTE_CHUNKS TABLOSU
-- ====================================
DROP POLICY IF EXISTS "Enable read access for everyone" ON public.note_chunks;
DROP POLICY IF EXISTS "Anyone can read note_chunks" ON public.note_chunks;

CREATE POLICY "Anyone can read note_chunks"
  ON public.note_chunks
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

-- ====================================
-- QUESTIONS TABLOSU
-- ====================================
DROP POLICY IF EXISTS "Enable read access for all users" ON public.questions;
DROP POLICY IF EXISTS "Allow public read access" ON public.questions;
DROP POLICY IF EXISTS "Anyone can view questions" ON public.questions;

CREATE POLICY "Anyone can view questions"
  ON public.questions
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

-- Questions insert/update/delete (authenticated users)
DROP POLICY IF EXISTS "Enable insert for authenticated users users" ON public.questions;
DROP POLICY IF EXISTS "Users can insert their own questions" ON public.questions;
DROP POLICY IF EXISTS "Users can update their own questions" ON public.questions;
DROP POLICY IF EXISTS "Users can delete their own questions" ON public.questions;

CREATE POLICY "Users can insert questions"
  ON public.questions
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own questions"
  ON public.questions
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own questions"
  ON public.questions
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (auth.uid() = created_by);

-- ====================================
-- SUBJECT_GUIDELINES TABLOSU
-- ====================================
DROP POLICY IF EXISTS "Anyone can read subject_guidelines" ON public.subject_guidelines;

CREATE POLICY "Anyone can read subject_guidelines"
  ON public.subject_guidelines
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

-- ====================================
-- USERS TABLOSU
-- ====================================
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can view their own profile"
  ON public.users
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);
