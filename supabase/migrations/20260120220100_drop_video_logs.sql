-- Migration: video_logs Tablosunu Sil
-- Bu tablo artık kullanılmıyor, video_progress.completed_at aynı işlevi görüyor.

DROP TABLE IF EXISTS public.video_logs CASCADE;
