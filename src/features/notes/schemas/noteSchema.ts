import { z } from 'zod';

export const noteSchema = z.object({
  lessonType: z.string().min(1, 'Ders adı gereklidir'),
  title: z.string().min(3, 'Başlık en az 3 karakter olmalıdır'),
  content: z.string().min(1, 'İçerik boş olamaz'),
  course_name: z.string().optional(),
  course_id: z.string().optional(), // Can be inferred from context
  topic_id: z.string().optional(),
});

export type NoteSchema = z.infer<typeof noteSchema>;


