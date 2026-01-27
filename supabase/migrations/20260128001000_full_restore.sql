
DO $$
DECLARE
    mikro_course_id uuid;
    muhasebe_course_id uuid;
    user_id_val uuid := 'f63e5a09-7401-481d-9cfb-c1bb1940a999';
    v_id uuid;
BEGIN
    SELECT id INTO mikro_course_id FROM public.courses WHERE course_slug = 'mikro-iktisat' LIMIT 1;
    SELECT id INTO muhasebe_course_id FROM public.courses WHERE course_slug = 'muhasebe' LIMIT 1;

    -- Clear existing empty progress if any (should be 0 anyway)
    DELETE FROM public.video_progress WHERE user_id = user_id_val AND video_id IN (SELECT id FROM public.videos WHERE course_id IN (mikro_course_id, muhasebe_course_id));
    -- Delete existing videos if any to avoid duplicates
    DELETE FROM public.videos WHERE course_id IN (mikro_course_id, muhasebe_course_id);

    -- 1. Insert Mikro videos
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Ders Tanıtımı', '07:29', 7.48, 1) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-19 16:30:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Matematiksel Temeller 1', '39:23', 39.38, 2) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-19 16:30:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Matematiksel Temeller 2', '39:51', 39.85, 3) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-19 16:30:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Matematiksel Temeller 3', '37:37', 37.62, 4) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-19 16:30:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Toplam, Marjinal, Ortalama İlişkisi 1', '33:13', 33.22, 5) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-19 16:30:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Toplam, Marjinal, Ortalama İlişkisi 2', '32:38', 32.63, 6) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-19 16:30:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Toplam, Marjinal, Ortalama İlişkisi 3', '34:54', 34.9, 7) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-21 13:20:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Tüketim Kuramı: Temel Kavramlar', '37:39', 37.65, 8) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-21 13:20:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Kardinalist Tüketim Kuramı 1', '39:36', 39.6, 9) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-21 13:20:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Kardinalist Tüketim Kuramı 2', '38:23', 38.38, 10) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-21 13:20:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Kardinalist Tüketim Kuramı 3', '34:11', 34.18, 11) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-26 13:19:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Kardinalist Tüketim Kuramı 4', '38:18', 38.3, 12) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-26 13:19:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Ordinalist Kuram: Farksızlık Eğrileri', '38:58', 38.97, 13) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-26 13:19:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Marjinal İkame Oranı (MRS) 1', '42:26', 42.43, 14) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-26 13:19:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Marjinal İkame Oranı (MRS) 2', '38:53', 38.88, 15) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-26 13:19:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Atipik Farksızlık Eğrileri 1', '44:53', 44.88, 16) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-26 13:19:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Atipik Farksızlık Eğrileri 2', '37:20', 37.33, 17) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-26 13:19:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Bütçe Doğrusu ve Kısıtı 1', '36:24', 36.4, 18) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Bütçe Doğrusu ve Kısıtı 2', '43:41', 43.68, 19) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Tüketici Dengesi 1', '36:07', 36.12, 20) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Tüketici Dengesi 2', '44:51', 44.85, 21) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Tüketici Dengesi 3', '34:02', 34.03, 22) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Tüketici Dengesi Değişimleri 1', '31:11', 31.18, 23) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Tüketici Dengesi Değişimleri 2', '37:45', 37.75, 24) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Tüketici Dengesi Değişimleri 3', '29:28', 29.47, 25) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Fiyat Değişiminin Etkileri 1', '38:01', 38.02, 26) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Fiyat Değişiminin Etkileri 2', '32:58', 32.97, 27) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Fiyat Değişiminin Etkileri 3', '43:51', 43.85, 28) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Talep ve Arz Fonksiyonları 1', '37:53', 37.88, 29) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Talep ve Arz Fonksiyonları 2', '33:20', 33.33, 30) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Talep ve Arz Fonksiyonları 3', '32:20', 32.33, 31) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Genel Esneklik Kavramı', '22:24', 22.4, 32) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Talebin Fiyat Esnekliği 1', '39:05', 39.08, 33) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Talebin Fiyat Esnekliği 2', '30:40', 30.67, 34) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Talebin Fiyat Esnekliği 3', '25:50', 25.83, 35) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Talebin Fiyat Esnekliği 4', '35:13', 35.22, 36) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Talebin Fiyat Esnekliği 5', '38:45', 38.75, 37) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Talebin Gelir Esnekliği 1', '28:28', 28.47, 38) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Talebin Gelir Esnekliği 2', '36:40', 36.67, 39) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Çapraz Talep Esnekliği', '27:43', 27.72, 40) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Arz Esnekliği', '43:22', 43.37, 41) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Piyasa Dengesi', '25:51', 25.85, 42) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Dengeye Yöneliş Yaklaşımları', '39:21', 39.35, 43) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Piyasa Dengesi Değişimleri 1', '35:58', 35.97, 44) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Piyasa Dengesi Değişimleri 2', '09:39', 9.65, 45) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Örümcek Ağı (Cobweb) Teoremi', '36:10', 36.17, 46) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Tüketici ve Üretici Rantı 1', '32:21', 32.35, 47) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Tüketici ve Üretici Rantı 2', '38:13', 38.22, 48) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Taban Fiyat Uygulaması', '37:44', 37.73, 49) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Taban Fiyat ve Dara Kaybı', '35:42', 35.7, 50) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Tavan Fiyat Uygulaması', '39:15', 39.25, 51) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Tavan Fiyat ve Dara Kaybı', '29:46', 29.77, 52) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Vergi Uygulamaları 1', '31:03', 31.05, 53) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Vergi Uygulamaları 2', '40:14', 40.23, 54) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Vergi Uygulamaları 3', '20:51', 20.85, 55) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Kota Uygulaması', '30:55', 30.92, 56) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Kısa Dönemde Üretim 1', '33:16', 33.27, 57) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Kısa Dönemde Üretim 2', '33:54', 33.9, 58) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Kısa Dönemde Üretim 3', '35:16', 35.27, 59) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Kısa Dönemde Üretim 4', '14:03', 14.05, 60) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Uzun Dönemde Üretim 1', '31:06', 31.1, 61) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Uzun Dönem: Eş Ürün Eğrileri', '36:55', 36.92, 62) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Marjinal Teknik İkame Oranı (MRTS)', '34:23', 34.38, 63) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'İkame Esnekliği', '09:02', 9.03, 64) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Üretim Fonksiyonları 1', '27:25', 27.42, 65) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Üretim Fonksiyonları 2', '34:35', 34.58, 66) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Eşmaliyet Kısıtı', '38:07', 38.12, 67) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Üretici Dengesi 1', '38:01', 38.02, 68) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Üretici Dengesi 2', '24:59', 24.98, 69) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Üretici Dengesi 3', '30:10', 30.17, 70) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Üretici Dengesi Değişimleri 1', '37:32', 37.53, 71) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Üretici Dengesi Değişimleri 2', '28:21', 28.35, 72) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Kısa Dönem Maliyetleri 1', '36:17', 36.28, 73) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Kısa Dönem Maliyetleri 2', '32:43', 32.72, 74) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Kısa Dönem Maliyetleri 3', '37:32', 37.53, 75) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Kısa Dönem Maliyetleri 4', '27:28', 27.47, 76) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Kısa Dönem Maliyetleri: Soru Çözümü', '30:02', 30.03, 77) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Uzun Dönem Maliyetleri 1', '41:19', 41.32, 78) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Uzun Dönem Maliyetleri 2', '28:48', 28.8, 79) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Maliyetler: Özet', '28:08', 28.13, 80) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Piyasa Türlerine Giriş', '24:37', 24.62, 81) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Tam Rekabet: Firma Analizi', '32:28', 32.47, 82) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Tam Rekabet: Firma Karları', '37:05', 37.08, 83) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Kısa Dönem Denge Analizi 1', '39:09', 39.15, 84) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Kısa Dönem Denge Analizi 2', '35:30', 35.5, 85) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Üretim Yapma Koşulu', '30:57', 30.95, 86) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Kısa Dönem Arz Eğrisi', '33:09', 33.15, 87) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Kısa Dönem Üretici Rantı', '14:07', 14.12, 88) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Vergi Müdahalesi', '19:21', 19.35, 89) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Uzun Dönem Dengesi', '29:22', 29.37, 90) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Uzun Dönem Endüstriler', '24:17', 24.28, 91) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Monopol (Tekel) Piyasası', '42:29', 42.48, 92) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Monopolcü Firma Analizi 1', '28:55', 28.92, 93) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Monopolcü Firma Analizi 2', '32:32', 32.53, 94) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Monopolün Yol Açtığı Refah Kaybı', '40:35', 40.58, 95) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Tekelci Güç Analizi 1', '22:58', 22.97, 96) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Tekelci Güç Analizi 2', '38:16', 38.27, 97) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Tekelci Firma: Soru Çözümü', '14:37', 14.62, 98) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Tekelci Rekabet Piyasası', '40:44', 40.73, 99) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Oligopol Piyasası 1', '35:04', 35.07, 100) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Oligopol Piyasası 2', '31:38', 31.63, 101) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Oligopol Piyasası 3', '32:05', 32.08, 102) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Oligopol Piyasası 4', '24:37', 24.62, 103) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Faktör Piyasaları 1', '37:11', 37.18, 104) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Faktör Piyasaları 2', '40:16', 40.27, 105) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Faktör Piyasaları 3', '35:17', 35.28, 106) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Faktör Piyasaları 4', '20:11', 20.18, 107) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Faktör Piyasaları 5', '30:35', 30.58, 108) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Genel Denge Analizi 1', '34:17', 34.28, 109) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Genel Denge Analizi 2', '36:01', 36.02, 110) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (mikro_course_id, 'Mikro İktisat Final Soru Çözümü', '13:27', 13.45, 111) RETURNING id INTO v_id;

    -- 2. Insert Muhasebe videos
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Ders Tanıtımı', '10:54', 10.9, 1) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-24 12:14:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Muhasebenin İşlevleri ve Giriş', '15:37', 15.62, 2) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-24 12:14:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Mali Tablolar ve Temel Eşitlik', '22:20', 22.33, 3) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-24 12:14:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Bilanço Hazırlama Uygulaması', '18:45', 18.75, 4) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-24 12:14:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Gelir ve Nakit Akım Tabloları', '15:15', 15.25, 5) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-24 12:14:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Hesap Kavramı ve İşleyiş Kuralları', '21:06', 21.1, 6) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-24 12:14:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Temel Aktif Hesaplar', '15:59', 15.98, 7) RETURNING id INTO v_id;
    INSERT INTO public.video_progress (user_id, video_id, completed, completed_at) VALUES (user_id_val, v_id, true, '2026-01-24 12:14:00+00'::timestamptz);
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Temel Pasif Hesaplar', '08:51', 8.85, 8) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Gelir Tablosu Hesapları', '14:05', 14.08, 9) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Çift Taraflı Kayıt Tekniği', '22:37', 22.62, 10) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Muhasebe Belgeleri', '24:52', 24.87, 11) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Kayıt Süreci ve Ticari Mal Satışı', '34:40', 34.67, 12) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Muhasebe Süreci ve Açılış Kaydı', '20:10', 20.17, 13) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Hesapların Kapatılması', '36:30', 36.5, 14) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Muhasebe Süreci: Genel Uygulama', '18:25', 18.42, 15) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Muhasebenin Temel Kavramları', '18:44', 18.73, 16) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Genel Muhasebe İlkeleri 1', '15:02', 15.03, 17) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Genel Muhasebe İlkeleri 2', '11:54', 11.9, 18) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Genel Muhasebe İlkeleri 3', '09:50', 9.83, 19) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'KDV Hesapları: Temel Kurallar', '20:48', 20.8, 20) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'KDV Kayıt Örnekleri', '19:25', 19.42, 21) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Ay Sonu KDV İşlemleri', '12:45', 12.75, 22) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'KDV Mahsup İşlemleri', '14:55', 14.92, 23) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Üç Hesaplı KDV Uygulaması', '25:11', 25.18, 24) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Hazır Değerlere Giriş', '21:30', 21.5, 25) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Kasa Hesabı: Yabancı Para İşlemleri', '26:23', 26.38, 26) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Alınan Çekler ve Uygulamalar', '17:21', 17.35, 27) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Bankalar Hesabı ve Uygulamalar', '16:14', 16.23, 28) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Verilen Çekler, Hatır ve Vadeli Çekler', '26:51', 26.85, 29) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Diğer Hazır Değerler', '34:33', 34.55, 30) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Menkul Kıymetler: Temel Kavramlar', '17:40', 17.67, 31) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Hisse Senedi İşlemleri: Geçici Yatırım', '24:26', 24.43, 32) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Hisse Senedi İşlemleri: Yatırım Amaçlı', '31:21', 31.35, 33) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Hisse Senedi Getiri Kayıtları', '21:45', 21.75, 34) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Tahvil, Bono ve Senet Alışı', '28:10', 28.17, 35) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Hazine Bonusu ve Tahvil Getirileri', '26:49', 26.82, 36) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Tahvil, Bono ve Senet Satışı', '16:26', 16.43, 37) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Ticari Alacaklar ve Alıcılar Hesabı', '21:44', 21.73, 38) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Alıcılar Hesabı Örnekleri', '33:17', 33.28, 39) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Alacak Senetleri ve Yardımcı Hesaplar', '36:35', 36.58, 40) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Senet İskontosu ve Peşin Değer Hesabı', '23:30', 23.5, 41) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Senet Yenileme ve Ciro İşlemleri', '17:17', 17.28, 42) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Poliçe ve Hatır Senedi Uygulama', '25:13', 25.22, 43) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Stok Değerleme Yöntemleri', '16:42', 16.7, 44) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'FIFO (İlk Giren İlk Çıkar)', '16:25', 16.42, 45) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'LIFO (Son Giren İlk Çıkar)', '16:12', 16.2, 46) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Stok Yöntemi Seçim Kriterleri', '20:58', 20.97, 47) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Aralıklı Envanter: Giriş', '11:23', 11.38, 48) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Aralıklı Envanter: Temel Kurallar', '10:17', 10.28, 49) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Aralıklı Envanter: Alış/Satış Giderleri', '10:41', 10.68, 50) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Aralıklı Envanter: İade İşlemleri', '10:06', 10.1, 51) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Aralıklı Envanter: İskontolar', '18:05', 18.08, 52) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Aralıklı Envanter: Temel Kayıtlar', '32:45', 32.75, 53) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Aralıklı Envanter: STMM ve Brüt Kar/Zarar', '38:52', 38.87, 54) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Sürekli Envanter: Temel Kurallar', '23:14', 23.23, 55) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Sürekli Envanter: Mal Alışı ve Giderler', '12:48', 12.8, 56) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Sürekli Envanter: İade ve İskontolar', '08:31', 8.52, 57) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Sürekli Envanter: Temel Soru Türleri', '26:26', 26.43, 58) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Sürekli Envanter: Büyük Defter Kayıtları', '16:48', 16.8, 59) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Avans Hesapları 1', '26:32', 26.53, 60) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Avans Hesapları 2', '18:27', 18.45, 61) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Avans Hesapları Uygulamaları', '26:35', 26.58, 62) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Dönem Sonu Envanter ve Değerleme', '24:32', 24.53, 63) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'TTK''ya Göre Değerleme Standartları', '13:41', 13.68, 64) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'TMS Değerleme Ölçüleri', '10:02', 10.03, 65) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Kasa Eksik ve Fazlası: Kurallar', '19:27', 19.45, 66) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Kasa Eksik ve Fazlası: Örnekler', '20:33', 20.55, 67) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Yabancı Para Dönem Sonu İşlemleri', '20:02', 20.03, 68) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Kasa Farkı İçin Karşılık Ayrılması', '08:56', 8.93, 69) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Bankalar Hesabı: Envanter and Düzeltme', '26:03', 26.05, 70) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Banka Faiz Kayıtları', '31:39', 31.65, 71) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Yabancı Para Faiz Kayıtları', '24:14', 24.23, 72) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Menkul Kıymetler: Envanter İşlemleri', '12:10', 12.17, 73) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Menkul Kıymetler: Uygulamalar', '23:06', 23.1, 74) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Ticari Alacaklar''da Reeskont', '19:13', 19.22, 75) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Şüpheli Ticari Alacaklar', '16:04', 16.07, 76) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Şüpheli Alacaklar Uygulaması', '18:06', 18.1, 77) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Değersiz Alacak Kayıtları', '09:42', 9.7, 78) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Değeri Düşen Ticari Mallar', '24:34', 24.57, 79) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'MDV: Maliyet Bedeli Esasları', '34:58', 34.97, 80) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'MDV Maliyet Bedeli Örnekleri', '22:18', 22.3, 81) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Amortisman Yöntemleri 1', '17:27', 17.45, 82) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Amortisman Yöntemleri 2', '19:54', 19.9, 83) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Amortisman Yöntemleri 3', '17:15', 17.25, 84) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Kıst Amortisman ve Yöntem Değişimi', '19:10', 19.17, 85) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Endirekt Amortisman Kayıtları', '17:32', 17.53, 86) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Direkt Amortisman Kayıtları', '07:36', 7.6, 87) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Maddi Duran Varlık (MDV) Satışı', '10:11', 10.18, 88) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'MDV Satışı Uygulama Örnekleri', '19:38', 19.63, 89) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'MDV Özel Fon Uygulaması', '16:05', 16.08, 90) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'MODV: Temel Kavramlar', '20:02', 20.03, 91) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'MODV: Uygulama Örnekleri', '26:58', 26.97, 92) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Banka Kredileri (KVYK - UVYK)', '22:06', 22.1, 93) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Maddi Teminatlı Krediler', '17:23', 17.38, 94) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Uzun Vadeli Banka Kredileri', '20:49', 20.82, 95) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Bono ve Senet İhracı 1', '14:59', 14.98, 96) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Bono ve Senet İhracı 2', '21:48', 21.8, 97) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Tahvil İhracı İşlemleri', '23:20', 23.33, 98) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Ticari Borçlar Kayıtları', '19:56', 19.93, 99) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Borç ve Gider Karşılıkları', '31:49', 31.82, 100) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Özkaynaklar ve Şirket Kuruluşu', '22:54', 22.9, 101) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Sermaye Artırımı ve Azaltımı', '09:41', 9.68, 102) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Özkaynaklar: Yedekler', '25:29', 25.48, 103) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Özkaynaklar: Kar Dağıtımı', '32:13', 32.22, 104) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Dönem Ayarlayıcı Kayıtlar 1', '27:57', 27.95, 105) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Dönem Ayarlayıcı Kayıtlar 2', '16:07', 16.12, 106) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Ücret Tahakkuk Kaydı (Personel)', '21:50', 21.83, 107) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Gelir Tablosu Hesapları 1', '14:22', 14.37, 108) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Gelir Tablosu Hesapları 2', '10:53', 10.88, 109) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Finansman Giderleri Grubu', '12:49', 12.82, 110) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Maliyet Hesapları: 7A Uygulaması', '16:11', 16.18, 111) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, '7A Grubu: 710 Hesap', '19:06', 19.1, 112) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, '7A Grubu: 720, 730, 740 Hesaplar', '26:33', 26.55, 113) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, '7A Grubu: 750, 760, 770 Hesaplar', '19:50', 19.83, 114) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Maliyet Hesapları: 7B Uygulaması', '35:23', 35.38, 115) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Mali Analiz: Bilanço Yorumlama', '28:05', 28.08, 116) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Oran Analizi: Likidite Oranları', '26:26', 26.43, 117) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Likidite Oranları: Soru Çözümü', '20:20', 20.33, 118) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Finansal Oranlar: Soru Çözümü', '24:49', 24.82, 119) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Faaliyet ve Karlılık Oranları', '29:52', 29.87, 120) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Dikey, Yatay ve Trend Analizi', '33:12', 33.2, 121) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Başabaş Analizi', '17:46', 17.77, 122) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Maliyet Muhasebesi: Temel Kayıtlar', '20:03', 20.05, 123) RETURNING id INTO v_id;
    INSERT INTO public.videos (course_id, title, duration, duration_minutes, video_number) 
    VALUES (muhasebe_course_id, 'Satılan Mamullerin Maliyeti Tablosu', '23:58', 23.97, 124) RETURNING id INTO v_id;

    -- 3. Link Pomodoro Sessions
    UPDATE public.pomodoro_sessions 
    SET course_id = mikro_course_id
    WHERE user_id = user_id_val AND course_name = 'Mikro İktisat' AND course_id IS NULL;
    
    UPDATE public.pomodoro_sessions 
    SET course_id = muhasebe_course_id
    WHERE user_id = user_id_val AND course_name = 'Genel Muhasebe' AND course_id IS NULL;

END $$;
