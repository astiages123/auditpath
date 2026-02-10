import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const coursesPath = path.join(__dirname, '../courses.json');
const coursesData = JSON.parse(fs.readFileSync(coursesPath, 'utf8'));

// Helper to slugify
const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '');

const seed = async () => {
  console.log('Starting seed process...');

  for (const catData of coursesData) {
    // Parse category string: "1. EKONOMİ (Toplam: 144 Saat)"
    // Regex to extract order and name.
    // Assuming format: "{order}. {Name} (..."
    const match = catData.category.match(/^(\d+)\.\s+(.+?)\s+\(/);
    const order = match ? parseInt(match[1]) : 0;
    const name = match ? match[2].trim() : catData.category;
    const slug = slugify(name);

    console.log(`Processing Category: ${name}`);

    // 1. Upsert Category
    // We use slug or name as unique key if possible?
    // Our schema doesn't have unique constraint on slug/name explicitly shown in previous turn but usually it is.
    // Let's first try to find by name, if not create.

    let categoryId: string;

    const { data: existingCat } = await supabase
      .from('Category')
      .select('id')
      .eq('name', name)
      .single();

    if (existingCat) {
      categoryId = existingCat.id;
      // Update fields
      await supabase
        .from('Category')
        .update({
          slug,
          order,
          totalHours: 0, // Will verify calculated hours
        })
        .eq('id', categoryId);
    } else {
      const { data: newCat, error: createCatError } = await supabase
        .from('Category')
        .insert({
          name,
          slug,
          order,
          totalHours: 0,
        })
        .select('id')
        .single();

      if (createCatError) {
        console.error(`Error creating category ${name}:`, createCatError);
        continue;
      }
      categoryId = newCat.id;
    }

    let categoryTotalHours = 0;

    for (let i = 0; i < catData.courses.length; i++) {
      const courseData = catData.courses[i];
      console.log(`  Processing Course: ${courseData.name}`);

      // 2. Upsert Course
      let courseDbId: string;

      const { data: existingCourse } = await supabase
        .from('Course')
        .select('id')
        .eq('courseId', courseData.id)
        .single();

      if (existingCourse) {
        courseDbId = existingCourse.id;
        await supabase
          .from('Course')
          .update({
            name: courseData.name,
            lessonType: courseData.lessonType,
            totalVideos: courseData.totalVideos,
            totalHours: courseData.totalHours,
            playlistUrl: courseData.playlistUrl,
            notePath: courseData.notePath,
            categoryId: categoryId,
            order: i,
          })
          .eq('id', courseDbId);
      } else {
        const { data: newCourse, error: createCourseError } = await supabase
          .from('Course')
          .insert({
            courseId: courseData.id,
            name: courseData.name,
            lessonType: courseData.lessonType,
            totalVideos: courseData.totalVideos,
            totalHours: courseData.totalHours,
            playlistUrl: courseData.playlistUrl,
            notePath: courseData.notePath,
            categoryId: categoryId,
            order: i,
          })
          .select('id')
          .single();

        if (createCourseError) {
          console.error(
            `Error creating course ${courseData.name}:`,
            createCourseError
          );
          continue;
        }
        courseDbId = newCourse.id;
      }

      categoryTotalHours += courseData.totalHours || 0;

      // 3. Upsert Videos
      // For bulk performance, we could delete all for course and re-insert, or upsert.
      // Upsert with (courseId, videoNumber) assuming it acts as key?
      // Actually Video table doesn't have unique constraint on (courseId, videoNumber) in my SQL manually.
      // But let's check existing videos.

      // To be safe and clean since we are "restoring", let's clear videos for this course and re-insert.
      // Wait, deleting might break progress references if not cascading or if we want to keep IDs.
      // If we just created tables, IDs don't matter much.
      // But if tables exist, we should try to match.
      // Let's use simple upsert loop for now, or fetch all existing videos and map.

      // Optimization: Get all existing videos for course
      const { data: existingVideos } = await supabase
        .from('Video')
        .select('id, videoNumber')
        .eq('courseId', courseDbId);

      const existingVideoMap = new Map();
      existingVideos?.forEach((v) => existingVideoMap.set(v.videoNumber, v.id));

      for (const vid of courseData.videos) {
        // Determine if insert or update
        if (existingVideoMap.has(vid.id)) {
          // Update
          await supabase
            .from('Video')
            .update({
              title: vid.title,
              duration: vid.duration,
              durationMinutes: vid.durationMinutes,
            })
            .eq('id', existingVideoMap.get(vid.id));
        } else {
          // Insert
          await supabase.from('Video').insert({
            courseId: courseDbId,
            videoNumber: vid.id,
            title: vid.title,
            duration: vid.duration,
            durationMinutes: vid.durationMinutes,
          });
        }
      }
    }

    // Update Category Total Hours
    await supabase
      .from('Category')
      .update({ totalHours: categoryTotalHours })
      .eq('id', categoryId);
  }

  console.log('Seed completed!');
};

seed().catch((e) => console.error(e));
